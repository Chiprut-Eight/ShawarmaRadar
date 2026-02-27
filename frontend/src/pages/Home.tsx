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
  address?: string;
}


const Home: React.FC = () => {
  const { t } = useTranslation();
  const [nationalKing, setNationalKing] = useState<Restaurant | null>(null);
  const [runnersUp, setRunnersUp] = useState<Restaurant[]>([]);
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
          <h3><Info size={20} /> {t('legend_title')}</h3>
          <p>
            <strong>{t('legend_radar_title')}</strong><br/>
            {t('legend_radar_desc')}
          </p>
          <p>
            <strong>{t('legend_ai_title')}</strong><br/>
            {t('legend_ai_desc')}
          </p>
        </div>
        <div className="info-card card">
          <h3><Activity size={20} /> {t('tension_meter')}</h3>
          <p>
             {t('legend_tension_desc')}
          </p>
        </div>
      </div>

      {/* Center Panel: Radar */}
      <div className="center-panel">
        <div className="radar-display">
          {loading ? (
            <div className="empty-state pulse-effect">
              <div className="radar-sweep"></div>
              <p className="scan-text">{t('scan_national')}</p>
            </div>
          ) : nationalKing ? (
            <div className="king-card card pulse-effect">
              <Crown className="crown-icon" size={48} />
              <div className="king-info">
                <h3>{nationalKing.name} - {nationalKing.city}</h3>
                {nationalKing.address && <p style={{fontSize: '0.9em', color: '#ccc', margin: '4px 0'}}>{nationalKing.address}</p>}
                <p>Score: {nationalKing.bayesian_average.toFixed(1)} / 100</p>
                <p>{t('based_on_reports', { count: nationalKing.total_reviews })}</p>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p className="scan-text">{t('no_data')}</p>
            </div>
          )}
        </div>

        <div className="runners-up-section">
          {runnersUp.map((place, idx) => (
            <div key={place.id} className="runner-up-card card">
               <h4>#{idx + 2} {place.name}</h4>
               {place.address && <p style={{fontSize: '0.8em', color: '#999', margin: '2px 0'}}>{place.address}</p>}
               <p>{place.city} - Score: {place.bayesian_average.toFixed(1)}</p>
            </div>
          ))}
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
