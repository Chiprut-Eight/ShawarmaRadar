import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Map, Share2, Download, Info as InfoIcon, Activity, MessageCircle, Navigation, Trophy, X } from 'lucide-react';
import AdBanner from './AdBanner';
import NavigationModal from './NavigationModal';
import './Layout.css';

import { searchRestaurantLocal, type Restaurant } from '../services/firebase';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(() => {
    try {
      return localStorage.getItem('shawarma_radar_welcome_understood_v1') !== 'true';
    } catch {
      return true;
    }
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  
  // Business Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{message: string, isFound: boolean, matches?: Restaurant[], whatsapp?: string} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [navRestaurant, setNavRestaurant] = useState<Restaurant | null>(null);

  // Advertiser Banner 1 (Above Business Search): Shawarma Bon Ta'am
  const topAdvertiserBanners = [
    {
      imageUrl: '/banners/bon-taam-tlv.jpg',
      altText: 'שווארמה בון טעם - אלנבי 56, תל אביב',
      linkUrl: 'https://www.google.com/maps/search/?api=1&query=%D7%A9%D7%95%D7%95%D7%90%D7%A8%D7%9E%D7%94+%D7%91%D7%95%D7%9F+%D7%98%D7%A2%D7%9D+%D7%90%D7%9C%D7%A0%D7%91%D7%99+56+%D7%AA%D7%9C+%D7%90%D7%91%D7%99%D7%91',
    },
  ];

  // Available Banner Slot 2 (Below WhatsApp button - open for next advertiser)
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

  // Close region menu automatically on route change or outside click
  useEffect(() => {
    setIsRegionMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRegionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          ? `כן! נמצאו ${result.matches.length} תוצאות במעקב הרדאר (לחץ על עסק לניווט):` 
          : `Yes! Found ${result.matches.length} matching businesses on the radar (click to navigate):`;
        setSearchResult({
          message: foundMsg,
          isFound: true,
          matches: result.matches
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
          <div className="dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`nav-btn ${location.pathname.includes('/region') || location.pathname === '/near-me' ? 'active' : ''}`}
              onClick={() => setIsRegionMenuOpen((prev) => !prev)}
            >
              <Map size={18} />
              <span className="hide-mobile">{t('nav_filter_region')}</span>
            </button>
            {isRegionMenuOpen && (
              <div className="dropdown-content open">
                <Link
                  to="/near-me"
                  onClick={() => setIsRegionMenuOpen(false)}
                  style={{
                    color: '#4ade80',
                    fontWeight: 'bold',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {t('nav_near_me')}
                </Link>
                {regions.map((r) => (
                  <Link
                    key={r.id}
                    to={`/region/${r.id}`}
                    onClick={() => setIsRegionMenuOpen(false)}
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <button className="lang-toggle" onClick={toggleLanguage}>
          {t('toggle_lang')}
        </button>
      </header>

      <main className="main-content">
        {children}

        {/* Banner 1 - Above Business Section (Shawarma Bon Ta'am) */}
        <AdBanner banners={topAdvertiserBanners} rotationInterval={5000} />

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
              {searchResult.matches && searchResult.matches.length > 0 && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px'}}>
                  {searchResult.matches.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setNavRestaurant(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#1e1e22',
                        border: '1px solid rgba(250, 204, 21, 0.3)',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        textAlign: i18n.language === 'he' ? 'right' : 'left'
                      }}
                    >
                      <div>
                        <div style={{fontWeight: 'bold', color: '#fff', fontSize: '1rem'}}>
                          {item.name}
                          {item.national_rank && (
                            <span style={{marginInlineStart: '8px', fontSize: '0.78rem', color: '#facc15'}}>
                              <Trophy size={12} style={{display: 'inline', verticalAlign: 'middle', marginInlineEnd: '3px'}} />
                              #{item.national_rank} {t('in_israel_short')}
                            </span>
                          )}
                        </div>
                        <div style={{fontSize: '0.82rem', color: '#9ca3af'}}>
                          {item.city} {item.address && item.address !== item.city ? `• ${item.address}` : ''}
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <span style={{color: '#4ade80', fontWeight: 'bold', fontFamily: 'monospace'}}>
                          {item.bayesian_average.toFixed(1)}%
                        </span>
                        <span style={{background: '#facc15', color: '#000', padding: '5px 10px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px'}}>
                          <Navigation size={13} /> {t('navigate_btn')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        <p style={{fontSize: '0.85rem', color: '#9ca3af', textAlign: 'center', maxWidth: '650px', lineHeight: '1.4', margin: '0 10px'}}>
          {t('footer_disclaimer')}
        </p>
        <p style={{fontSize: '0.8rem', color: '#666', fontWeight: 'bold', margin: '0'}}>{t('footer_copyright')}</p>
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
            <div style={{ marginTop: '1.25rem', padding: '1rem 1.15rem', background: 'rgba(250, 204, 21, 0.08)', border: '1px solid rgba(250, 204, 21, 0.35)', borderRadius: '10px' }}>
              <p style={{ color: '#facc15', fontWeight: 'bold', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                {t('community_boost_title')}
              </p>
              <p style={{ color: '#e5e7eb', margin: 0, lineHeight: '1.6', fontSize: '0.92rem' }}>
                {t('community_boost_body')}
              </p>
            </div>
            <p style={{fontWeight: 'bold', marginTop: '1rem'}}>{t('ai_modal_footer')}</p>
            
            <div style={{marginTop: '2rem', clear: 'both'}}>
              <button className="nav-btn" onClick={() => setActiveInfo(null)} style={{background: '#facc15', color: 'black'}}>{t('btn_understood')}</button>
            </div>
            <p style={{fontSize: '0.8rem', color: '#9ca3af', marginTop: '1.2rem', lineHeight: '1.4', borderTop: '1px solid #333', paddingTop: '0.8rem'}}>
              {t('footer_disclaimer')}
            </p>
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

      {showWelcomePopup && (
        <div className="modal-overlay" onClick={() => setShowWelcomePopup(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            dir={i18n.language === 'he' ? 'rtl' : 'ltr'}
            style={{
              textAlign: i18n.language === 'he' ? 'right' : 'left',
              position: 'relative',
              border: '1px solid rgba(250, 204, 21, 0.45)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.75)'
            }}
          >
            <button
              type="button"
              aria-label={t('btn_close')}
              onClick={() => setShowWelcomePopup(false)}
              style={{
                position: 'absolute',
                top: '14px',
                ...(i18n.language === 'he' ? { left: '14px' } : { right: '14px' }),
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#d1d5db',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <h3 style={{ paddingInlineEnd: '36px', lineHeight: '1.4', fontSize: '1.2rem' }}>
              {t('community_boost_title')}
            </h3>
            <p style={{ color: '#e5e7eb', lineHeight: '1.7', fontSize: '0.98rem', marginTop: '0.75rem' }}>
              {t('community_boost_body')}
            </p>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nav-btn"
                onClick={() => {
                  try {
                    localStorage.setItem('shawarma_radar_welcome_understood_v1', 'true');
                  } catch {
                    // ignore storage errors
                  }
                  setShowWelcomePopup(false);
                }}
                style={{
                  background: '#facc15',
                  color: '#000',
                  fontWeight: 'bold',
                  padding: '0.6rem 1.4rem',
                  cursor: 'pointer'
                }}
              >
                {t('btn_got_it')}
              </button>
              <button
                type="button"
                className="nav-btn"
                onClick={() => setShowWelcomePopup(false)}
                style={{
                  border: '1px solid #555',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#d1d5db',
                  padding: '0.6rem 1.2rem',
                  cursor: 'pointer'
                }}
              >
                {t('btn_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavigationModal
        restaurant={navRestaurant}
        onClose={() => setNavRestaurant(null)}
      />
    </div>
  );
};

export default Layout;
