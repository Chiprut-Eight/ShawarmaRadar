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
      <h2 className="region-title">
        <MapPin className="region-icon" />
        {currentRegionName} - מפקדת תצפית
      </h2>

      <div className="grid-layout">
        <div className="local-king-panel card">
          <h3>Local King</h3>
          {loading ? (
             <div className="sys-message">
               <span>[SYSTEM]</span> SCANNING SECTOR {id?.toUpperCase()}...
             </div>
          ) : localKing ? (
            <div className="regional-king-info">
              <h2>{localKing.name} - {localKing.city}</h2>
              {localKing.address && <p style={{fontSize: '0.9em', color: '#ccc', margin: '4px 0'}}>{localKing.address}</p>}
              <p>Score: {localKing.bayesian_average.toFixed(1)}</p>
              <p className="reports-count">{t('based_on_reports', { count: localKing.total_reviews })}</p>
            </div>
          ) : (
            <div className="sys-message">
              <span>[SYSTEM]</span> NO TARGET ACQUIRED IN SECTOR {id?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="tension-panel card">
          <h3>Sector Tension</h3>
          <TensionMeter value={regionTension} />
        </div>
        
        <div className="feed-panel card">
          <h3>Top Rankings Feed</h3>
          <div className="scrolling-intel">
            {restaurants.slice(1).map((place, idx) => (
              <div key={place.id} className="secondary-ranking-card card">
                <h3>#{idx + 2} {place.name}</h3>
                {place.address && <p style={{fontSize: '0.8em', color: '#999', margin: '2px 0'}}>{place.address}</p>}
                <p>
                  <MapPin size={16} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
                  {place.city}
                </p>
                <p>Score: {place.bayesian_average.toFixed(1)}</p>
              </div>
            ))}
            {restaurants.length <= 1 && !loading && (
              <p className="sys-message">[SYSTEM] No additional intel.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalDashboard;
