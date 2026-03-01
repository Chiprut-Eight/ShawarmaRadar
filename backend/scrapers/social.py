import urllib.parse
from scrapers.base import PoliteScraper
from bs4 import BeautifulSoup

class SocialMediaScanner(PoliteScraper):
    def __init__(self):
        # We use DuckDuckGo HTML version for free, anonymous web scraping
        super().__init__(base_url="https://html.duckduckgo.com", delay_seconds=2.0)
        # Adding a browser-like user agent is critical
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7"
        }

    def _scrape_ddg(self, query: str):
        """Helper to scrape DuckDuckGo for text snippets related to a query"""
        encoded_query = urllib.parse.quote(query)
        # We don't use self.get directly because we want to pass headers
        import time
        import httpx
        
        # Polite wait
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay_seconds:
            time.sleep(self.delay_seconds - elapsed)
            
        url = f"{self.base_url}/html/?q={encoded_query}"
        results = []
        try:
            res = httpx.get(url, headers=self.headers, timeout=10.0)
            self.last_request_time = time.time()
            if res.status_code == 200:
                soup = BeautifulSoup(res.text, "html.parser")
                for a in soup.find_all('a', class_='result__snippet'):
                    text = a.get_text(strip=True)
                    if text:
                        results.append({"text": text, "url": ""})
        except Exception as e:
            print(f"Web Scrape Error for {query}: {e}")
        return results

    def scan_tiktok_hashtags(self, hashtags: list):
        # We search the web for the hashtag
        if not hashtags: return []
        tag = hashtags[0]
        print(f"Scanning web snippets for TikTok: {tag}")
        return self._scrape_ddg(f"site:tiktok.com {tag}")

    def scan_instagram_tags(self, tags: list):
        if not tags: return []
        tag = tags[0]
        print(f"Scanning web snippets for Instagram: {tag}")
        return self._scrape_ddg(f"site:instagram.com {tag}")

    def scan_facebook_posts(self, query: str):
        print(f"Scanning web snippets for Facebook: {query}")
        # Focus on the famous group or facebook in general
        return self._scrape_ddg(f"site:facebook.com \"{query}\"")

