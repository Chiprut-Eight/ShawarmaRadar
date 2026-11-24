import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import localRestaurants from '../data/restaurants_data.json';

// Firebase project configuration for ShawarmaRadar
const firebaseConfig = {
  projectId: "shawarmaradar-app",
  appId: "1:906387185943:web:e37504e8ff2a11602b1752",
  storageBucket: "shawarmaradar-app.firebasestorage.app",
  apiKey: "AIzaSyDrfZXDROUn9AnyOmSB6ZvxeiDuxBpnBF8",
  authDomain: "shawarmaradar-app.firebaseapp.com",
  messagingSenderId: "906387185943",
  projectNumber: "906387185943"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface Restaurant {
  id: number | string;
  name: string;
  city: string;
  region: string;
  bayesian_average: number;
  last_score: number;
  total_reviews: number;
  address?: string;
  lat?: number;
  lng?: number;
  national_rank?: number;
  distance_km?: number;
  google_rating?: number;
  google_ratings_total?: number;
}

export const ISRAEL_CITY_COORDINATES: Record<string, [number, number]> = {
  "תל אביב": [32.0853, 34.7818],
  "חיפה": [32.7940, 34.9896],
  "ירושלים": [31.7683, 35.2137],
  "ראשון לציון": [31.9730, 34.7925],
  "פתח תקווה": [32.0840, 34.8878],
  "באר שבע": [31.2529, 34.7915],
  "נתניה": [32.3215, 34.8532],
  "אשדוד": [31.8044, 34.6553],
  "חולון": [32.0158, 34.7874],
  "בת ים": [32.0197, 34.7500],
  "רמת גן": [32.0684, 34.8248],
  "גבעתיים": [32.0722, 34.8089],
  "בני ברק": [32.0841, 34.8354],
  "אור יהודה": [32.0294, 34.8572],
  "אזור": [32.0242, 34.8053],
  "אשקלון": [31.6688, 34.5743],
  "הרצליה": [32.1663, 34.8432],
  "רעננה": [32.1848, 34.8713],
  "כפר סבא": [32.1782, 34.9076],
  "חדרה": [32.4340, 34.9197],
  "חריש": [32.4589, 35.0489],
  "פרדס חנה-כרכור": [32.4719, 34.9708],
  "כפר יונה": [32.3167, 34.9358],
  "אבן יהודה": [32.2697, 34.8875],
  "בני דרור": [32.2603, 34.8942],
  "משמר השרון": [32.3611, 34.9044],
  "רמת השרון": [32.1469, 34.8394],
  "הוד השרון": [32.1558, 34.8911],
  "קרית אונו": [32.0628, 34.8569],
  "יהוד-מונוסון": [32.0331, 34.8894],
  "ראש העין": [32.0956, 34.9567],
  "רחובות": [31.8928, 34.8113],
  "נס ציונה": [31.9314, 34.7981],
  "יבנה": [31.8763, 34.7397],
  "באר יעקב": [31.9369, 34.8322],
  "לוד": [31.9514, 34.8881],
  "רמלה": [31.9275, 34.8625],
  "מודיעין": [31.8903, 35.0104],
  "נצרת": [32.6996, 35.3035],
  "כפר כנא": [32.7475, 35.3414],
  "דאלית אל-כרמל": [32.6917, 35.0528],
  "עוספיא": [32.7167, 35.0500],
  "שפרעם": [32.8056, 35.1706],
  "סח'נין": [32.8644, 35.3000],
  "טמרה": [32.8536, 35.1986],
  "מע'אר": [32.8889, 35.4056],
  "כפר קאסם": [32.1147, 34.9753],
  "ג'לג'וליה": [32.1544, 34.9519],
  "טירה": [32.2333, 34.9500],
  "טייבה": [32.2667, 35.0167],
  "קלנסווה": [32.2858, 34.9819],
  "באקה אל-ע'רביה": [32.4189, 35.0408],
  "כפר קרע": [32.5025, 35.0567],
  "אום אל-פחם": [32.5186, 35.1536],
  "רהט": [31.3925, 34.7544],
  "מבשרת ציון": [31.8022, 35.1506],
  "אבו גוש": [31.8058, 35.1094],
  "נשר": [32.7700, 35.0394],
  "טירת כרמל": [32.7606, 34.9719],
  "קרית אתא": [32.8064, 35.1053],
  "קרית מוצקין": [32.8372, 35.0778],
  "קרית ביאליק": [32.8364, 35.0869],
  "קרית ים": [32.8492, 35.0697],
  "עכו": [32.9278, 35.0818],
  "נהריה": [33.0059, 35.0941],
  "כרמיאל": [32.9199, 35.2901],
  "עפולה": [32.6074, 35.2891],
  "טבריה": [32.7959, 35.5312],
  "קרית גת": [31.6100, 34.7642],
  "קרית מלאכי": [31.7294, 34.7469],
  "גן יבנה": [31.7903, 34.7047],
  "שדרות": [31.5244, 34.5961],
  "נתיבות": [31.4194, 34.5886],
  "דימונה": [31.0694, 35.0333],
  "אילת": [29.5577, 34.9519]
};

export function getAvailableCities(): { city: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const r of localRestaurants as Restaurant[]) {
    if (r.city) {
      counts[r.city] = (counts[r.city] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => a.city.localeCompare(b.city, 'he'));
}

function getRankedLocalRestaurants(): Restaurant[] {
  const sorted = [...(localRestaurants as Restaurant[])].sort((a, b) => b.bayesian_average - a.bayesian_average);
  return sorted.map((r, idx) => ({
    ...r,
    national_rank: r.national_rank || idx + 1
  }));
}

// Haversine formula to compute distance in kilometers
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 1. Synchronous Instant Bundled Data (0ms latency guaranteed)
export function getBundledNationalRankings(): { king: Restaurant | null; runnersUp: Restaurant[] } {
  const ranked = getRankedLocalRestaurants();
  return {
    king: ranked[0] || null,
    runnersUp: ranked.slice(1, 10)
  };
}

export function getBundledRegionalRankings(regionId: string): Restaurant[] {
  const ranked = getRankedLocalRestaurants();
  const filtered = ranked.filter(r => r.region === regionId);
  return filtered.slice(0, 10);
}

// Near Me Rankings: Top 10 shawarmas (filtered by optional city, sorted by either Closest Distance or National Rank)
export function getNearMeRankings(
  userLat: number,
  userLng: number,
  sortBy: 'distance' | 'national_rank' = 'national_rank',
  filterCity: string = ''
): { results: Restaurant[] } {
  const ranked = getRankedLocalRestaurants();
  const withDist = ranked.map(r => {
    const fallbackCoords = ISRAEL_CITY_COORDINATES[r.city] || [32.0853, 34.7818];
    const rLat = r.lat ?? fallbackCoords[0];
    const rLng = r.lng ?? fallbackCoords[1];
    const dist = calculateDistanceKm(userLat, userLng, rLat, rLng);
    return {
      ...r,
      lat: rLat,
      lng: rLng,
      distance_km: dist
    };
  });

  // 1. Determine candidate pool: either strictly within the chosen city, or the nearby pool around the user
  let candidatePool: Restaurant[];
  if (filterCity) {
    candidatePool = withDist.filter(r => r.city === filterCity);
  } else {
    // Take shawarmas within 10km radius around user (or at least the 10 closest shawarmas if <10 exist within 10km)
    const within10Km = withDist.filter(r => (r.distance_km ?? 999) <= 10);
    if (within10Km.length >= 10 && sortBy === 'national_rank') {
      candidatePool = within10Km;
    } else {
      candidatePool = [...withDist]
        .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
        .slice(0, 10);
    }
  }

  // 2. Sort the candidate pool according to user's selected sort mode
  if (sortBy === 'distance') {
    const sortedByDist = [...candidatePool]
      .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999))
      .slice(0, 10);
    return { results: sortedByDist };
  }

  // sortBy === 'national_rank' (highest radar score / lowest national_rank number first)
  const sortedByNationalRank = [...candidatePool]
    .sort((a, b) => {
      const rankA = a.national_rank ?? 9999;
      const rankB = b.national_rank ?? 9999;
      if (rankA !== rankB) return rankA - rankB;
      return (a.distance_km ?? 999) - (b.distance_km ?? 999);
    })
    .slice(0, 10);

  return { results: sortedByNationalRank };
}

