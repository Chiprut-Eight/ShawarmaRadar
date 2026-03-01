import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TensionMeter from '../components/TensionMeter';
import { MapPin } from 'lucide-react';
import './RegionalDashboard.css';

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

const RegionalDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const regionNameMap: Record<string, string> = {
    north: t('region_north'),
    center: t('region_center'),
    south: t('region_south'),
    sharon: t('region_sharon'),
    shfela: t('region_shfela'),
  };

  const currentRegionName = id ? regionNameMap[id] : '';

  const fetchRegionalRankings = async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API_URL}/api/rankings/region/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Failed to fetch regional rankings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegionalRankings();
    const interval = setInterval(fetchRegionalRankings, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const localKing = restaurants.length > 0 ? restaurants[0] : null;
  const regionTension = localKing ? localKing.bayesian_average : 0;

  return (
    <div className="regional-container">
      <h2 className="region-title" style={{textAlign: 'center', marginBottom: '20px'}}>
        <MapPin className="region-icon" style={{display: 'inline-block', verticalAlign: 'middle', marginLeft: '8px'}} />
        {currentRegionName} - מפקדת תצפית
      </h2>

      {/* Local King Radar Section */}
      <div className="king-radar-container">
        <h2 className="king-radar-title">מלך האזור עכשיו</h2>
        
        {loading ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>סורק רחוב...</div>
          </div>
        ) : localKing ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div style={{zIndex: 2, marginBottom: '10px'}}><TensionMeter value={regionTension} /></div>
            <div className="king-radar-name">{localKing.name}</div>
            {localKing.address ? (
               <div className="king-radar-address">{localKing.city} • {localKing.address}</div>
            ) : (
               <div className="king-radar-address">{localKing.city}</div>
            )}
            <div className="king-radar-score">{localKing.bayesian_average.toFixed(1)}%</div>
          </div>
        ) : (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>אין מספיק נתונים לאזור זה</div>
          </div>
        )}
      </div>

      {loading ? null : (
        <div className="signals-panel" style={{marginTop: '30px'}}>
          <h2 className="signals-section-title">המובילות באזור {currentRegionName}</h2>
          
          {restaurants.slice(1).map((place, idx) => (
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
          
          {!localKing && restaurants.length <= 1 && (
             <div style={{color: '#888', textAlign: 'center', padding: '2rem'}}>אין נתונים נוספים להצגה באזור זה.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default RegionalDashboard;
