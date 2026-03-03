import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import { Crown, MessageCircle } from 'lucide-react';

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
  
  // Business Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{message: string, isFound: boolean, whatsapp?: string} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
      setSearchResult({
        message: data.message,
        isFound: data.exists,
        whatsapp: data.whatsapp_link
      });
    } catch (e) {
      setSearchResult({ message: "שגיאה בחיבור לשרת הרדאר.", isFound: false });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="home-container" dir="rtl">
      {/* King Radar Section (Top) */}
      <div className="king-radar-container" style={{position: 'relative'}}>
        
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
          <h2 className="signals-section-title">עוד שווארמיות שאתם אוהבים</h2>
          
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
          <div style={{marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <div style={{color: searchResult.isFound ? '#facc15' : '#ef4444', fontWeight: 'bold'}}>
              {searchResult.message}
            </div>
            {searchResult.whatsapp && (
               <a 
                 href={searchResult.whatsapp}
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="whatsapp-btn"
                 style={{marginTop: '5px'}}
               >
                 <MessageCircle size={20} /> צור קשר להוספה לרדאר
               </a>
            )}
          </div>
        )}
        
        <div style={{marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem'}}>
          <h3>רוצים לשמוע איך ניתן לפרסם אצלנו?</h3>
          <p>תגיעו ללקוחות רעבים ברגע המדויק שהם בודקים את המכ"ם.</p>
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

    </div>
  );
};

export default Home;
