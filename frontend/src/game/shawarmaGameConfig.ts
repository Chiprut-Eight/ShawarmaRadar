export type DishId = 'laffa' | 'pita' | 'half';

export type PlayerGender = 'male' | 'female';

export type GamePhase = 'intro' | 'playing' | 'results';

export type DishGrade = 'bullseye' | 'great' | 'close' | 'miss';

export interface DishConfig {
  id: DishId;
  targetGrams: number;
  maxCapGrams: number;
  labelHe: string;
  labelEn: string;
  shortDescHe: string;
  shortDescEn: string;
}

export const DISH_CONFIGS: readonly DishConfig[] = [
  {
    id: 'laffa',
    targetGrams: 280,
    maxCapGrams: 480,
    labelHe: 'לאפה',
    labelEn: 'Laffa Wrap',
    shortDescHe: 'לאפה מגולגלת עמוסה בכל טוב',
    shortDescEn: 'Hearty toasted flatbread wrap',
  },
  {
    id: 'pita',
    targetGrams: 180,
    maxCapGrams: 340,
    labelHe: 'מנה בפיתה',
    labelEn: 'Pita Portion',
    shortDescHe: 'פיתה חמה ומפנקת ישר מהשיפוד',
    shortDescEn: 'Classic full Israeli pita pocket',
  },
  {
    id: 'half',
    targetGrams: 80,
    maxCapGrams: 200,
    labelHe: 'חצי מנה',
    labelEn: 'Half Pita',
    shortDescHe: 'חצי פיתה מדויקת לנשנוש מושלם',
    shortDescEn: 'Precision half-pita snack',
  },
] as const;

export const DISH_MAP: Record<DishId, DishConfig> = {
  laffa: DISH_CONFIGS[0],
  pita: DISH_CONFIGS[1],
  half: DISH_CONFIGS[2],
};

export const ROUND_DURATION_SEC = 30;
export const SLICE_RATE_GPS = 45;
export const BULLSEYE_TOLERANCE_G = 5;

export function createEmptyWeights(): Record<DishId, number> {
  return {
    laffa: 0,
    pita: 0,
    half: 0,
  };
}

export interface DishEvaluation {
  dishId: DishId;
  labelHe: string;
  labelEn: string;
  targetGrams: number;
  maxCapGrams: number;
  actualGrams: number;
  diffGrams: number;
  absDiff: number;
  accuracy: number;
  grade: DishGrade;
}

export interface VictoryRank {
  titleHe: string;
  titleEn: string;
  subtitleHe: string;
  subtitleEn: string;
  emoji: string;
  accentColor: string;
  celebrate: boolean;
}

export interface RoundEvaluation {
  dishes: DishEvaluation[];
  overallAccuracy: number;
  totalActualGrams: number;
  totalTargetGrams: number;
  rank: VictoryRank;
}

export function evaluateDish(dishId: DishId, rawGrams: number): DishEvaluation {
  const config = DISH_MAP[dishId];
  const actualGrams = Math.round(Math.max(0, rawGrams));
  const diffGrams = actualGrams - config.targetGrams;
  const absDiff = Math.abs(diffGrams);
  const accuracy = Math.max(0, Math.round((1 - absDiff / config.targetGrams) * 100));

  let grade: DishGrade = 'miss';
  if (absDiff <= BULLSEYE_TOLERANCE_G) {
    grade = 'bullseye';
  } else if (accuracy >= 85) {
    grade = 'great';
  } else if (accuracy >= 65) {
    grade = 'close';
  }

  return {
    dishId,
    labelHe: config.labelHe,
    labelEn: config.labelEn,
    targetGrams: config.targetGrams,
    maxCapGrams: config.maxCapGrams,
    actualGrams,
    diffGrams,
    absDiff,
    accuracy,
    grade,
  };
}

export function getRoleLabelHe(gender: PlayerGender | null): string {
  if (gender === 'male') return 'שווארמולוג';
  if (gender === 'female') return 'שווארמולוגית';
  return 'שווארמולוגים';
}

