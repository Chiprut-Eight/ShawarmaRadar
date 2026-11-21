import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Home.css';
import { Crown, Lock, History, Clock, Award } from 'lucide-react';
import { getNationalRankings, getBundledNationalRankings, type Restaurant } from '../services/firebase';
import kingHistoryData from '../data/king_history.json';

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

const OWNER_STORAGE_KEY = 'shawarma_radar_owner_mode';

function formatHebrewDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const totalDays = Math.floor(safeSeconds / 86400);
  const hours = Math.max(1, Math.floor((safeSeconds % 86400) / 3600));

  if (totalDays === 0) {
    return `היום הראשון (${hours} שעות בפסגה)`;
  }
  if (totalDays === 1) {
    return 'יום אחד';
  }
  if (totalDays === 2) {
    return 'יומיים';
  }
  if (totalDays < 7) {
    return `${totalDays} ימים`;
  }
  if (totalDays < 30) {
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;
    const weekLabel = weeks === 1 ? 'שבוע אחד' : weeks === 2 ? 'שבועיים' : `${weeks} שבועות`;
    if (remDays === 0) {
      return `${totalDays} ימים (${weekLabel})`;
    }
    return `${totalDays} ימים (${weekLabel} ו-${remDays} ימים)`;
  }

  const months = Math.floor(totalDays / 30);
  const remDays = totalDays % 30;
  const approxWeeks = Math.round(totalDays / 7);
  const monthLabel = months === 1 ? 'חודש' : months === 2 ? 'חודשיים' : `${months} חודשים`;

  if (remDays === 0) {
    return `${totalDays} ימים (${monthLabel} / כ-${approxWeeks} שבועות)`;
  }
  return `${totalDays} ימים (${monthLabel} ו-${remDays} ימים / כ-${approxWeeks} שבועות)`;
}

