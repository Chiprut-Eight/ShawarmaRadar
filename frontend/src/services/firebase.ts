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
  google_rating?: number;
  google_ratings_total?: number;
}

// 1. National Rankings (King + Top 9 Runners up)
export async function getNationalRankings(): Promise<{ king: Restaurant | null; runnersUp: Restaurant[] }> {
  try {
    const q = query(
      collection(db, 'restaurants'),
      orderBy('bayesian_average', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const items: Restaurant[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
      return { king: items[0], runnersUp: items.slice(1) };
    }
  } catch (err) {
    console.warn('Firestore fetch error, using bundled dataset:', err);
  }

  // Fallback from bundled JSON
  const sorted = [...(localRestaurants as Restaurant[])].sort((a, b) => b.bayesian_average - a.bayesian_average);
  return {
    king: sorted[0] || null,
    runnersUp: sorted.slice(1, 10)
  };
}

// 2. Regional Rankings (Top 10 in a region)
export async function getRegionalRankings(regionId: string): Promise<Restaurant[]> {
  try {
    const q = query(
      collection(db, 'restaurants'),
      where('region', '==', regionId),
      orderBy('bayesian_average', 'desc'),
      limit(10)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
    }
  } catch (err) {
    console.warn(`Firestore regional fetch error for ${regionId}, using bundled dataset:`, err);
  }

  // Fallback from bundled JSON
  const filtered = (localRestaurants as Restaurant[])
    .filter(r => r.region === regionId)
    .sort((a, b) => b.bayesian_average - a.bayesian_average);
  return filtered.slice(0, 10);
}

// 3. Search Restaurant
export function searchRestaurantLocal(queryStr: string): { exists: boolean; name?: string } {
  if (!queryStr || queryStr.trim().length < 2) return { exists: false };
  const clean = queryStr.trim().toLowerCase();
  
  const found = (localRestaurants as Restaurant[]).find(r => 
    r.name.toLowerCase().includes(clean) || clean.includes(r.name.toLowerCase())
  );
  
  if (found) {
    return { exists: true, name: found.name };
  }
  return { exists: false };
}
