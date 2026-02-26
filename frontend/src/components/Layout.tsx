import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Radar, Globe, Map } from 'lucide-react';
import './Layout.css';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'he' ? 'en' : 'he');
  };

  const regions = [
    { id: 'north', label: t('region_north') },
    { id: 'center', label: t('region_center') },
    { id: 'south', label: t('region_south') },
    { id: 'sharon', label: t('region_sharon') },
    { id: 'shfela', label: t('region_shfela') },
  ];

  return (
    <div className="layout">
      <div className="radar-scan"></div>
      
      <header className="header">
        <div className="header-logo">
          <Radar className="logo-icon" size={32} />
          <h1>{t('app_name')}</h1>
        </div>
        
        <nav className="header-nav">
          <Link to="/" className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}>
            <Globe size={18} />
            <span className="hide-mobile">{t('national_king')}</span>
          </Link>
          <div className="dropdown">
            <button className={`nav-btn ${location.pathname.includes('/region') ? 'active' : ''}`}>
              <Map size={18} />
              <span className="hide-mobile">אזורים</span>
            </button>
            <div className="dropdown-content">
              {regions.map((r) => (
                <Link key={r.id} to={`/region/${r.id}`}>{r.label}</Link>
              ))}
            </div>
          </div>
        </nav>

        <button className="lang-toggle" onClick={toggleLanguage}>
          {t('toggle_lang')}
        </button>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <p>ShawarmaRadar &copy; 2026 - Confidential Military Operations</p>
      </footer>
    </div>
  );
};

export default Layout;
