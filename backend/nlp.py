from datetime import datetime, timezone
import math
import re

# Comprehensive Israeli Shawarma Slang & Food Review Lexicon
POSITIVE_KEYWORDS = {
    "אש": 1.0, "פצצה": 1.0, "נדיר": 1.0, "נדירה": 1.0, "עסיסי": 0.9, "עסיסית": 0.9,
    "מושלם": 0.9, "מושלמת": 0.9, "טעים": 0.8, "טעימה": 0.8, "טעים רצח": 1.0,
    "בשר איכותי": 0.9, "לאפה חמה": 0.8, "לאפות טריות": 0.8, "טרי": 0.8, "טריה": 0.8,
    "מפנק": 0.9, "מפנקת": 0.9, "מפנקים": 0.9, "שירות מעולה": 0.9, "שירות עשר": 1.0,
    "הכי טוב": 1.0, "הכי טעים": 1.0, "מעולה": 0.8, "מדהים": 0.9, "אלוף": 0.9,
    "שווה": 0.7, "ממליץ בחום": 0.9, "תענוג": 0.8, "רמה גבוהה": 0.9, "ליגה": 0.9,
    "הצגה": 0.9, "טופ": 0.9, "שפע": 0.8, "חם וטרי": 0.9, "מומלץ": 0.8,
    "נקי": 0.7, "מסודר": 0.6, "חוויה": 0.7, "עמבה": 0.5, "בשפע": 0.8
}

NEGATIVE_KEYWORDS = {
    "יבש": -0.8, "יבשה": -0.8, "קר": -0.7, "קרה": -0.7, "קמצנים": -0.9, "קמצן": -0.9,
    "קלקול קיבה": -1.0, "על הפנים": -1.0, "יקר": -0.6, "יקר מדי": -0.8,
    "מגעיל": -1.0, "מגעילה": -1.0, "אכזבה": -0.8, "מאכזב": -0.8, "מאכזבת": -0.8,
    "בשר לא עשוי": -0.9, "בשר לא מבושל": -0.9, "בשר קשה": -0.8, "גומי": -0.8,
    "מלוכלך": -0.9, "מזעזע": -1.0, "גרוע": -0.9, "גרועה": -0.9, "נורא": -1.0,
    "לא להתקרב": -1.0, "לא ממליץ": -0.9, "סירחון": -1.0, "חמוץ": -0.8, "שרוף": -0.8,
    "שמן מדי": -0.7, "איטי": -0.6, "שירות גרוע": -0.9, "לא שווה": -0.8, "חלש": -0.7,
    "עלוב": -0.9, "פח": -1.0, "בזיון": -1.0, "גועל נפש": -1.0, "מתחת לכל ביקורת": -1.0
}

NEGATION_PREFIXES = ["לא", "בכלל לא", "ממש לא", "אין", "בלי", "אף פעם לא"]

