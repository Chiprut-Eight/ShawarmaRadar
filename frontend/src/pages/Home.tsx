import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import { Globe, Crown, Info, Share2, Info as InfoIcon, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Restaurant {
  id: number;
  name: string;
  city: string;
  region: string;
  bayesian_average: number;
  last_score: number;
  total_reviews: number;
  address?: string;
}

const Home: React.FC = () => {
  const { t } = useTranslation();
  const [nationalKing, setNationalKing] = useState<Restaurant | null>(null);
  const [runnersUp, setRunnersUp] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time clock for the header
  const [time, setTime] = useState(new Date());
  
  // Modals state
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const rankRes = await fetch(`${API_URL}/api/rankings/national`);
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setNationalKing(rankData.king);
        setRunnersUp(rankData.runnersUp || []);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 60000);
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ShawarmaRadar',
          text: 'בדוק את מפת הדירוג החיה של השווארמיות בישראל!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert('העתק את הקישור ושתף מכל דפדפן!');
    }
  };

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0];
  };

  return (
    <div className="home-container" dir="rtl">
      {/* Header */}
      <div className="radar-header">
        <div className="radar-header-left">
          <span className="lang-badge">HE</span>
          <div className="time-block">
            <span className="time">{formatTime(time)}</span>
            <span className="date">{formatDate(time)}</span>
          </div>
          <div className="live-badge-main">LIVE •</div>
        </div>
        
        <div className="radar-header-right">
          <h1 className="radar-title">
            ShawarmaRadar <Globe className="globe-icon" size={24} />
          </h1>
          <span className="radar-subtitle">ישראל</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-scan">
          [{t('scan_national')}]...
        </div>
      ) : (
        <div className="signals-panel">
          <h2 className="signals-section-title">פעילות רחוב חיה</h2>
          
          {/* King Data Signal */}
          {nationalKing && (
            <div className="signal-card">
              <div className="signal-icon-box king-icon-box">
                <Crown size={24} color="#facc15" />
              </div>
              
              <div className="signal-content">
                <div className="signal-title-row">
                  <h3>{nationalKing.name}</h3>
                  <span className="live-tag">LIVE</span>
                  <button className="info-btn" onClick={() => setActiveInfo('ai')} title="איך המערכת קובעת את הציון?">
                    <Info size={14} />
                  </button>
                </div>
                <p className="signal-sub">
                  {nationalKing.city} {nationalKing.address ? `• ${nationalKing.address}` : ''}
                </p>
              </div>

              <div className="signal-graph">
                <svg viewBox="0 0 100 30" className="sparkline gold">
                  <polyline points="0,25 20,25 25,15 40,15 45,5 60,5 70,5 80,10 90,5 100,0" />
                </svg>
              </div>

              <div className="signal-score king-score">
                 {nationalKing.bayesian_average.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Runners Up Data Signals */}
          {runnersUp.map((place, idx) => (
            <div className="signal-card" key={place.id}>
              <div className="signal-icon-box">
                #{idx + 2}
              </div>
              
              <div className="signal-content">
                <div className="signal-title-row">
                  <h3>{place.name}</h3>
                  <span className="live-tag">LIVE</span>
                  <button className="info-btn" onClick={() => setActiveInfo('ai')} title="הסבר על אלגוריתם הרדאר">
                    <Info size={14} />
                  </button>
                </div>
                <p className="signal-sub">
                  {place.city} {place.address ? `• ${place.address}` : ''}
                </p>
              </div>

              <div className="signal-graph">
                <svg viewBox="0 0 100 30" className="sparkline green">
                  <polyline points="0,20 20,20 30,10 40,25 50,15 60,5 70,15 80,10 90,20 100,10" />
                </svg>
              </div>

              <div className="signal-score">
                 {place.bayesian_average.toFixed(1)}%
              </div>
            </div>
          ))}
          
          {!nationalKing && runnersUp.length === 0 && (
             <div style={{color: '#888', textAlign: 'center', padding: '2rem'}}>{t('no_data')}</div>
          )}
        </div>
      )}

      {/* Footer Section */}
      <div className="radar-footer">
        <button className="footer-btn" onClick={() => setActiveInfo('about')}>
          <InfoIcon size={18} /> אודות
        </button>
        <button className="footer-btn" onClick={handleShare}>
          <Share2 size={18} /> שתף מכ"ם
        </button>
      </div>

      {/* Modals overlay */}
      {activeInfo === 'ai' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3><Activity color="#4ade80" /> איך המכ"ם מחשב ציון רחוב נוכחי?</h3>
            <p>
              בניגוד לגוגל מפות, שמציג ממוצע כוכבים היסטורי של שנים אחורה (ולכן עסקים לעולם לא יורדים בדירוג גם אם אכזבו השבוע), הרדאר שלנו פועל ב<strong>זמן אמת</strong>.
            </p>
            <p>
              מנוע איסוף הנתונים סורק 24/7 את הרשת (גוגל, אינסטגרם, פוסטים וטיקטוק) ומושך משם <strong>רק את הדיבור מהתקופה האחרונה</strong> על השווארמה.
            </p>
            <p>
              בינה מלאכותית (AI) מנתחת את האווירה המילולית בטקסט (כעס? התלהבות? אכזבה מהבשר?) ומייצרת "ציון מומנטום" נקי החדור לשיח הרחוב העכשווי. בגלל זה המקומות יכולים לקפוץ ולצנוח מדי יום!
            </p>
            <div style={{marginTop: '1.5rem', clear: 'both'}}>
              <button className="close-btn" onClick={() => setActiveInfo(null)}>הבנתי, תודה</button>
            </div>
          </div>
        </div>
      )}

      {activeInfo === 'about' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3><Globe color="#3b82f6" /> אודות ShawarmaRadar</h3>
            <p>
              שאוורמה רדאר (ShawarmaRadar) הוא פרויקט איסוף נתונים ולמידת מכונה ששם לו למטרה לייצר שקיפות מלאה לגבי סצנת אוכל הרחוב (ובעיקר שאוורמה) בישראל.
            </p>
            <p>
              המערכת סורקת באופן עצמאי הררי מידע פומבי (פוסטים בקהילות, תיוגים באינסטגרם, פידבק טרי בגוגל), מסננת רעשי רקע שיווקיים, ומזקקת את "חום הרחוב" הטהור אל תוך מכ"ם אחד וברור.
            </p>
            <p style={{color: '#888', fontSize: '0.8rem', marginTop: '1rem'}}>
              מפותח באהבה ובתיאבון. גרסת מערכת: 1.2.0 (Live Deployment)
            </p>
            <div style={{marginTop: '1.5rem', clear: 'both'}}>
              <button className="close-btn" onClick={() => setActiveInfo(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
