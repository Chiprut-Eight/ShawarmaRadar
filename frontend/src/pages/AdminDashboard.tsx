import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  LogOut,
  Users,
  Clock,
  Eye,
  Crown,
  History,
  Award,
  BarChart3,
  Smartphone,
  Monitor,
  Navigation,
  MousePointerClick,
  Search,
  Trophy,
} from 'lucide-react';
import { getAllRankedRestaurants, type Restaurant } from '../services/firebase';
import {
  subscribeLiveAdminAnalytics,
  fetchRecentDailyStats,
  PAGE_LABELS_HE,
  type GlobalStatsDoc,
  type DailyStatsDoc,
  type PresenceDoc,
} from '../services/analytics';
import NavigationModal from '../components/NavigationModal';
import kingHistoryData from '../data/king_history.json';
import './AdminDashboard.css';

// SHA-256 hash of PIN "17041986"
const ADMIN_PIN_SHA256 = '690501f679c5b198f428baca6a7c15771095696e8e096948d83376bf933d55c0';
const ADMIN_AUTH_STORAGE_KEY = 'sr_admin_unlocked_v1';

interface ReignRecord {
  platform_id: string;
  name: string;
  city: string;
  address?: string;
  started_at: string;
  ended_at: string | null;
  score_at_start: number;
  current_score: number;
  peak_score: number;
  duration_seconds: number;
}

const REGION_NAMES_HE: Record<string, string> = {
  north: 'צפון',
  center: 'מרכז',
  sharon: 'שרון',
  shfela: 'שפלה',
  south: 'דרום',
};

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

function formatHebrewDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const totalDays = Math.floor(safeSeconds / 86400);
  const hours = Math.max(1, Math.floor((safeSeconds % 86400) / 3600));

  if (totalDays === 0) return `היום הראשון (${hours} שעות בפסגה)`;
  if (totalDays === 1) return 'יום אחד';
  if (totalDays === 2) return 'יומיים';
  if (totalDays < 7) return `${totalDays} ימים`;
  if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    const weekLabel = weeks === 1 ? 'שבוע אחד' : weeks === 2 ? 'שבועיים' : `${weeks} שבועות`;
    return remDays === 0 ? `${totalDays} ימים (${weekLabel})` : `${totalDays} ימים (${weekLabel} ו-${remDays} ימים)`;
  }
  const months = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;
  const approxWeeks = Math.round(totalDays / 7);
  const monthLabel = months === 1 ? 'חודש' : months === 2 ? 'חודשיים' : `${months} חודשים`;
  return remDays === 0
    ? `${totalDays} ימים (${monthLabel} / כ-${approxWeeks} שבועות)`
    : `${totalDays} ימים (${monthLabel} ו-${remDays} ימים / כ-${approxWeeks} שבועות)`;
}

