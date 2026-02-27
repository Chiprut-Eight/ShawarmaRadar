import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import { Crown, Info, Share2, Info as InfoIcon, Activity, MessageCircle, Download, Globe } from 'lucide-react';

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
  
  // Business Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

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

  const handleSearchBusiness = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/restaurants/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResult(data.message);
    } catch (e) {
      setSearchResult("שגיאה בחיבור לשרת הרדאר.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('להתקנת האפליקציה ב-iOS / אייפון: יש ללחוץ על כפתור השיתוף בתחתית המסך ובחרו "Add to Home Screen". באנדרואיד: לחצו על 3 הנקודות בדפדפן ובחרו "Add to Home screen".');
    }
  };

  return (
    <div className="home-container" dir="rtl">
      {/* Branding Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px'}}>
        <img src="/logo.jpeg" alt="ShawarmaRadar Logo" style={{width: 48, height: 48, borderRadius: '50%', border: '2px solid #facc15'}} />
        <h1 style={{margin: 0, fontSize: '1.5rem', color: '#fff', letterSpacing: '1px'}}>ShawarmaRadar</h1>
      </div>

      {/* King Radar Section (Top) */}
      <div className="king-radar-container">
        <h2 className="king-radar-title">מלך השווארמה עכשיו</h2>
        <div className="king-radar-time">
          {formatTime(time)} • {formatDate(time)}
        </div>
        
        {loading ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>סורק רחוב...</div>
          </div>
        ) : nationalKing ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <Crown size={48} color="#facc15" style={{zIndex: 2}} />
            <div className="king-radar-name">{nationalKing.name}</div>
            {nationalKing.address ? (
               <div className="king-radar-address">{nationalKing.city} • {nationalKing.address}</div>
            ) : (
               <div className="king-radar-address">{nationalKing.city}</div>
            )}
            <div className="king-radar-score">{nationalKing.bayesian_average.toFixed(1)}%</div>
            
            <button className="info-btn" onClick={() => setActiveInfo('ai')} title="איך המערכת מחשבת?" style={{position: 'absolute', top: '20px', left: '20px'}}>
              <Info size={16} />
            </button>
          </div>
        ) : (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>{t('no_data')}</div>
          </div>
        )}
      </div>

      {loading ? null : (
        <div className="signals-panel">
          <h2 className="signals-section-title">פעילות רחוב חיה</h2>
          
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

      {/* Business Advertisement Section */}
      <div className="business-section">
        <h3>האם העסק שלך ברדאר?</h3>
        <p>חפש את הרשומה שלך ובדוק אם המכ"ם שלנו סורק אותך (גם אם אינך בטופ):</p>
        <div className="search-box">
          <input 
            type="text" 
            placeholder="שם שווארמיה / עסק..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button onClick={handleSearchBusiness} disabled={isSearching}>
            {isSearching ? 'סורק...' : 'חפש'}
          </button>
        </div>
        {searchResult && (
          <div style={{color: searchResult.includes('כן') ? '#facc15' : '#ef4444', marginBottom: '1rem', fontWeight: 'bold'}}>
            {searchResult}
          </div>
        )}
        
        <div style={{marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem'}}>
          <h3>רוצים לשמוע איך ניתן לפרסם אצלנו?</h3>
          <p>הגע ללקוחות רעבים ברגע המדויק שהם בודקים את המכ"ם.</p>
          <a 
            href="https://wa.me/972523445081?text=היי,%20ספר%20לי%20איך%20ניתן%20לפרסם%20את%20העסק%20שלי%20ב-ShawarmaRadar" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="whatsapp-btn"
          >
            <MessageCircle size={20} /> שלח הודעת ווצאפ עכשיו
          </a>
        </div>
      </div>

      {/* Footer Section */}
      <div className="radar-footer">
        <button className="footer-btn" onClick={() => setActiveInfo('about')}>
          <InfoIcon size={18} /> אודות
        </button>
        <button className="footer-btn" onClick={handleShare}>
          <Share2 size={18} /> שתף מכ"ם
        </button>
        <button className="footer-btn" onClick={handleInstallClick}>
          <Download size={18} /> שמור במסך הבית
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
              שאוורמה רדאר (ShawarmaRadar) הוא פרויקט איסוף נתונים ולמידת מכונה ששם לו למטרה לייצר שקיפות מלאה לגבי ביקורות על שווארמיות בישראל.
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
