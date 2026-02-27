import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import TensionMeter from '../components/TensionMeter';
import { Target, Crown, Info, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Restaurant {
  id: number;
  name: string;
  city: string;
  region: string;
  bayesian_average: number;
  last_score: number;
  total_reviews: number;
}

interface Review {
  id: number;
  restaurant_name: string;
  city: string;
  content: string;
  sentiment: number;
  published_at: string;
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [nationalKing, setNationalKing] = useState<Restaurant | null>(null);
  const [runnersUp, setRunnersUp] = useState<Restaurant[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch rankings
      const rankRes = await fetch(`${API_URL}/api/rankings/national`);
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setNationalKing(rankData.king);
        setRunnersUp(rankData.runnersUp || []);
      }
      
      // Fetch live feed
      const feedRes = await fetch(`${API_URL}/api/reviews/recent`);
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        setRecentReviews(feedData || []);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 minute refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="home-container">
      <h2 className="page-title">
        <Target className="title-icon" />
        {t('national_king')}
      </h2>

      {/* Left Panel: Info / Legend */}
      <div className="info-panel">
        <div className="info-card card">
          <h3><Info size={20} /> אגדת נתונים</h3>
          <p>
            <strong>ציון המכ"ם (0-100):</strong><br/>
            ציון משוקלל המבוסס על "ממוצע בייסיאני". הציון מחבר בין הסנטימנט הכללי של הביקורות לבין כמות הביקורות, מה שאומר שמקומות עם מעט מדי מידע לא יוכלו להטות את המערכת.
          </p>
          <p>
            <strong>עיבוד שפה נטבעית (AI):</strong><br/>
            כל ביקורת מנותחת ע"י מודל שפה של OpenAI המכיר את הסלנג הישראלי (כגון "פצצה" או "על הפנים") כדי להחליט על חיוביות הטקסט.
          </p>
        </div>
        <div className="info-card card">
          <h3><Activity size={20} /> מדד המתח</h3>
          <p>
             מד המתח מעניק משקל יתר לפעילות מה-24 שעות האחרונות (Recency Decay factor). ככל שהרשת סוערת יותר סביב המיקום כרגע - המדד יעלה לכיוון האזור האדום. מטרתנו לזהות שינויים פתאומיים באיכות המקום.
          </p>
        </div>
      </div>

      {/* Center Panel: Radar */}
      <div className="center-panel">
        <div className="radar-display">
          {loading ? (
            <div className="empty-state pulse-effect">
              <div className="radar-sweep"></div>
              <p className="scan-text">Scanning for the National King...</p>
            </div>
          ) : nationalKing ? (
            <div className="king-card card pulse-effect">
              <Crown className="crown-icon" size={48} />
              <div className="king-info">
                <h3>{nationalKing.name} - {nationalKing.city}</h3>
                <p>Score: {nationalKing.bayesian_average.toFixed(1)} / 100</p>
                <p>Based on {nationalKing.total_reviews} Intel Reports</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="scan-text">No data found.</p>
            </div>
          )}
        </div>

        <div className="runners-up-section">
          {runnersUp.map((place, idx) => (
            <div key={place.id} className="runner-up-card card">
               <h4>#{idx + 2} {place.name}</h4>
               <p>{place.city} - Score: {place.bayesian_average.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Live Feed */}
      <div className="feed-panel card">
        <h3>Live Intel Feed</h3>
        <div className="scrolling-feed">
          {recentReviews.length === 0 && <p className="sys-message" style={{color: 'var(--color-primary-green)'}}>[SYSTEM] Awaiting transmissions...</p>}
          {recentReviews.map(review => {
            // Negative sentiment threshold
            const isNegative = review.sentiment <= 0;
            return (
              <div key={review.id} className={`feed-item ${isNegative ? 'negative' : ''}`}>
                <div className="feed-meta">
                   <span className="feed-target">{review.restaurant_name} ({review.city})</span>
                   <span>{(review.sentiment * 10).toFixed(1)}/10</span>
                </div>
                <div className="feed-content">
                  "{review.content.substring(0, 100)}{review.content.length > 100 ? '...' : ''}"
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Panel: Tension Meter */}
      <div className="tension-section card">
        <h3>{t('tension_meter')} (National Level)</h3>
        <TensionMeter value={nationalKing ? nationalKing.bayesian_average : 0} />
      </div>
    </div>
  );
};

export default Home;
