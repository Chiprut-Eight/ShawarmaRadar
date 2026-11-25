from datetime import datetime, timezone
from typing import Optional
import math
import re

# Comprehensive Israeli Shawarma Slang & Food Review Lexicon
POSITIVE_KEYWORDS = {
    "אש": 1.0, "פצצה": 1.0, "נדיר": 1.0, "נדירה": 1.0, "נדירים": 1.0,
    "עסיסי": 0.9, "עסיסית": 0.9, "מושלם": 0.9, "מושלמת": 0.9,
    "טעים": 0.8, "טעימה": 0.8, "טעימות": 0.8, "טעימים": 0.8, "טעים רצח": 1.0,
    "בשר איכותי": 0.9, "לאפה חמה": 0.8, "לאפות טריות": 0.8,
    "טרי": 0.8, "טריה": 0.8, "טרייה": 0.8, "טריים": 0.8,
    "מפנק": 0.9, "מפנקת": 0.9, "מפנקים": 0.9, "פינוק": 0.85, "פינקו": 0.9,
    "שירות מעולה": 0.9, "שירות עשר": 1.0, "אדיב": 0.8, "אדיבים": 0.8,
    "הכי טוב": 1.0, "הכי טובה": 1.0, "הכי טעים": 1.0, "הכי טעימה": 1.0,
    "מעולה": 0.85, "מעולים": 0.85, "מצוין": 0.85, "מצויין": 0.85, "מצוינת": 0.85,
    "מדהים": 0.9, "מדהימה": 0.9, "אלוף": 0.9, "אלופים": 0.9,
    "שווה": 0.7, "ממליץ בחום": 0.9, "מומלץ מאוד": 0.9, "מומלץ": 0.8,
    "תענוג": 0.85, "רמה גבוהה": 0.9, "ליגה": 0.9, "הצגה": 0.9, "טופ": 0.9,
    "שפע": 0.8, "בשפע": 0.85, "חם וטרי": 0.9, "אהבתי": 0.8,
    "נקי": 0.75, "נקיה": 0.75, "נקייה": 0.75, "מסודר": 0.65, "חוויה": 0.7
}

NEGATIVE_KEYWORDS = {
    "יבש": -0.8, "יבשה": -0.8, "קר": -0.7, "קרה": -0.7, "קמצנים": -0.9, "קמצן": -0.9,
    "קלקול קיבה": -1.0, "על הפנים": -1.0, "יקר": -0.6, "יקר מדי": -0.8,
    "מגעיל": -1.0, "מגעילה": -1.0, "אכזבה": -0.85, "מאכזב": -0.85, "מאכזבת": -0.85,
    "בשר לא עשוי": -0.9, "בשר לא מבושל": -0.9, "בשר קשה": -0.8, "גומי": -0.8,
    "מלוכלך": -0.9, "מזעזע": -1.0, "מזעזעת": -1.0, "גרוע": -0.9, "גרועה": -0.9, "נורא": -1.0,
    "לא להתקרב": -1.0, "לא ממליץ": -0.9, "לא אהבתי": -0.8, "סירחון": -1.0,
    "חמוץ": -0.8, "מקולקל": -1.0, "חשוד": -0.85, "שרוף": -0.8,
    "שמן מדי": -0.7, "איטי": -0.6, "שירות גרוע": -0.9, "לא שווה": -0.8, "חלש": -0.7,
    "עלוב": -0.9, "פח": -1.0, "בזיון": -1.0, "ביזיון": -1.0, "גועל נפש": -1.0,
    "מתחת לכל ביקורת": -1.0, "לא טרי": -0.9
}

NEGATION_PREFIXES = ["לא", "בכלל לא", "ממש לא", "אין", "בלי", "אף פעם לא"]

class RankingEngine:
    def __init__(self):
        pass

    def analyze_sentiment(self, text: str, star_rating: Optional[float] = None) -> float:
        """
        Analyzes real review text with Israeli shawarma lexicon & negation handling,
        and blends with the reviewer's explicit star rating (1..5) when provided on that review.
        Returns a score between -1.0 (very negative) and 1.0 (very positive).
        """
        text_sentiment: Optional[float] = None
        if text:
            normalized = text.lower()
            score = 0.0
            matches = 0
            words = re.findall(r"[\w'-]+", normalized)

            for i, word in enumerate(words):
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

            if matches > 0:
                text_sentiment = max(-1.0, min(1.0, score / matches))

        star_sentiment: Optional[float] = None
        if star_rating is not None and 1.0 <= float(star_rating) <= 5.0:
            star_sentiment = max(-1.0, min(1.0, (float(star_rating) - 3.0) / 2.0))

        if text_sentiment is not None and star_sentiment is not None:
            return round(0.6 * text_sentiment + 0.4 * star_sentiment, 3)
        if text_sentiment is not None:
            return round(text_sentiment, 3)
        if star_sentiment is not None:
            return round(star_sentiment, 3)
        return 0.0

    def calculate_recency_weight(self, published_at: Optional[datetime]) -> float:
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
            weight = 3.0 - (2.0 * (age_hours / 24.0))
            return max(1.0, weight)

        # Smooth decay down to 0.25 over 365 days (8760 hours) so real Google reviews keep fair weight
        decay_factor = math.exp(-(age_hours - 24) / 8760)
        return max(0.25, decay_factor)

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
        - 40% Official Google rating (Bayesian anchored by total review count)
        - 30% Wolt delivery rating (normalized to Google Bayesian if not on Wolt)
        - 15% 10Bis customer review rating (normalized to Google Bayesian if not on 10Bis)
        - 15% Bayesian-smoothed review sentiment (real Google + 10Bis customer reviews)
        """
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

        if wolt_rating and wolt_rating > 0:
            wolt_score = (wolt_rating / 10.0) * 30.0
        else:
            wolt_score = (bayesian_rating / 5.0) * 30.0

        if tenbis_rating and tenbis_rating > 0:
            tenbis_score = (tenbis_rating / 5.0) * 15.0
        else:
            tenbis_score = (bayesian_rating / 5.0) * 15.0

        sentiment_points = 7.5
        if recent_reviews:
            total_weight = 0.0
            weighted_sentiment = 0.0
            for r in recent_reviews:
                published_at = getattr(r, "published_at", None)
                live_weight = self.calculate_recency_weight(published_at) if published_at else 1.0
                total_weight += live_weight
                sentiment_score = float(getattr(r, "sentiment_score", 0.0) or 0.0)
                weighted_sentiment += sentiment_score * live_weight

            if total_weight > 0:
                prior_weight = 4.0
                smoothed_sentiment = weighted_sentiment / (total_weight + prior_weight)
                sentiment_points = ((smoothed_sentiment + 1.0) / 2.0) * 15.0

        final_score = google_score + wolt_score + tenbis_score + sentiment_points
        return round(min(100.0, max(0.0, final_score)), 1)

    def calculate_net_sentiment_score(self, reviews: list) -> float:
        if not reviews:
            return 50.0

        total_weight = 0.0
        weighted_score = 0.0

        for review in reviews:
            weight = float(getattr(review, "weight", 1.0) or 1.0)
            sentiment = float(getattr(review, "sentiment_score", 0.0) or 0.0)
            total_weight += weight
            weighted_score += sentiment * weight

        if total_weight == 0:
            return 50.0

        normalized_average = weighted_score / total_weight
        return round(((normalized_average + 1) / 2) * 100, 1)
