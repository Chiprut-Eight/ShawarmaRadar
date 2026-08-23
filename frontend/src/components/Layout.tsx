import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Map, Share2, Download, Info as InfoIcon, Activity, MessageCircle } from 'lucide-react';
import AdBanner from './AdBanner';
import './Layout.css';

import { searchRestaurantLocal } from '../services/firebase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Business Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{message: string, isFound: boolean, whatsapp?: string} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Demo banners - replace with real advertiser data later
  const demoBanners = [
    {
      altText: t('banner_demo_text'),
      linkUrl: '#',
    },
  ];

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ShawarmaRadar',
          text: t('share_text'),
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert(t('share_fallback'));
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
      alert(t('install_prompt'));
    }
  };

  const handleSearchBusiness = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const result = searchRestaurantLocal(searchQuery);
      if (result.exists) {
        const foundMsg = i18n.language === 'he' 
          ? `כן! העסק '${result.name}' מזוהה ונמצא במעקב הרדאר.` 
          : `Yes! '${result.name}' is identified and tracked by the radar.`;
        setSearchResult({
          message: foundMsg,
          isFound: true
        });
      } else {
        const notFoundMsg = i18n.language === 'he'
          ? "לא נמצא בסורק, אם זו טעות - צור איתנו קשר"
          : "Not found in the scanner. If this is a mistake — contact us";
        const whatsappText = i18n.language === 'he'
          ? `היי, העסק שלי (${searchQuery.trim()}) לא נמצא ברדאר`
          : `Hi, my business (${searchQuery.trim()}) was not found on the radar`;
        setSearchResult({
          message: notFoundMsg,
          isFound: false,
          whatsapp: `https://wa.me/972523445081?text=${encodeURIComponent(whatsappText)}`
        });
      }
    } catch (e) {
      setSearchResult({ message: t('search_error'), isFound: false });
    } finally {
      setIsSearching(false);
    }
  };

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
        <div className="header-logo" style={{ flexShrink: 0 }}>
          <img src="/logo.png" alt="ShawarmaRadar Logo" style={{height: '80px', width: 'auto', borderRadius: '4px', display: 'block'}} />
        </div>
        
        <nav className="header-nav">
          <button className="info-btn" onClick={() => setActiveInfo('ai')} title={t('nav_info_btn')} style={{ color: '#4ade80', borderColor: '#4ade80', width: '36px', height: '36px' }}>
            <Activity size={22} />
          </button>
          <Link to="/" className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}>
            <Globe size={18} />
            <span className="hide-mobile">{t('national_king')}</span>
          </Link>
          <div className="dropdown">
            <button className={`nav-btn ${location.pathname.includes('/region') ? 'active' : ''}`}>
              <Map size={18} />
              <span className="hide-mobile">{t('nav_filter_region')}</span>
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

        {/* Banner 1 - Above Business Section */}
        <AdBanner banners={demoBanners} rotationInterval={5000} />

        {/* Global Business Advertisement Section */}
        <div className="business-section" dir={i18n.language === 'he' ? 'rtl' : 'ltr'} style={{marginTop: '1.5rem', maxWidth: '800px', marginInline: 'auto'}}>
          <h3>{t('business_section_title')}</h3>
          <p>{t('business_section_desc')}</p>
          <div className="search-box">
            <input 
              type="text" 
              placeholder={t('business_search_placeholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearchBusiness} disabled={isSearching}>
              {isSearching ? t('business_scanning_btn') : t('business_search_btn')}
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
                  <MessageCircle size={20} /> {t('business_contact_btn')}
                </a>
              )}
            </div>
          )}
          
          <div style={{marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem'}}>
            <h3>{t('ads_section_title')}</h3>
            <p>{t('ads_section_desc')}</p>
            <a 
              href={`https://wa.me/972523445081?text=${encodeURIComponent(t('whatsapp_ad_prefill'))}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="whatsapp-btn"
            >
              <MessageCircle size={20} /> {t('ads_contact_btn')}
            </a>
          </div>
        </div>

        {/* Banner 2 - Below Business Section */}
        <AdBanner banners={demoBanners} rotationInterval={7000} />
      </main>

      <footer className="footer" style={{ borderTop: '1px solid #333', marginTop: '2rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="nav-btn" onClick={() => setActiveInfo('ai')} style={{background: '#1a1a1a'}}>
            <Activity size={18} /> {t('nav_info_btn')}
          </button>
          <button className="nav-btn" onClick={() => setActiveInfo('about')} style={{background: '#1a1a1a'}}>
            <InfoIcon size={18} /> {t('footer_about')}
          </button>
          <button className="nav-btn" onClick={handleShare} style={{background: '#1a1a1a'}}>
            <Share2 size={18} /> {t('footer_share')}
          </button>
          <button className="nav-btn" onClick={handleInstallClick} style={{background: '#1a1a1a'}}>
            <Download size={18} /> {t('footer_save')}
          </button>
        </div>
        <p style={{fontSize: '0.8rem', color: '#666', fontWeight: 'bold'}}>{t('footer_copyright')}</p>
      </footer>

      {/* Modals overlay */}
      {activeInfo === 'ai' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir={i18n.language === 'he' ? 'rtl' : 'ltr'} style={{ textAlign: i18n.language === 'he' ? 'right' : 'left' }}>
            <h3><Activity color="#4ade80" /> {t('ai_modal_title')}</h3>
            <p>{t('ai_modal_subtitle')}</p>
            <p>
              <strong>{t('ai_modal_history_title')}</strong>{t('ai_modal_history_desc')}
            </p>
            <p>
              <strong>{t('ai_modal_live_title')}</strong>{t('ai_modal_live_desc')}
            </p>
            <ul>
              <li style={{marginBottom: '10px'}}><strong>{t('ai_modal_tension_title')}</strong> {t('ai_modal_tension_desc')}</li>
              <li><strong>{t('ai_modal_nlp_title')}</strong> {t('ai_modal_nlp_desc')}</li>
            </ul>
            <p>
              {t('ai_modal_summary')}
            </p>
            <p style={{fontWeight: 'bold', marginTop: '1rem'}}>{t('ai_modal_footer')}</p>
            
            <div style={{marginTop: '2rem', clear: 'both'}}>
              <button className="nav-btn" onClick={() => setActiveInfo(null)} style={{background: '#facc15', color: 'black'}}>{t('btn_understood')}</button>
            </div>
          </div>
        </div>
      )}

      {activeInfo === 'about' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir={i18n.language === 'he' ? 'rtl' : 'ltr'} style={{ textAlign: i18n.language === 'he' ? 'right' : 'left' }}>
            <h3><Globe color="#3b82f6" /> {t('about_modal_title')}</h3>
            <p>
              {t('about_modal_desc1')}
            </p>
            <p>{t('about_modal_desc2')}</p>
            
            <div style={{marginTop: '2rem'}}>
              <button className="nav-btn" onClick={() => setActiveInfo(null)} style={{border: '1px solid #444'}}>{t('btn_close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
