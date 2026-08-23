import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import './RegionalDashboard.css';
import { getRegionalRankings, getBundledRegionalRankings, type Restaurant } from '../services/firebase';

const RegionalDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => getBundledRegionalRankings(id || 'center'));

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
      const data = await getRegionalRankings(id);
      if (data && data.length > 0) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Failed to fetch regional rankings:", error);
    }
  };

  useEffect(() => {
    fetchRegionalRankings();
    const interval = setInterval(fetchRegionalRankings, 60000);
    return () => clearInterval(interval);
  }, [id]);

  const localKing = restaurants.length > 0 ? restaurants[0] : null;

  return (
    <div className="regional-container" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      <h2 className="region-title" style={{textAlign: 'center', marginBottom: '20px', fontSize: '2em', fontWeight: 'bold'}}>
        <MapPin className="region-icon" style={{display: 'inline-block', verticalAlign: 'middle', marginLeft: '8px'}} />
        {currentRegionName}
      </h2>

      {/* Local King Radar Section */}
      <div className="king-radar-container">
        <h2 className="king-radar-title">{t('region_king_title')}</h2>
        
        {localKing ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div className="king-radar-name">{localKing.name}</div>
            {localKing.address && localKing.address !== localKing.city ? (
               <div className="king-radar-address">{localKing.city} • {localKing.address}</div>
            ) : (
               <div className="king-radar-address">{localKing.city}</div>
            )}
            <div className="king-radar-score">{localKing.bayesian_average.toFixed(1)}%</div>
          </div>
        ) : (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>{t('region_no_data')}</div>
          </div>
        )}
      </div>

      <div className="signals-panel" style={{marginTop: '30px'}}>
        <h2 className="signals-section-title">{t('region_leaders')} {currentRegionName}</h2>
          
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
                  {place.city} {place.address && place.address !== place.city ? `• ${place.address}` : ''}
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
             <div style={{color: '#888', textAlign: 'center', padding: '2rem'}}>{t('region_no_more_data')}</div>
          )}
        </div>
    </div>
  );
};

export default RegionalDashboard;