function formatShortDate(isoStr: string | null): string {
  if (!isoStr) return 'כעת';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const initial = getBundledNationalRankings();
  const [nationalKing, setNationalKing] = useState<Restaurant | null>(initial.king);
  const [runnersUp, setRunnersUp] = useState<Restaurant[]>(initial.runnersUp);
  
  // Real-time clock for the header
  const [time, setTime] = useState(new Date());

  // Secret Owner Mode (visible ONLY to Gal)
  const [isOwnerMode, setIsOwnerMode] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('owner') === '1' || params.get('admin') === '1') {
        localStorage.setItem(OWNER_STORAGE_KEY, 'true');
        window.history.replaceState({}, '', window.location.pathname);
        return true;
      }
      if (params.get('owner') === '0' || params.get('admin') === '0') {
        localStorage.removeItem(OWNER_STORAGE_KEY);
        window.history.replaceState({}, '', window.location.pathname);
        return false;
      }
      return localStorage.getItem(OWNER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const crownClicksRef = useRef<{ count: number; lastClick: number }>({ count: 0, lastClick: 0 });

  const handleSecretCrownClick = () => {
    const nowMs = Date.now();
    if (nowMs - crownClicksRef.current.lastClick > 2500) {
      crownClicksRef.current.count = 1;
    } else {
      crownClicksRef.current.count += 1;
    }
    crownClicksRef.current.lastClick = nowMs;

    if (crownClicksRef.current.count >= 5) {
      crownClicksRef.current.count = 0;
      const nextState = !isOwnerMode;
      setIsOwnerMode(nextState);
      try {
        if (nextState) {
          localStorage.setItem(OWNER_STORAGE_KEY, 'true');
        } else {
          localStorage.removeItem(OWNER_STORAGE_KEY);
        }
      } catch {
        // ignore storage errors
      }
    }
  };

  const hideOwnerMode = () => {
    setIsOwnerMode(false);
    try {
      localStorage.removeItem(OWNER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const fetchData = async () => {
    try {
      const rankData = await getNationalRankings();
      if (rankData.king) {
        setNationalKing(rankData.king);
        setRunnersUp(rankData.runnersUp || []);
      }
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 60000);
    const clockInterval = setInterval(() => setTime(new Date()), 1000);
    
    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const formatDate = (date: Date) => {
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    return date.toTimeString().split(' ')[0];
  };

  // Compute Reign Stats for Owner Panel
  const reigns: ReignRecord[] = (kingHistoryData?.reigns as ReignRecord[]) || [];
  const activeReign: ReignRecord | null = reigns.length > 0 ? reigns[reigns.length - 1] : null;
  const closedReigns: ReignRecord[] = reigns.length > 1 ? reigns.slice(0, -1).reverse() : [];

  const currentStreakSeconds = activeReign
    ? Math.max(0, Math.floor((time.getTime() - new Date(activeReign.started_at).getTime()) / 1000))
    : 0;

  // Check if the current King also held #1 in earlier closed reigns
  const currentKingPastReigns = activeReign
    ? closedReigns.filter(
        r =>
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

  return (
    <div className="home-container" dir={i18n.language === 'he' ? 'rtl' : 'ltr'}>
      {/* King Radar Section (Top) */}
      <div className="king-radar-container" style={{position: 'relative'}}>
        
        <h2 className="king-radar-title">{t('home_king_title')}</h2>
        <div className="king-radar-time">
          {formatTime(time)} • {formatDate(time)}
        </div>
        
        {nationalKing ? (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div
              onClick={handleSecretCrownClick}
              style={{ zIndex: 3, cursor: 'pointer', userSelect: 'none' }}
              title=""
            >
              <Crown size={48} color="#facc15" />
            </div>
            <div className="king-radar-name">{nationalKing.name}</div>
            {nationalKing.address && nationalKing.address !== nationalKing.city ? (
               <div className="king-radar-address">{nationalKing.city} • {nationalKing.address}</div>
            ) : (
               <div className="king-radar-address">{nationalKing.city}</div>
            )}
            <div className="king-radar-score">{nationalKing.bayesian_average.toFixed(1)}%</div>
          </div>
        ) : (
          <div className="radar-display">
            <div className="radar-sweep"></div>
            <div>{t('no_data')}</div>
          </div>
        )}

        {/* Private Owner-Only Reign Tracker Panel */}
        {isOwnerMode && activeReign && (
          <div className="owner-reign-panel" dir="rtl">
            <div className="owner-reign-header">
              <div className="owner-reign-badge">
                <Crown size={18} color="#facc15" />
                <span>מודיעין כס המלכות (תצוגת מנהל פרטית)</span>
              </div>
              <button className="owner-hide-btn" onClick={hideOwnerMode} title="הסתר תצוגת מנהל">
                <Lock size={14} /> הסתר
              </button>
            </div>

            <div className="owner-current-king-box">
              <div className="owner-stat-row">
                <Clock size={18} color="#4ade80" />
                <div>
                  <strong>במקום ה-1 כעת:</strong> {activeReign.name} ({activeReign.city})
                  <div className="owner-duration-highlight">
                    שולטת ברצף הנוכחי: <span>{formatHebrewDuration(currentStreakSeconds)}</span>
                  </div>
                  <div className="owner-date-sub">
                    עלתה למקום ה-1 בתאריך: {formatShortDate(activeReign.started_at)} • ציון שיא בקדנציה: {activeReign.peak_score.toFixed(1)}%
                  </div>
                </div>
              </div>

              {currentKingPastReigns.length > 0 ? (
                <div className="owner-past-summary-box">
                  <Award size={18} color="#facc15" />
                  <div>
                    <strong>חזרה לפסגה! היסטוריה קודמת של {activeReign.name}:</strong>
                    <div>
                      הייתה בעבר במקום הראשון במשך <strong>{formatHebrewDuration(currentKingPastTotalSeconds)}</strong> ({currentKingPastReigns.length} קדנציות קודמות), וכרגע היא כבר <strong>{formatHebrewDuration(currentStreakSeconds)}</strong> במקום הראשון.
                    </div>
                    <div className="owner-date-sub">
                      סה"כ זמן מצטבר בפסגה אי פעם: {formatHebrewDuration(currentKingPastTotalSeconds + currentStreakSeconds)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="owner-first-reign-note">
                  זוהי הקדנציה הראשונה של <strong>{activeReign.name}</strong> במקום ה-1 הארצי.
                </div>
              )}
            </div>

            <div className="owner-history-section">
              <div className="owner-history-title">
                <History size={16} color="#9ca3af" />
                <span>היסטוריית חילופי שלטון במקום ה-1 ({closedReigns.length} קדנציות קודמות)</span>
              </div>
              {closedReigns.length === 0 ? (
                <div className="owner-history-empty">
                  טרם התרחש מהפך בפסגה מאז הפעלת המעקב — {activeReign.name} מחזיקה בכתר ברציפות.
                </div>
              ) : (
                <div className="owner-history-list">
                  {closedReigns.map((reign, i) => {
                    const durSec =
                      reign.duration_seconds > 0
                        ? reign.duration_seconds
                        : reign.ended_at
                        ? Math.max(0, Math.floor((new Date(reign.ended_at).getTime() - new Date(reign.started_at).getTime()) / 1000))
                        : 0;
                    return (
                      <div className="owner-history-item" key={`${reign.platform_id}_${i}`}>
                        <div className="owner-history-name">
                          👑 <strong>{reign.name}</strong> ({reign.city})
                        </div>
                        <div className="owner-history-details">
                          הייתה במקום ה-1 במשך <strong>{formatHebrewDuration(durSec)}</strong>
                        </div>
                        <div className="owner-date-sub">
                          {formatShortDate(reign.started_at)} – {formatShortDate(reign.ended_at)} (שיא: {reign.peak_score.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="signals-panel">
        <h2 className="signals-section-title">{t('home_runners_title')}</h2>
          
          {/* Runners Up Data Signals */}
          {runnersUp.map((place, idx) => (
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
          
          {!nationalKing && runnersUp.length === 0 && (
             <div style={{color: '#888', textAlign: 'center', padding: '2rem'}}>{t('no_data')}</div>
          )}
        </div>
    </div>
  );
};

export default Home;