// Helper: Timeout promise
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
  ]);
};

// 2. Asynchronous Live Rankings (with fast 1.5s fallback)
export async function getNationalRankings(): Promise<{ king: Restaurant | null; runnersUp: Restaurant[] }> {
  try {
    const q = query(
      collection(db, 'restaurants'),
      orderBy('bayesian_average', 'desc'),
      limit(10)
    );
    const snap = await withTimeout(getDocs(q), 1500);
    if (!snap.empty) {
      const items: Restaurant[] = snap.docs.map((doc, i) => ({ id: doc.id, national_rank: i + 1, ...doc.data() } as Restaurant));
      return { king: items[0], runnersUp: items.slice(1) };
    }
  } catch {
    // Graceful silent fallback to bundled data
  }

  return getBundledNationalRankings();
}

// 3. Asynchronous Regional Rankings (with fast 1.5s fallback)
export async function getRegionalRankings(regionId: string): Promise<Restaurant[]> {
  try {
    const q = query(
      collection(db, 'restaurants'),
      where('region', '==', regionId),
      orderBy('bayesian_average', 'desc'),
      limit(10)
    );
    const snap = await withTimeout(getDocs(q), 1500);
    if (!snap.empty) {
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
    }
  } catch {
    // Graceful silent fallback to bundled data
  }

  return getBundledRegionalRankings(regionId);
}

// 4. Search Restaurant (returns matching restaurant objects so user can click & navigate to any of the 222 places)
export function searchRestaurantLocal(queryStr: string): { exists: boolean; name?: string; matches: Restaurant[] } {
  if (!queryStr || queryStr.trim().length < 2) return { exists: false, matches: [] };
  const clean = queryStr.trim().toLowerCase();
  const ranked = getRankedLocalRestaurants();

  const matches = ranked.filter(r =>
    r.name.toLowerCase().includes(clean) ||
    clean.includes(r.name.toLowerCase()) ||
    r.city.toLowerCase().includes(clean) ||
    (r.address && r.address.toLowerCase().includes(clean))
  ).slice(0, 8);

  if (matches.length > 0) {
    return { exists: true, name: matches[0].name, matches };
  }
  return { exists: false, matches: [] };
}