class RankingEngine:
    def __init__(self):
        pass
        
    def analyze_sentiment(self, text: str) -> float:
        """
        Fast, 100% Free Local Hebrew Sentiment Engine.
        Analyzes review text with Israeli shawarma lexicon and negation handling.
        Returns a score between -1.0 (very negative) and 1.0 (very positive).
        """
        if not text:
            return 0.0
            
        normalized = text.lower()
        score = 0.0
        matches = 0
        
        words = re.findall(r'[\w\'-]+', normalized)
        
        for i, word in enumerate(words):
            # Check 2-word phrases first
            if i < len(words) - 1:
                bigram = f"{word} {words[i+1]}"
                if bigram in POSITIVE_KEYWORDS:
                    is_negated = i > 0 and words[i-1] in NEGATION_PREFIXES
                    val = -POSITIVE_KEYWORDS[bigram] if is_negated else POSITIVE_KEYWORDS[bigram]
                    score += val
                    matches += 1
                    continue
                elif bigram in NEGATIVE_KEYWORDS:
                    is_negated = i > 0 and words[i-1] in NEGATION_PREFIXES
                    val = 0.5 if is_negated else NEGATIVE_KEYWORDS[bigram]
                    score += val
                    matches += 1
                    continue
            
            # Single word checks
            if word in POSITIVE_KEYWORDS:
                is_negated = i > 0 and words[i-1] in NEGATION_PREFIXES
                val = -0.7 if is_negated else POSITIVE_KEYWORDS[word]
                score += val
                matches += 1
            elif word in NEGATIVE_KEYWORDS:
                is_negated = i > 0 and words[i-1] in NEGATION_PREFIXES
                val = 0.5 if is_negated else NEGATIVE_KEYWORDS[word]
                score += val
                matches += 1
                
        if matches == 0:
            return 0.0
            
        final_sentiment = score / matches
        return max(-1.0, min(1.0, final_sentiment))

    def calculate_recency_weight(self, published_at: datetime) -> float:
        """
        Calculates a weight multiplier based on review recency.
        Reviews from the last 24 hours receive up to 3x weight.
        """
        if not published_at:
            return 1.0
            
        now = datetime.now(timezone.utc)
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
            
        age_hours = max(0.0, (now - published_at).total_seconds() / 3600)
        
        if age_hours <= 24:
            # Linear decay from 3.0 down to 1.0 at 24 hours
            weight = 3.0 - (2.0 * (age_hours / 24.0))
            return max(1.0, weight)
        
        # Exponential decay to 0.1 over 180 days (4320 hours)
        decay_factor = math.exp(-(age_hours - 24) / 4320)
        return max(0.1, decay_factor)

    def calculate_final_radar_score(
        self,
        google_rating: float,
        google_ratings_total: int,
        recent_reviews: list,
        wolt_rating: float = 0.0,
        tenbis_rating: float = 0.0,
        social_volume: int = 0
    ) -> float:
        """
        Calculates the Final Radar Score (0-100%):
        - 40% Google rating (Bayesian anchored)
        - 30% Wolt delivery rating & demand
        - 15% 10Bis customer review rating
        - 15% Local Hebrew Sentiment & Buzz
        """
        # 1. Google Basis (40 Points Max)
        if not google_rating:
            google_rating = 3.5
        if not google_ratings_total:
            google_ratings_total = 0
            
        confidence_threshold = 40
        global_avg_rating = 3.5 
        
        bayesian_rating = (
            (google_ratings_total / (google_ratings_total + confidence_threshold)) * google_rating
        ) + (
            (confidence_threshold / (google_ratings_total + confidence_threshold)) * global_avg_rating
        )
        google_score = (bayesian_rating / 5.0) * 40.0
        
        # 2. Wolt Rating (30 Points Max)
        if wolt_rating and wolt_rating > 0:
            wolt_score = (wolt_rating / 10.0) * 30.0
        else:
            # Fair baseline for venues not on Wolt so they aren't completely handicapped
            wolt_score = (bayesian_rating / 5.0) * 24.0
            
        # 3. 10Bis Rating (15 Points Max)
        if tenbis_rating and tenbis_rating > 0:
            tenbis_score = (tenbis_rating / 5.0) * 15.0
        else:
            tenbis_score = (bayesian_rating / 5.0) * 12.0
            
        # 4. Sentiment & Buzz (15 Points Max)
        sentiment_points = 7.5 # Neutral baseline
        if recent_reviews:
            total_weight = 0.0
            weighted_sentiment = 0.0
            for r in recent_reviews:
                published_at = getattr(r, 'published_at', None)
                live_weight = self.calculate_recency_weight(published_at) if published_at else 1.0
                total_weight += live_weight
                sentiment_score = getattr(r, 'sentiment_score', 0.0)
                weighted_sentiment += sentiment_score * live_weight
                
            if total_weight > 0:
                avg_sentiment = weighted_sentiment / total_weight # -1.0 to 1.0
                sentiment_points = ((avg_sentiment + 1.0) / 2.0) * 15.0
                
        final_score = google_score + wolt_score + tenbis_score + sentiment_points
        return round(min(100.0, max(0.0, final_score)), 1)

    def calculate_net_sentiment_score(self, reviews: list) -> float:
        """
        Net Sentiment Score percentage (0-100%).
        """
        if not reviews:
            return 50.0
            
        total_weight = 0.0
        weighted_score = 0.0
        
        for review in reviews:
            weight = getattr(review, 'weight', 1.0)
            sentiment = getattr(review, 'sentiment_score', 0.0)
            total_weight += weight
            weighted_score += sentiment * weight
            
        if total_weight == 0:
            return 50.0
            
        normalized_average = weighted_score / total_weight
        return round(((normalized_average + 1) / 2) * 100, 1)
