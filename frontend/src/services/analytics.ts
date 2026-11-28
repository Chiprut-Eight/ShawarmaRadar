import {
  doc,
  collection,
  setDoc,
  getDocs,
  onSnapshot,
  increment,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

const VISITOR_KEY = 'sr_visitor_uid_v1';
const VISITOR_COUNTED_KEY = 'sr_visitor_counted_v1';
const SESSION_KEY = 'sr_session_uid_v1';
const SESSION_COUNTED_KEY = 'sr_session_counted_v1';
const DAILY_VISITOR_PREFIX = 'sr_daily_v_';

export interface GlobalStatsDoc {
  unique_visitors?: number;
  total_sessions?: number;
  total_page_views?: number;
  total_duration_seconds?: number;
  duration_sessions?: number;
  banner_clicks?: number;
  nav_clicks?: number;
  nav_waze_clicks?: number;
  nav_gmaps_clicks?: number;
  searches?: number;
  game_starts?: number;
  game_completions?: number;
  game_shares?: number;
  pages?: Record<string, number>;
  devices?: Record<string, number>;
  banners?: Record<string, number>;
  first_tracked_at?: string;
}

export interface DailyStatsDoc {
  date: string;
  unique_visitors?: number;
  sessions?: number;
  page_views?: number;
  banner_clicks?: number;
  nav_clicks?: number;
  searches?: number;
  game_starts?: number;
  game_completions?: number;
  game_shares?: number;
}

export interface PresenceDoc {
  session_id: string;
  last_seen_ms: number;
  page: string;
  device: 'mobile' | 'desktop';
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? 'mobile'
    : 'desktop';
}

export function normalizePageKey(pathname: string): string {
  if (!pathname || pathname === '/') return 'home';
  if (pathname.startsWith('/near-me')) return 'near_me';
  if (pathname.startsWith('/region/north')) return 'region_north';
  if (pathname.startsWith('/region/center')) return 'region_center';
  if (pathname.startsWith('/region/south')) return 'region_south';
  if (pathname.startsWith('/region/sharon')) return 'region_sharon';
  if (pathname.startsWith('/region/shfela')) return 'region_shfela';
  if (pathname.startsWith('/play')) return 'play';
  return 'other';
}

export const PAGE_LABELS_HE: Record<string, string> = {
  home: 'המלך הארצי (דף הבית)',
  near_me: '📍 קרוב אלי',
  region_north: 'אזור צפון',
  region_center: 'אזור מרכז',
  region_sharon: 'אזור השרון',
  region_shfela: 'אזור השפלה',
  region_south: 'אזור דרום',
  play: '🔪 הכינו מנות עכשיו',
  other: 'אחר',
};

function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = generateId();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return generateId();
  }
}

let currentTrackedPage = 'home';
let activeStartMs = Date.now();
let flushedDurationOnce = false;
let lifecycleInitialized = false;

export async function updatePresence(pageKey: string): Promise<void> {
  try {
    const sid = getOrCreateSessionId();
    const presenceRef = doc(db, 'analytics_presence', sid);
    await setDoc(
      presenceRef,
      {
        last_seen_ms: Date.now(),
        page: pageKey,
        device: getDeviceType(),
      },
      { merge: true }
    );
  } catch {
    // Silent fail so UI is never affected
  }
}

export async function trackPageView(pathname: string): Promise<void> {
  if (pathname.startsWith('/admin')) return;

  const pageKey = normalizePageKey(pathname);
  currentTrackedPage = pageKey;
  const today = getTodayIso();
  const device = getDeviceType();

  let isNewVisitor = false;
  let isNewSession = false;
  let isNewDailyVisitor = false;

  try {
    if (!localStorage.getItem(VISITOR_KEY)) {
      localStorage.setItem(VISITOR_KEY, generateId());
    }
    if (localStorage.getItem(VISITOR_COUNTED_KEY) !== '1') {
      isNewVisitor = true;
      localStorage.setItem(VISITOR_COUNTED_KEY, '1');
    }
    const dailyKey = `${DAILY_VISITOR_PREFIX}${today}`;
    if (localStorage.getItem(dailyKey) !== '1') {
      isNewDailyVisitor = true;
      localStorage.setItem(dailyKey, '1');
    }
  } catch {
    // ignore storage restrictions
  }

  try {
    getOrCreateSessionId();
    if (sessionStorage.getItem(SESSION_COUNTED_KEY) !== '1') {
      isNewSession = true;
      sessionStorage.setItem(SESSION_COUNTED_KEY, '1');
    }
  } catch {
    // ignore
  }

  try {
    const globalRef = doc(db, 'analytics', 'global_stats');
    const globalPayload: Record<string, unknown> = {
      total_page_views: increment(1),
      pages: { [pageKey]: increment(1) },
    };
    if (isNewVisitor) {
      globalPayload.unique_visitors = increment(1);
    }
    if (isNewSession) {
      globalPayload.total_sessions = increment(1);
      globalPayload.devices = { [device]: increment(1) };
    }
    await setDoc(globalRef, globalPayload, { merge: true });

    const dailyRef = doc(db, 'analytics_daily', today);
    const dailyPayload: Record<string, unknown> = {
      date: today,
      page_views: increment(1),
    };
    if (isNewDailyVisitor) {
      dailyPayload.unique_visitors = increment(1);
    }
    if (isNewSession) {
      dailyPayload.sessions = increment(1);
    }
    await setDoc(dailyRef, dailyPayload, { merge: true });

    await updatePresence(pageKey);
  } catch {
    // Silent fail
  }
}

