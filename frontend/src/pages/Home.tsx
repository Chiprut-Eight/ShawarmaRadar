import React from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import TensionMeter from '../components/TensionMeter';
import { Target, Crown } from 'lucide-react';

const Home: React.FC = () => {
  const { t } = useTranslation();

  // Empty structure as requested - no fake data.
  const nationalKing: any = null; // Will inject real data later
  const runnersUp: any[] = []; // Real data later

  return (
    <div className="home-container">
      <h2 className="page-title">
        <Target className="title-icon" />
        {t('national_king')}
      </h2>

      <div className="radar-display">
        {nationalKing ? (
          <div className="king-card card pulse-effect">
            <Crown className="crown-icon" size={48} />
            {/* Real Data will go here */}
          </div>
        ) : (
          <div className="empty-state pulse-effect">
            <div className="radar-sweep"></div>
            <p className="scan-text">Scanning for the National King...</p>
            <p className="sub-scan">Awaiting Intelligence Data</p>
          </div>
        )}
      </div>

      <div className="runners-up-section">
        {runnersUp.map((_place, idx) => (
          <div key={idx} className="runner-up-card card">
             {/* Data goes here */}
          </div>
        ))}
      </div>

      <div className="tension-section card">
        <h3>{t('tension_meter')}</h3>
        <TensionMeter value={0} />
      </div>
    </div>
  );
};

export default Home;