function formatShortDate(isoStr: string | null): string {
  if (!isoStr) return 'כעת';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

function formatAvgStay(totalSeconds: number, sessionsCount: number): string {
  if (!sessionsCount || sessionsCount <= 0 || !totalSeconds) return '0 שניות';
  const avg = Math.round(totalSeconds / sessionsCount);
  if (avg < 60) return `${avg} שניות`;
  const mins = Math.floor(avg / 60);
  const secs = avg % 60;
  return secs > 0 ? `${mins} דק' ו-${secs} שנ'` : `${mins} דקות`;
}

const AdminDashboard: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === ADMIN_PIN_SHA256 ||
        sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === ADMIN_PIN_SHA256
      );
    } catch {
      return false;
    }
  });

  const [pinInput, setPinInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [pinError, setPinError] = useState('');

  // Live Analytics State
  const [globalStats, setGlobalStats] = useState<GlobalStatsDoc>({});
  const [activePresence, setActivePresence] = useState<PresenceDoc[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStatsDoc[]>([]);
  const [nowTick, setNowTick] = useState<Date>(new Date());

  // Full 301 Leaderboard Filters
  const allRestaurants = useMemo(() => getAllRankedRestaurants(), []);
  const [tableQuery, setTableQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'radar' | 'google_rating' | 'google_reviews' | 'wolt' | 'tenbis'>('radar');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);

  useEffect(() => {
    if (!isUnlocked) return;
    const unsub = subscribeLiveAdminAnalytics(setGlobalStats, setActivePresence);
    void fetchRecentDailyStats(14).then(setDailyStats);
    const clock = window.setInterval(() => setNowTick(new Date()), 10_000);
    return () => {
      unsub();
      window.clearInterval(clock);
    };
  }, [isUnlocked]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    const digest = await sha256Hex(cleaned);
    if (digest === ADMIN_PIN_SHA256) {
      try {
        if (rememberMe) {
          localStorage.setItem(ADMIN_AUTH_STORAGE_KEY, ADMIN_PIN_SHA256);
        } else {
          sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, ADMIN_PIN_SHA256);
        }
      } catch {
        // ignore
      }
      setPinError('');
      setPinInput('');
      setIsUnlocked(true);
    } else {
      setPinError('קוד הגישה שגוי. נסה שנית.');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
      sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsUnlocked(false);
  };

  const filteredRestaurants = useMemo(() => {
    const q = tableQuery.trim().toLowerCase();
    const list = allRestaurants.filter((r) => {
      if (regionFilter !== 'all' && r.region !== regionFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        (r.address || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'google_rating') {
        const diff = (b.google_rating || 0) - (a.google_rating || 0);
        return diff !== 0 ? diff : (b.google_ratings_total || 0) - (a.google_ratings_total || 0);
      }
      if (sortBy === 'google_reviews') {
        return (b.google_ratings_total || 0) - (a.google_ratings_total || 0);
      }
      if (sortBy === 'wolt') {
        return (b.wolt_rating || 0) - (a.wolt_rating || 0);
      }
      if (sortBy === 'tenbis') {
        return (b.tenbis_rating || 0) - (a.tenbis_rating || 0);
      }
      return b.bayesian_average - a.bayesian_average;
    });
  }, [allRestaurants, tableQuery, regionFilter, sortBy]);

  if (!isUnlocked) {
    return (
      <div className="admin-lock-screen" dir="rtl">
        <form className="admin-lock-card" onSubmit={handlePinSubmit}>
          <div className="admin-lock-icon">
            <Lock size={26} />
          </div>
          <h2>אזור ניהול פרטי</h2>
          <p className="admin-lock-sub">הזן קוד מנהל לצפייה במודיעין, סטטיסטיקות הגולשים והדירוג המלא</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            className="admin-pin-input"
            placeholder="••••••••"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
          <label className="admin-remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>זכור אותי במכשיר זה</span>
          </label>
          {pinError && <div className="admin-pin-error">{pinError}</div>}
          <button type="submit" className="admin-unlock-btn">
            כניסה למערכת הניהול
          </button>
        </form>
      </div>
    );
  }

  // Reign calculations
  const reigns: ReignRecord[] = (kingHistoryData?.reigns as ReignRecord[]) || [];
  const activeReign: ReignRecord | null = reigns.length > 0 ? reigns[reigns.length - 1] : null;
  const closedReigns: ReignRecord[] = reigns.length > 1 ? reigns.slice(0, -1).reverse() : [];
  const currentStreakSeconds = activeReign
    ? Math.max(0, Math.floor((nowTick.getTime() - new Date(activeReign.started_at).getTime()) / 1000))
    : 0;
  const currentKingPastReigns = activeReign
    ? closedReigns.filter(
        (r) =>
          r.platform_id === activeReign.platform_id ||
          (r.name === activeReign.name && r.city === activeReign.city)
      )
    : [];
  const currentKingPastTotalSeconds = currentKingPastReigns.reduce((acc, r) => {
    if (r.duration_seconds && r.duration_seconds > 0) return acc + r.duration_seconds;
    if (r.started_at && r.ended_at) {
      return acc + Math.max(0, Math.floor((new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000));
    }
    return acc;
  }, 0);

  // Page popularity breakdown
  const pagesMap = globalStats.pages || {};
  const totalPageViews = Math.max(
    1,
    Object.values(pagesMap).reduce((sum, v) => sum + Number(v || 0), 0) || Number(globalStats.total_page_views || 0)
  );
  const sortedPages = Object.entries(PAGE_LABELS_HE)
    .map(([key, label]) => ({
      key,
      label,
      views: Number(pagesMap[key] || 0),
    }))
    .filter((item) => item.views > 0 || item.key !== 'other')
    .sort((a, b) => b.views - a.views);

  const mobileSessions = Number(globalStats.devices?.mobile || 0);
  const desktopSessions = Number(globalStats.devices?.desktop || 0);
  const totalDeviceSessions = Math.max(1, mobileSessions + desktopSessions);
  const mobilePct = Math.round((mobileSessions / totalDeviceSessions) * 100);
  const desktopPct = mobileSessions + desktopSessions > 0 ? 100 - mobilePct : 0;

  const liveMobile = activePresence.filter((p) => p.device === 'mobile').length;
  const liveDesktop = activePresence.filter((p) => p.device === 'desktop').length;

  const todayRow = dailyStats[0];

  return (
    <div className="admin-dashboard" dir="rtl">
      {/* Top Bar */}
      <div className="admin-top-bar">
        <div className="admin-top-title">
          <Crown size={28} color="#facc15" />
          <div>
            <h1>חדר בקרה ומודיעין — ShawarmaRadar</h1>
            <p>נתוני אמת רשמיים • {allRestaurants.length} שווארמיות מאומתות במעקב</p>
          </div>
        </div>
        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          <LogOut size={15} /> נעל והתנתק
        </button>
      </div>

      {/* Section 1: Live KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card live-highlight">
          <div className="admin-kpi-label">
            <span className="live-dot" /> גולשים באתר כרגע (LIVE)
          </div>
          <div className="admin-kpi-value" style={{ color: '#4ade80' }}>
            {activePresence.length}
          </div>
          <div className="admin-kpi-sub">
            📱 {liveMobile} בנייד • 💻 {liveDesktop} במחשב
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Users size={15} color="#facc15" /> סה"כ גולשים ייחודיים עד היום
          </div>
          <div className="admin-kpi-value">
            {(globalStats.unique_visitors || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">
            היום: {(todayRow?.unique_visitors || 0).toLocaleString()} גולשים • סה"כ ביקורים: {(globalStats.total_sessions || 0).toLocaleString()}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Clock size={15} color="#60a5fa" /> זמן שהייה ממוצע באתר
          </div>
          <div className="admin-kpi-value" style={{ fontSize: '1.4rem' }}>
            {formatAvgStay(
              Number(globalStats.total_duration_seconds || 0),
              Number(globalStats.duration_sessions || 0)
            )}
          </div>
          <div className="admin-kpi-sub">
            מבוסס על {(globalStats.duration_sessions || 0).toLocaleString()} סשנים מלאים שנמדדו
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Eye size={15} color="#a78bfa" /> סה"כ צפיות בדפים
          </div>
          <div className="admin-kpi-value">
            {(globalStats.total_page_views || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">
            היום: {(todayRow?.page_views || 0).toLocaleString()} צפיות • {(globalStats.searches || 0).toLocaleString()} חיפושי עסקים
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <Navigation size={15} color="#34d399" /> לחיצות ניווט לשווארמיות
          </div>
          <div className="admin-kpi-value">
            {(globalStats.nav_clicks || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">
            🚗 Waze: {globalStats.nav_waze_clicks || 0} • 🗺️ Google Maps: {globalStats.nav_gmaps_clicks || 0}
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-label">
            <MousePointerClick size={15} color="#facc15" /> קליקים על באנר מפרסמים
          </div>
          <div className="admin-kpi-value" style={{ color: '#facc15' }}>
            {(globalStats.banner_clicks || 0).toLocaleString()}
          </div>
          <div className="admin-kpi-sub">
            היום: {(todayRow?.banner_clicks || 0).toLocaleString()} קליקים לעמודי מפרסמים
          </div>
        </div>
      </div>

      {/* Section 2: Where Visitors Visited Most + Devices & Daily Log */}
      <div className="admin-two-col">
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2>
              <BarChart3 size={18} /> איפה גולשים ביקרו הכי הרבה?
            </h2>
          </div>
          <div className="admin-bar-list">
            {sortedPages.map((p) => {
              const pct = globalStats.total_page_views
                ? Math.round((p.views / totalPageViews) * 100)
                : 0;
              return (
                <div className="admin-bar-item" key={p.key}>
                  <div className="admin-bar-top">
                    <span>{p.label}</span>
                    <span>
                      <strong>{p.views.toLocaleString()}</strong> צפיות ({pct}%)
                    </span>
                  </div>
                  <div className="admin-bar-track">
                    <div className="admin-bar-fill" style={{ width: `${Math.max(pct, p.views > 0 ? 3 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.35rem', paddingTop: '1rem', borderTop: '1px solid #262626', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.88rem', color: '#d4d4d8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} color="#4ade80" /> נייד (Mobile): <strong>{mobileSessions}</strong> ({mobilePct}%)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Monitor size={16} color="#60a5fa" /> מחשב (Desktop): <strong>{desktopSessions}</strong> ({desktopPct}%)
            </span>
          </div>
        </div>

        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2>
              <History size={18} /> פעילות יומית (14 ימים אחרונים)
            </h2>
          </div>
          {dailyStats.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
              המעקב החי הופעל כעת — נתונים יומיים יופיעו כאן החל מהמבקרים הבאים באתר.
            </p>
          ) : (
            <table className="admin-mini-table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>גולשים</th>
                  <th>צפיות</th>
                  <th>ניווטים</th>
                  <th>באנר</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((d) => (
                  <tr key={d.date}>
                    <td style={{ fontFamily: 'monospace' }}>{d.date}</td>
                    <td>{d.unique_visitors || 0}</td>
                    <td>{d.page_views || 0}</td>
                    <td>{d.nav_clicks || 0}</td>
                    <td>{d.banner_clicks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 3: King Reign Intelligence (Moved from 5-clicks-on-crown) */}
      {activeReign && (
        <div className="admin-section-card">
          <div className="admin-section-header">
            <h2>
              <Crown size={18} /> מודיעין כס המלכות (מעקב מקום #1 הארצי)
            </h2>
          </div>

          <div style={{ background: 'rgba(250, 204, 21, 0.06)', border: '1px solid rgba(250, 204, 21, 0.25)', borderRadius: '10px', padding: '1rem 1.15rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Clock size={19} color="#4ade80" style={{ marginTop: '3px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '1.05rem' }}>
                  <strong>במקום ה-1 כעת:</strong> {activeReign.name} ({activeReign.city})
                </div>
                <div style={{ color: '#4ade80', fontWeight: 700, marginTop: '4px' }}>
                  שולטת ברצף הנוכחי: {formatHebrewDuration(currentStreakSeconds)}
                </div>
                <div style={{ fontSize: '0.83rem', color: '#9ca3af', marginTop: '3px' }}>
                  עלתה למקום ה-1 בתאריך: {formatShortDate(activeReign.started_at)} • ציון שיא בקדנציה: {activeReign.peak_score.toFixed(1)}%
                </div>
              </div>
            </div>

            {currentKingPastReigns.length > 0 ? (
              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '8px', fontSize: '0.9rem' }}>
                <Award size={18} color="#facc15" style={{ flexShrink: 0 }} />
                <div>
                  <strong>היסטוריה קודמת של {activeReign.name}:</strong> הייתה בעבר במקום הראשון במשך{' '}
                  <strong>{formatHebrewDuration(currentKingPastTotalSeconds)}</strong> ({currentKingPastReigns.length} קדנציות קודמות). סה"כ מצטבר בפסגה:{' '}
                  <strong>{formatHebrewDuration(currentKingPastTotalSeconds + currentStreakSeconds)}</strong>.
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '0.7rem', fontSize: '0.86rem', color: '#d4d4d8' }}>
                זוהי הקדנציה הראשונה של <strong>{activeReign.name}</strong> במקום ה-1 הארצי.
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.9rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
            היסטוריית חילופי שלטון במקום ה-1 ({closedReigns.length} קדנציות קודמות):
          </div>
          {closedReigns.length === 0 ? (
            <div style={{ fontSize: '0.86rem', color: '#a1a1aa' }}>
              טרם התרחש מהפך בפסגה מאז נעילת הנתונים הרשמיים — {activeReign.name} מחזיקה בכתר ברציפות.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '8px' }}>
              {closedReigns.map((reign, idx) => {
                const durSec =
                  reign.duration_seconds > 0
                    ? reign.duration_seconds
                    : reign.ended_at
                    ? Math.max(0, Math.floor((new Date(reign.ended_at).getTime() - new Date(reign.started_at).getTime()) / 1000))
                    : 0;
                return (
                  <div
                    key={`${reign.platform_id}_${idx}`}
                    style={{ background: '#1c1c21', padding: '0.7rem 0.95rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.88rem' }}
                  >
                    <span>
                      👑 <strong>{reign.name}</strong> ({reign.city}) — שלטה במשך <strong>{formatHebrewDuration(durSec)}</strong>
                    </span>
                    <span style={{ color: '#9ca3af' }}>
                      {formatShortDate(reign.started_at)} – {formatShortDate(reign.ended_at)} (שיא: {reign.peak_score.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 4: Complete National Ranking Table of All Shawarmas */}
      <div className="admin-section-card">
        <div className="admin-section-header">
          <h2>
            <Trophy size={18} /> הדירוג המלא של כל השווארמיות בישראל ({filteredRestaurants.length} מתוך {allRestaurants.length})
          </h2>
        </div>

        <div className="admin-filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#9ca3af" style={{ position: 'absolute', right: '11px', pointerEvents: 'none' }} />
            <input
              type="text"
              className="admin-search-input"
              style={{ paddingRight: '34px', width: '100%' }}
              placeholder="חפש שווארמיה לפי שם, עיר או כתובת..."
              value={tableQuery}
              onChange={(e) => setTableQuery(e.target.value)}
            />
          </div>

          <select
            className="admin-select"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="all">כל האזורים ({allRestaurants.length})</option>
            <option value="north">צפון</option>
            <option value="center">מרכז</option>
            <option value="sharon">שרון</option>
            <option value="shfela">שפלה</option>
            <option value="south">דרום</option>
          </select>

          <select
            className="admin-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="radar">מיון: ציון המכ"ם (הגבוה ביותר)</option>
            <option value="google_rating">מיון: דירוג גוגל (★)</option>
            <option value="google_reviews">מיון: כמות ביקורות בגוגל</option>
            <option value="wolt">מיון: דירוג Wolt</option>
            <option value="tenbis">מיון: דירוג תן ביס</option>
          </select>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-full-table">
            <thead>
              <tr>
                <th># בארץ</th>
                <th>שם העסק</th>
                <th>עיר וכתובת</th>
                <th>אזור</th>
                <th>ציון מכ"ם</th>
                <th>גוגל (רשמי)</th>
                <th>Wolt</th>
                <th>תן ביס</th>
                <th>סנטימנט</th>
              </tr>
            </thead>
            <tbody>
              {filteredRestaurants.map((r) => {
                const rankNum = r.national_rank || 0;
                return (
                  <tr key={r.id} onClick={() => setSelectedRestaurant(r)} title="לחץ לפתיחת כרטיס ניווט">
                    <td>
                      <span className={`rank-pill ${rankNum <= 3 ? 'top3' : ''}`}>#{rankNum}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#fff' }}>{r.name}</td>
                    <td style={{ color: '#a1a1aa' }}>
                      {r.city}
                      {r.address && r.address !== r.city ? ` • ${r.address}` : ''}
                    </td>
                    <td>{REGION_NAMES_HE[r.region] || r.region}</td>
                    <td>
                      <span className="score-pill">{r.bayesian_average.toFixed(1)}%</span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {r.google_rating ? `${r.google_rating.toFixed(1)}★` : '—'}{' '}
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        ({(r.google_ratings_total || 0).toLocaleString()})
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: r.wolt_rating ? '#38bdf8' : '#52525b' }}>
                      {r.wolt_rating ? `${r.wolt_rating.toFixed(1)}/10` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: r.tenbis_rating ? '#fb923c' : '#52525b' }}>
                      {r.tenbis_rating ? `${r.tenbis_rating.toFixed(1)}/5` : '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#d4d4d8' }}>
                      {r.last_score ? `${r.last_score.toFixed(0)}%` : '50%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <NavigationModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />
    </div>
  );
};

export default AdminDashboard;
