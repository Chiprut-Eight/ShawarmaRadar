import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import { Crown } from 'lucide-react';

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


    </div>
  );
};

export default Home;
