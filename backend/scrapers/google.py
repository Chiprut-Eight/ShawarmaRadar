from .base import PoliteScraper
import re
import urllib.parse
from bs4 import BeautifulSoup
import httpx

class GoogleBusinessScraper(PoliteScraper):
    def __init__(self):
        super().__init__(base_url="https://html.duckduckgo.com", delay_seconds=0.8)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }

    def fetch_place_data(self, query: str):
        """
        Free Web & Google/Local Knowledge Scraper.
        Searches web review snippets, Easy, and Rest for rating, address, and live review snippets.
        """
        encoded_query = urllib.parse.quote(f"{query} ביקורות דירוג")
        url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
        
        result = {
            "name": query,
            "rating": None,
            "user_ratings_total": 0,
            "address": None,
            "reviews": []
        }

        try:
            res = httpx.get(url, headers=self.headers, timeout=8.0)
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                snippets = [a.get_text(strip=True) for a in soup.find_all('a', class_='result__snippet')]
                
                # Parse snippets for rating and reviews
                for snippet in snippets:
                    if len(snippet) > 20:
                        result["reviews"].append({"text": snippet, "source": "web"})

                    # Look for rating pattern (e.g. 4.5/5 or ציון 8.8 or 4.6 כוכבים)
                    if not result["rating"]:
                        rating_match = re.search(r'([1-5][\.,]\d)\s*(?:stars|כוכבים|★|\/5|\/10)', snippet)
                        if rating_match:
                            result["rating"] = float(rating_match.group(1).replace(',', '.'))
                            
                    # Look for address pattern (e.g. ברחוב X / ב-X 12, תל אביב)
                    if not result["address"]:
                        addr_match = re.search(r'(?:ב|רחוב|רח\')\s*([א-ת\s]+\d+,\s*[א-ת\s]+)', snippet)
                        if addr_match:
                            result["address"] = addr_match.group(1).strip()

        except Exception as e:
            print(f"Web/Google search error for {query}: {e}")

        return result
