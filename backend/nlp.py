from datetime import datetime, timezone
import math
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class RankingEngine:
    def __init__(self):
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    def analyze_sentiment(self, text: str) -> float:
        """
        Uses OpenAI GPT-4o-mini to analyze Hebrew text and return
        a sentiment score between -1.0 (very negative) and 1.0 (very positive).
        """
        if not text or not self.openai_client.api_key:
            return 0.0
            
        system_prompt = '''
        You are a sentiment analysis engine for Hebrew restaurant reviews (specifically Shawarma).
        Analyze the following review and return ONLY a float number between -1.0 and 1.0.
        -1.0 = Extremely negative, terrible experience, food poisoning, etc.
        0.0 = Neutral, okay, average.
        1.0 = Extremely positive, mind-blowing, best ever.
        Take Israeli slang ("אש", "פצצה", "על הפנים", "פח", "נדיר") into heavy consideration.
        Calculate the sentiment carefully. Respond ONLY with the number, no text, no explanation.
        '''
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": text}
                ],
                temperature=0.0,
                max_tokens=10
            )
            score_str = response.choices[0].message.content.strip()
            return float(score_str)
        except Exception as e:
            print(f"Error analyzing sentiment with OpenAI: {e}")
            return 0.0

    def calculate_recency_weight(self, published_at: datetime) -> float:
        """
        Calculates a weight multiplier based on how recent the review is.
        Reviews from the last 24 hours get up to 3x weight multiplier.
        """
        if not published_at:
            return 1.0
            
        now = datetime.now(timezone.utc)
        age_hours = (now - published_at).total_seconds() / 3600
        
        if age_hours <= 24:
            # Linear decay from 3.0 at exactly now, down to 1.0 at 24 hours
            weight = 3.0 - (2.0 * (age_hours / 24.0))
            return max(1.0, weight)
        
        # Older than 24h, weight gradually decays to 0.1 over 6 months
        # 180 days = 4320 hours
        decay_factor = math.exp(-(age_hours - 24) / 4320)
        return max(0.1, decay_factor)

    def calculate_final_radar_score(self, google_rating: float, google_ratings_total: int, recent_reviews: list, wolt_rating: float = 0.0, social_volume: int = 0) -> float:
        """
        Calculates the final Radar score (0-100) using 40/30/15/15 architecture.
        40% = Google Places rating (Bayesian anchored)
        30% = Social Volume (amount of recent chatter)
        15% = NLP Sentiment (positive/negative analysis of recent chatter)
        15% = Wolt operational rating
        """
        # 1. Google Basis (40 Points Maximum)
        if not google_rating: google_rating = 0.0
        if not google_ratings_total: google_ratings_total = 0
            
        confidence_threshold = 50
        global_avg_rating = 3.5 
        
        bayesian_rating = ( (google_ratings_total / (google_ratings_total + confidence_threshold)) * google_rating ) + \
                          ( (confidence_threshold / (google_ratings_total + confidence_threshold)) * global_avg_rating )
                          
        google_score = (bayesian_rating / 5.0) * 40.0
        
        # 2. Social Media Volume (Buzz) (30 Points Maximum)
        # Cap at 20 recent social signals to achieve full 30 points of buzz.
        volume_points = min(30.0, (social_volume / 20.0) * 30.0)
        
        # 3. NLP Sentiment Score (15 Points Maximum)
        nlp_points = 7.5 # Default neutral (half of 15) if no reviews
        if recent_reviews:
            total_weight = 0.0
            weighted_sentiment = 0.0
            for r in recent_reviews:
                w = getattr(r, 'weight', 1.0)
                total_weight += w
                weighted_sentiment += getattr(r, 'sentiment_score', 0.0) * w
                
            if total_weight > 0:
                avg_sentiment = weighted_sentiment / total_weight # Ranges -1 to 1
                # Convert -1 to 1 into 0 to 15 points
                nlp_points = ((avg_sentiment + 1.0) / 2.0) * 15.0
                
        # 4. Wolt Delivery Rating (15 Points Maximum)
        # Wolt Ratings are out of 10.0
        if wolt_rating > 0:
            wolt_points = (wolt_rating / 10.0) * 15.0
        else:
            # If venue is not on Wolt, we award a baseline 10 points so they aren't fully crippled against Wolt places.
            wolt_points = 10.0
            
        final_score = google_score + volume_points + nlp_points + wolt_points
        return min(100.0, max(0.0, final_score))
        
    def calculate_net_sentiment_score(self, reviews: list) -> float:
        """
        Net Sentiment Score = ((Positive - Negative) / Total) * 100
        Factors in the recency weight for each review.
        """
        if not reviews:
            return 0.0
            
        total_weight = 0.0
        weighted_score = 0.0
        
        for review in reviews:
            weight = review.weight
            total_weight += weight
            weighted_score += review.sentiment_score * weight
            
        if total_weight == 0:
            return 0.0
            
        # Convert -1.0 to 1.0 range into a 0 to 100 percentage
        normalized_average = (weighted_score / total_weight)
        percentage = ((normalized_average + 1) / 2) * 100
        
        return percentage
