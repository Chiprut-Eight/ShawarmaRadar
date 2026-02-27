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
        
        # Older than 24h, weight gradually decays to 0.1
        # Example exponential decay
        decay_factor = math.exp(-(age_hours - 24) / 168) # 168 hours = 1 week
        return max(0.1, decay_factor)

    def calculate_bayesian_average(self, total_reviews: int, average_score: float, 
                                 confidence_threshold: int = 50, global_average: float = 0.0) -> float:
        """
        Calculates the Bayesian Average to prevent places with very few reviews 
        from scoring unnaturally high.
        
        C = confidence_threshold (number of reviews required for statistical significance)
        m = global_average (average score across all restaurants)
        v = total_reviews (number of reviews for this restaurant)
        R = average_score (average score for this restaurant)
        
        Formula: (v / (v + C)) * R + (C / (v + C)) * m
        """
        if total_reviews == 0:
            return 0.0
            
        weight_restaurant = total_reviews / (total_reviews + confidence_threshold)
        weight_global = confidence_threshold / (total_reviews + confidence_threshold)
        
        return (weight_restaurant * average_score) + (weight_global * global_average)
        
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
