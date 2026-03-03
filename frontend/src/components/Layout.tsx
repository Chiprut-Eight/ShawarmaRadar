import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Globe, Map, Share2, Download, Info as InfoIcon, Activity, MessageCircle } from 'lucide-react';
import './Layout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Business Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{message: string, isFound: boolean, whatsapp?: string} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
          text: 'בדוק את מפת הדירוג החיה של השווארמיות בישראל!',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert('העתק את הקישור ושתף מכל דפדפן!');
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
      alert('להתקנת האפליקציה ב-iOS / אייפון: יש ללחוץ על כפתור השיתוף בתחתית המסך ובחרו "Add to Home Screen". באנדרואיד: לחצו על 3 הנקודות בדפדפן ובחרו "Add to Home screen".');
    }
  };

  const handleSearchBusiness = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API_URL}/api/restaurants/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResult({
        message: data.message,
        isFound: data.exists,
        whatsapp: data.whatsapp_link
      });
    } catch (e) {
      setSearchResult({ message: "שגיאה בחיבור לשרת הרדאר.", isFound: false });
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
          <button className="info-btn" onClick={() => setActiveInfo('ai')} title="איך המכ&quot;ם מחשב?" style={{ color: '#4ade80', borderColor: '#4ade80', width: '36px', height: '36px' }}>
            <Activity size={22} />
          </button>
          <Link to="/" className={`nav-btn ${location.pathname === '/' ? 'active' : ''}`}>
            <Globe size={18} />
            <span className="hide-mobile">{t('national_king')}</span>
          </Link>
          <div className="dropdown">
            <button className={`nav-btn ${location.pathname.includes('/region') ? 'active' : ''}`}>
              <Map size={18} />
              <span className="hide-mobile">סנן לפי אזור</span>
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

        {/* Global Business Advertisement Section */}
        <div className="business-section" dir="rtl" style={{marginTop: '3rem', maxWidth: '800px', marginInline: 'auto'}}>
          <h3>האם העסק שלך ברדאר?</h3>
          <p>חפש את הרשומה שלך ובדוק אם המכ"ם שלנו סורק אותך (גם אם אינך בטופ):</p>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="שם שווארמיה / עסק..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={handleSearchBusiness} disabled={isSearching}>
              {isSearching ? 'סורק...' : 'חפש'}
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
                  <MessageCircle size={20} /> צור קשר להוספה לרדאר
                </a>
              )}
            </div>
          )}
          
          <div style={{marginTop: '2rem', borderTop: '1px solid #333', paddingTop: '1.5rem'}}>
            <h3>רוצים לשמוע איך ניתן לפרסם אצלנו?</h3>
            <p>תגיעו ללקוחות רעבים ברגע המדויק שהם בודקים את המכ"ם.</p>
            <a 
              href="https://wa.me/972523445081?text=היי,%20ספר%20לי%20איך%20ניתן%20לפרסם%20את%20העסק%20שלי%20ב-ShawarmaRadar" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="whatsapp-btn"
            >
              <MessageCircle size={20} /> שלח הודעת ווצאפ עכשיו
            </a>
          </div>
        </div>
      </main>

      <footer className="footer" style={{ borderTop: '1px solid #333', marginTop: '2rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="nav-btn" onClick={() => setActiveInfo('about')} style={{background: '#1a1a1a'}}>
            <InfoIcon size={18} /> אודות
          </button>
          <button className="nav-btn" onClick={handleShare} style={{background: '#1a1a1a'}}>
            <Share2 size={18} /> שתף מכ"ם
          </button>
          <button className="nav-btn" onClick={handleInstallClick} style={{background: '#1a1a1a'}}>
            <Download size={18} /> שמור במסך הבית
          </button>
        </div>
        <p style={{fontSize: '0.8rem', color: '#666'}}>ShawarmaRadar &copy; 2026 - Confidential Military Operations</p>
      </footer>

      {/* Modals overlay */}
      {activeInfo === 'ai' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir="rtl">
            <h3><Activity color="#4ade80" /> איך המכ"ם מחשב את ציון השווארמה?</h3>
            <p>הציון מורכב ממספר גורמים:</p>
            <p>
              <strong>ההיסטוריה ארוכת השנים אצל גוגל</strong> - אנחנו דוגמים את המוניטין של העסק מול אלפי הלקוחות שביקרו בו לאורך השנים כדי לקבוע מיקום התחלתי, המערכת שלנו יודעת להבדיל בין עליה של מקומות חדשים שקיבלו שתי ביקורות טובות מול מקומות ותיקים שקיבלו מאות ביקורות מגוונות.
            </p>
            <p>
              <strong>מה הופך את הרדאר ל"חי"?</strong> במקום להסתמך רק על היסטוריה, המנוע הייחודי שלנו משוקלל בזמן אמת עם שני גורמים נוספים:
            </p>
            <ul>
              <li style={{marginBottom: '10px'}}>- <strong>מדד ה"ביקוש והלחץ":</strong> אנחנו סורקים את אפליקציות המשלוחים ובודקים את העומס, זמני המשלוח, והדירוג של המקום.</li>
              <li>- <strong>סנטימנט עכשווי:</strong> המערכת קוראת את הביקורות האחרונות והשיח ברשת, מנתחת את השפה ומבינה אם יש כרגע התלהבות שיא או אכזבה.</li>
            </ul>
            <p>
              האלמנטים החיים הללו משוקללים כמעין "בונוס" או "קנס" לדירוג. כך הרדאר שלנו מרים מקומות ש'לוהטים' הרגע, ומוריד מקומות שאכזבו לאחרונה - הכל כדי שתדעו איפה לאכול ממש עכשיו.
            </p>
            <p style={{fontWeight: 'bold', marginTop: '1rem'}}>בתאבון :)</p>
            
            <div style={{marginTop: '2rem', clear: 'both'}}>
              <button className="nav-btn" onClick={() => setActiveInfo(null)} style={{background: '#facc15', color: 'black'}}>הבנתי, תודה</button>
            </div>
          </div>
        </div>
      )}

      {activeInfo === 'about' && (
        <div className="modal-overlay" onClick={() => setActiveInfo(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} dir="rtl">
            <h3><Globe color="#3b82f6" /> אודות ShawarmaRadar</h3>
            <p>
              שווארמה רדאר (ShawarmaRadar) הוא פרויקט איסוף נתונים ולמידת מכונה ששם לו למטרה לייצר שקיפות מלאה לגבי ביקורות על שווארמיות בישראל. המערכת סורקת באופן עצמאי הררי מידע פומבי ומזקקת אותו אל תוך מכ"ם אחד וברור.
            </p>
            <p>מפותח באהבה ובתיאבון.</p>
            
            <div style={{marginTop: '2rem'}}>
              <button className="nav-btn" onClick={() => setActiveInfo(null)} style={{border: '1px solid #444'}}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