async function flushForegroundDuration(): Promise<void> {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;
  const now = Date.now();
  const elapsedSec = Math.round((now - activeStartMs) / 1000);
  activeStartMs = now;

  // Only record meaningful foreground stays (between 3 seconds and 45 minutes)
  if (elapsedSec < 3 || elapsedSec > 2700) return;

  try {
    const globalRef = doc(db, 'analytics', 'global_stats');
    const payload: Record<string, unknown> = {
      total_duration_seconds: increment(elapsedSec),
    };
    if (!flushedDurationOnce) {
      payload.duration_sessions = increment(1);
      flushedDurationOnce = true;
    }
    await setDoc(globalRef, payload, { merge: true });
  } catch {
    // ignore
  }
}

export function initAnalyticsLifecycle(): void {
  if (lifecycleInitialized || typeof window === 'undefined') return;
  lifecycleInitialized = true;
  activeStartMs = Date.now();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushForegroundDuration();
    } else if (document.visibilityState === 'visible') {
      activeStartMs = Date.now();
      if (!window.location.pathname.startsWith('/admin')) {
        void updatePresence(currentTrackedPage);
      }
    }
  });

  window.addEventListener('pagehide', () => {
    void flushForegroundDuration();
  });

  // Lightweight presence heartbeat every 90s ONLY while tab is visible and not on /admin
  window.setInterval(() => {
    if (
      document.visibilityState === 'visible' &&
      !window.location.pathname.startsWith('/admin')
    ) {
      void updatePresence(currentTrackedPage);
    }
  }, 90_000);
}

export async function trackUserAction(
  action:
    | 'banner_click'
    | 'nav_waze'
    | 'nav_gmaps'
    | 'search'
    | 'game_start'
    | 'game_complete'
    | 'game_share',
  bannerKey?: string
): Promise<void> {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) return;
  const today = getTodayIso();
  try {
    const globalRef = doc(db, 'analytics', 'global_stats');
    const dailyRef = doc(db, 'analytics_daily', today);

    if (action === 'banner_click') {
      const safeKey = (bannerKey || 'default').replace(/[./[\]#$]/g, '_');
      await setDoc(
        globalRef,
        {
          banner_clicks: increment(1),
          banners: { [safeKey]: increment(1) },
        },
        { merge: true }
      );
      await setDoc(dailyRef, { date: today, banner_clicks: increment(1) }, { merge: true });
    } else if (action === 'nav_waze' || action === 'nav_gmaps') {
      await setDoc(
        globalRef,
        {
          nav_clicks: increment(1),
          [action === 'nav_waze' ? 'nav_waze_clicks' : 'nav_gmaps_clicks']: increment(1),
        },
        { merge: true }
      );
      await setDoc(dailyRef, { date: today, nav_clicks: increment(1) }, { merge: true });
    } else if (action === 'search') {
      await setDoc(globalRef, { searches: increment(1) }, { merge: true });
      await setDoc(dailyRef, { date: today, searches: increment(1) }, { merge: true });
    } else if (action === 'game_start') {
      await setDoc(globalRef, { game_starts: increment(1) }, { merge: true });
      await setDoc(dailyRef, { date: today, game_starts: increment(1) }, { merge: true });
    } else if (action === 'game_complete') {
      await setDoc(globalRef, { game_completions: increment(1) }, { merge: true });
      await setDoc(dailyRef, { date: today, game_completions: increment(1) }, { merge: true });
    } else if (action === 'game_share') {
      await setDoc(globalRef, { game_shares: increment(1) }, { merge: true });
      await setDoc(dailyRef, { date: today, game_shares: increment(1) }, { merge: true });
    }
  } catch {
    // ignore
  }
}

export async function fetchRecentDailyStats(daysLimit = 14): Promise<DailyStatsDoc[]> {
  try {
    const q = query(collection(db, 'analytics_daily'), orderBy('date', 'desc'), limit(daysLimit));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ date: d.id, ...(d.data() as Omit<DailyStatsDoc, 'date'>) }));
  } catch {
    return [];
  }
}

export function subscribeLiveAdminAnalytics(
  onGlobal: (stats: GlobalStatsDoc) => void,
  onPresence: (activeSessions: PresenceDoc[]) => void
): () => void {
  const unsubGlobal = onSnapshot(
    doc(db, 'analytics', 'global_stats'),
    (snap) => {
      onGlobal((snap.data() as GlobalStatsDoc) || {});
    },
    () => {
      onGlobal({});
    }
  );

  const unsubPresence = onSnapshot(
    collection(db, 'analytics_presence'),
    (snap) => {
      const cutoff = Date.now() - 3 * 60 * 1000; // Active in the last 3 minutes
      const active: PresenceDoc[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const ts = Number(d.last_seen_ms || 0);
        if (ts >= cutoff) {
          active.push({
            session_id: docSnap.id,
            last_seen_ms: ts,
            page: String(d.page || 'home'),
            device: d.device === 'mobile' ? 'mobile' : 'desktop',
          });
        }
      });
      onPresence(active);
    },
    () => {
      onPresence([]);
    }
  );

  return () => {
    unsubGlobal();
    unsubPresence();
  };
}
