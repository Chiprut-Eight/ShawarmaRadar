from .base import PoliteScraper
import re
import urllib.parse
from bs4 import BeautifulSoup
import httpx
import time

class GoogleBusinessScraper(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://html.duckduckgo.com", delay_seconds=1.5)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
        self.nominatim_headers = {
            "User-Agent": "ShawarmaRadar/1.0",
            "Accept-Language": "he"
        }

    def _extract_address_from_snippet(self, snippet: str) -> str:
        """
        Extract a clean street address from a DuckDuckGo snippet.
        Returns just 'street name + number' (no city, no country).
        """
        patterns = [
            # "רחוב הרצל 42" or "רח' הרצל 42"
            r'(?:רחוב|רח[\'׳])\s+([א-ת][א-ת\s\-\'׳]{1,25}?\s+\d{1,4})',
            # "בהמלאכה 19" / "ב-המלאכה 19" - ב prefix before street
            r'(?:^|\s)ב-?([א-ת][א-ת\-\'׳]{1,15}\s+\d{1,4})',
            # "Street Number, City" - e.g. "רוטשילד 58, ראשון לציון"
            r'([א-ת][א-ת\s\-\'׳]{1,25}?\s+\d{1,4})\s*[,،]',
            # "Street Number" at end of snippet
            r'([א-ת][א-ת\s\-\'׳]{1,25}?\s+\d{1,4})\s*$',
        ]
        for pattern in patterns:
            match = re.search(pattern, snippet)
            if match:
                addr = match.group(1).strip()
                # Sanity check: should have at least 2 Hebrew chars and a number
                if re.search(r'[א-ת]{2}', addr) and re.search(r'\d', addr):
                    return addr
        return ""

    def _parse_nominatim_address(self, nom_result: dict, business_name: str = "", city: str = "") -> str:
        """
        Parse a Nominatim result with addressdetails into a clean 'street number' format.
        Returns only the street-level address (no city, no business name, no country).
        """
        addr = nom_result.get("address", {})
        
        road = addr.get("road", "")
        house_number = addr.get("house_number", "")
        
        if road and house_number:
            return f"{road} {house_number}"
        elif road:
            return road
        
        # Fallback: parse display_name manually
        display = nom_result.get("display_name", "")
        if not display:
            return ""
            
        parts = [p.strip() for p in display.split(",")]
        clean_parts = []
        
        # Normalize business name for comparison (remove diacritics, lowercase)
        bname_words = set(business_name.split()) if business_name else set()
        
        for part in parts:
            stripped = part.strip()
            # Skip empty
            if not stripped:
                continue
            # Skip if it's the business name
            if business_name and (stripped == business_name or stripped in business_name or business_name in stripped):
                continue
            # Skip if all words overlap with business name
            part_words = set(stripped.split())
            if bname_words and part_words.issubset(bname_words):
                continue
            # Skip city name
            if city and (stripped == city or city in stripped):
                continue
            # Skip district/country/postal
            if any(skip in stripped for skip in ["נפת", "מחוז", "ישראל", "district", "Israel"]):
                continue
            if re.match(r'^\d{5,}$', stripped):
                continue
            # This part looks like a street/address component
            clean_parts.append(stripped)
            # We only want 1-2 components (street + number or neighborhood)
            if len(clean_parts) >= 2:
                break
        
        return ", ".join(clean_parts) if clean_parts else ""

    def fetch_place_data(self, query: str, city: str = "", skip_address_lookup: bool = False):
        """
        Free Web & Google/Local Knowledge Scraper.
        Uses DuckDuckGo for reviews/ratings and Nominatim for addresses (when needed).
        """
        self._wait_for_rate_limit()
        encoded_query = urllib.parse.quote(f"{query} ביקורות דירוג")
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        
        result = {
            "name": query,
            "rating": None,
            "user_ratings_total": 0,
            "address": None,
            "reviews": []
        }

        # --- DuckDuckGo (with Bing fallback if DDG returns 202): reviews, rating, and address attempt ---
        try:
            res = httpx.get(url, headers=self.headers, timeout=8.0)
            self.last_request_time = time.time()
            snippets = []
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                snippets = [a.get_text(strip=True) for a in soup.find_all('a', class_='result__snippet')]
            if not snippets:
                bing_q = urllib.parse.quote(f'"{query}" שווארמה ביקורות')
                bing_res = httpx.get(f"https://www.bing.com/search?q={bing_q}", headers=self.headers, timeout=8.0, follow_redirects=True)
                if bing_res.status_code == 200:
                    bsoup = BeautifulSoup(bing_res.text, "html.parser")
                    snippets = [p.get_text(" ", strip=True) for p in bsoup.select("li.b_algo .b_caption p, li.b_algo p") if query.split()[0] in p.get_text()]

            for snippet in snippets:
                if len(snippet) > 20:
                    result["reviews"].append({"text": snippet, "source": "web"})

                # Rating pattern (e.g. 4.5/5, 4.6 כוכבים, דירוג 4.7, or Easy 8.8/10)
                if not result["rating"]:
                    rating_match = re.search(r'([1-4][\.,]\d|5[\.,]0)\s*(?:stars|כוכבים|★|\/5|מתוך\s*5)', snippet)
                    if not rating_match:
                        rating_match = re.search(r'(?:דירוג|ציון)\s*:?\s*([1-4][\.,]\d|5[\.,]0)', snippet)
                    if rating_match:
                        result["rating"] = float(rating_match.group(1).replace(',', '.'))

                # Review count pattern (e.g. 688 ביקורות, 450 חוות דעת, (520))
                if not result["user_ratings_total"]:
                    count_match = re.search(r'(\d[\d,]{1,5})\s*(?:ביקורות|חוות דעת|דירוגים|reviews)', snippet)
                    if count_match:
                        try:
                            result["user_ratings_total"] = int(count_match.group(1).replace(',', ''))
                        except ValueError:
                            pass

                # Address extraction with improved regex
                if not skip_address_lookup and not result["address"]:
                    addr = self._extract_address_from_snippet(snippet)
                    if addr:
                        result["address"] = addr

        except Exception as e:
            print(f"Web/Google search error for {query}: {e}")

        # --- Nominatim: reliable structured address fallback ---
        if not skip_address_lookup and not result["address"]:
            try:
                # Try with city context for better accuracy
                search_term = f"{query}" if city in query else f"{query} {city}"
                nom_query = urllib.parse.quote(search_term)
                nom_url = f"https://nominatim.openstreetmap.org/search?q={nom_query}&format=json&addressdetails=1&limit=1&countrycodes=il"
                nom_res = httpx.get(nom_url, headers=self.nominatim_headers, timeout=8.0)
                if nom_res.status_code == 200:
                    nom_data = nom_res.json()
                    if nom_data and len(nom_data) > 0:
                        display_name = query.replace(f" {city}", "").strip() if city else query
                        clean_addr = self._parse_nominatim_address(nom_data[0], business_name=display_name, city=city)
                        if clean_addr:
                            result["address"] = clean_addr
                time.sleep(1.1)  # Nominatim policy: max 1 request/second
            except Exception as e:
                print(f"Nominatim error for {query}: {e}")

        return result
