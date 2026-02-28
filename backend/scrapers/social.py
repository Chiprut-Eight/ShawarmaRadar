import os
from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

class SocialMediaScanner:
    def __init__(self):
        # We use Apify Client instead of our PoliteScraper here
        # since Apify handles proxies and headless browser execution
        token = os.getenv("APIFY_API_TOKEN")
        if token:
            self.client = ApifyClient(token)
        else:
            self.client = None
            print("Warning: APIFY_API_TOKEN not found.")
        
    def scan_tiktok_hashtags(self, hashtags: list):
        """
        Scans TikTok for viral videos containing specific hashtags
        using a popular Apify Actor (e.g., clockwork/tiktok-scraper)
        """
        if not self.client:
            return []
            
        print(f"Starting Apify TikTok scrape for: {hashtags}")
        
        # We start the actor and wait for it to finish.
        # This can be time consuming, so in production this should be a background Celery/RQ job.
        run_input = {
            "hashtags": hashtags,
            "resultsPerPage": 10,
            "shouldDownloadVideos": False
        }
        
        try:
            # Note: The exact actor ID depends on user's Apify setup.
            # Fixed: exact actor ID from user's Apify store screenshot
            run = self.client.actor("clockworks/tiktok-scraper").call(run_input=run_input)
            
            results = []
            for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                results.append({
                    "text": item.get("text"),
                    "views": item.get("playCount"),
                    "url": item.get("webVideoUrl")
                })
            return results
        except Exception as e:
            print(f"Apify TikTok Error: {e}")
            return []

    def scan_instagram_tags(self, tags: list):
        """
        Scans Instagram for tagged posts.
        """
        if not self.client:
            return []
            
        print(f"Starting Apify Instagram scrape for: {tags}")
        
        run_input = {
            "hashtags": tags,
            "resultsLimit": 10
        }
        
        try:
            # Using standard apify/instagram-scraper
            run = self.client.actor("apify/instagram-hashtag-scraper").call(run_input=run_input)
            
            results = []
            for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                results.append({
                    "text": item.get("caption"),
                    "likes": item.get("likesCount"),
                    "url": item.get("url")
                })
            return results
        except Exception as e:
            print(f"Apify Instagram Error: {e}")
            return []

    def scan_facebook_posts(self, query: str):
        """
        Scans Facebook for recent posts mentioning the shawarma place.
        """
        if not self.client:
            return []
            
        print(f"Starting Apify Facebook scrape for: {query}")
        
        run_input = {
            "startUrls": [{"url": f"https://www.facebook.com/search/posts/?q={query}"}],
            "resultsLimit": 5
        }
        
        try:
            run = self.client.actor("apify/facebook-posts-scraper").call(run_input=run_input)
            
            results = []
            for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                results.append({
                    "text": item.get("text", ""),
                    "likes": item.get("likes", 0),
                    "url": item.get("url")
                })
            return results
        except Exception as e:
            print(f"Apify Facebook Error: {e}")
            return []
