import time
import httpx
from typing import Optional, Dict

class PoliteScraper:
    def __init__(self, base_url: str, delay_seconds: float = 2.0):
        self.base_url = base_url
        self.delay_seconds = delay_seconds
        self.last_request_time = 0.0
        
        # Setup headers to look like a normal user agent
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        
    def _wait_for_rate_limit(self):
        """Ensures that we wait at least self.delay_seconds between requests"""
        elapsed = time.time() - self.last_request_time
        if elapsed < self.delay_seconds:
            time.sleep(self.delay_seconds - elapsed)
            
    def get(self, endpoint: str, params: Optional[Dict] = None):
        self._wait_for_rate_limit()
        
        url = f"{self.base_url}{endpoint}"
        
        # In the future: Add proxy rotation logic here (e.g. Apify or proxy pools) #
        
        try:
            response = httpx.get(url, headers=self.headers, params=params, timeout=10.0)
            self.last_request_time = time.time()
            return response
        except httpx.RequestError as exc:
            print(f"An error occurred while requesting {exc.request.url!r}.")
            return None