export function getRankForScore(
  score: number,
  gender: PlayerGender = 'male'
): VictoryRank {
  const isFemale = gender === 'female';

  if (score >= 95) {
    return {
      titleHe: isFemale
        ? 'שווארמולוגית על בלתי מעורערת! 👑'
        : 'שווארמולוג על בלתי מעורער! 👑',
      titleEn: 'Undisputed Shawarmologist Legend! 👑',
      subtitleHe: isFemale
        ? 'עין של לייזר ויד של מנתחת — המנות שלך מוכנות לשיפוד הזהב!'
        : 'עין של לייזר ויד של מנתח — המנות שלך מוכנות לשיפוד הזהב!',
      subtitleEn: 'Laser eyes and surgical precision — worthy of the Golden Spit!',
      emoji: '👑',
      accentColor: '#facc15',
      celebrate: true,
    };
  }
  if (score >= 85) {
    return {
      titleHe: isFemale ? 'שווארמולוגית אמיתית! 🔥' : 'שווארמולוג אמיתי! 🔥',
      titleEn: 'True Shawarmologist! 🔥',
      subtitleHe: 'שליטה מדהימה בסכין החשמלית — השווארמיה מחכה לך!',
      subtitleEn: 'Incredible electric-knife control — ready for the counter!',
      emoji: '🔥',
      accentColor: '#4ade80',
      celebrate: true,
    };
  }
  if (score >= 72) {
    return {
      titleHe: isFemale ? 'שווארמולוגית מקצוענית! 🔪' : 'שווארמולוג מקצוען! 🔪',
      titleEn: 'Pro Shawarmologist! 🔪',
      subtitleHe: 'ידיים יציבות ומנות שבא לתת בהן ביס ענק!',
      subtitleEn: 'Steady hands and portions ready to devour!',
      emoji: '🔪',
      accentColor: '#fbbf24',
      celebrate: true,
    };
  }
  if (score >= 55) {
    return {
      titleHe: isFemale ? 'שווארמולוגית בהתהוות 🥙' : 'שווארמולוג בהתהוות 🥙',
      titleEn: 'Shawarmologist in Training 🥙',
      subtitleHe: isFemale
        ? 'עוד סיבוב אחד על הגלגל ואת כבר מפנקת את השכונה!'
        : 'עוד סיבוב אחד על הגלגל ואתה כבר מפנק את השכונה!',
      subtitleEn: 'One more round on the spit and you will rule the block!',
      emoji: '🥙',
      accentColor: '#fb923c',
      celebrate: false,
    };
  }
  return {
    titleHe: 'הסכין ברחה קצת... 😅',
    titleEn: 'The Knife Got Away... 😅',
    subtitleHe: isFemale
      ? 'או שהלאפה נשארה ריקה מדי או שהעמסת חצי גלגל — תני עוד ניסיון!'
      : 'או שהלאפה נשארה ריקה מדי או שהעמסת חצי גלגל — תן עוד ניסיון!',
    subtitleEn: 'Either too light or half a spit — give it another slice!',
    emoji: '😅',
    accentColor: '#f87171',
    celebrate: false,
  };
}

export function evaluateRound(
  weights: Record<DishId, number>,
  gender: PlayerGender = 'male'
): RoundEvaluation {
  const dishes = DISH_CONFIGS.map((cfg) => evaluateDish(cfg.id, weights[cfg.id] || 0));
  const overallAccuracy = Math.round(
    dishes.reduce((sum, item) => sum + item.accuracy, 0) / dishes.length
  );
  const totalActualGrams = dishes.reduce((sum, item) => sum + item.actualGrams, 0);
  const totalTargetGrams = dishes.reduce((sum, item) => sum + item.targetGrams, 0);

  return {
    dishes,
    overallAccuracy,
    totalActualGrams,
    totalTargetGrams,
    rank: getRankForScore(overallAccuracy, gender),
  };
}

const PLAYER_NAME_KEY = 'sr_shawarma_game_name_v1';
const PLAYER_GENDER_KEY = 'sr_shawarma_game_gender_v1';
const PERSONAL_BEST_KEY = 'sr_shawarma_game_best_v1';

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim());
  } catch {
    // ignore storage errors
  }
}

export function getSavedPlayerGender(): PlayerGender | null {
  try {
    const val = localStorage.getItem(PLAYER_GENDER_KEY);
    return val === 'male' || val === 'female' ? val : null;
  } catch {
    return null;
  }
}

export function savePlayerGender(gender: PlayerGender): void {
  try {
    localStorage.setItem(PLAYER_GENDER_KEY, gender);
  } catch {
    // ignore storage errors
  }
}

export function getPersonalBest(): number | null {
  try {
    const raw = localStorage.getItem(PERSONAL_BEST_KEY);
    if (!raw) return null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
}

export function savePersonalBestIfHigher(score: number): boolean {
  try {
    const current = getPersonalBest();
    if (current === null || score > current) {
      localStorage.setItem(PERSONAL_BEST_KEY, String(score));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
