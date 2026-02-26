import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TensionMeter from '../components/TensionMeter';
import { MapPin } from 'lucide-react';
import './RegionalDashboard.css';

const RegionalDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const regionNameMap: Record<string, string> = {
    north: t('region_north'),
    center: t('region_center'),
    south: t('region_south'),
    sharon: t('region_sharon'),
    shfela: t('region_shfela'),
  };

  const currentRegionName = id ? regionNameMap[id] : '';

  // Empty data setup for the region
  const localKing = null;
  const regionTension = 0;

  return (
    <div className="regional-container">
      <h2 className="region-title">
        <MapPin className="region-icon" />
        {currentRegionName} - מפקדת תצפית
      </h2>

      <div className="grid-layout">
        <div className="local-king-panel card">
          <h3>Local King</h3>
          {localKing ? (
            <div> {/* Real data */} </div>
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
          <h3>Live Intel Feed</h3>
          <div className="scrolling-intel">
            {/* Live messages placeholder */}
            <p className="sys-message">[SYSTEM] Awaiting incoming transmission...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionalDashboard;
