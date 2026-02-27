import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
const resources = {
  he: {
    translation: {
      "app_name": "מכ\"ם השווארמה",
      "toggle_lang": "English",
      "national_king": "המלך הארצי",
      "region_north": "צפון",
      "region_center": "מרכז",
      "region_south": "דרום",
      "region_sharon": "שרון",
      "region_shfela": "שפלה",
      "tension_meter": "מד מתח",
      "loading": "טוען נתונים...",
      "score": "ציון מצטבר",
      "legend_title": "אגדת נתונים",
      "legend_radar_title": "ציון המכ\"ם (0-100):",
      "legend_radar_desc": "ציון משוקלל המבוסס על \"ממוצע בייסיאני\". הציון מחבר בין הסנטימנט הכללי של הביקורות לבין כמות הביקורות, מה שאומר שמקומות עם מעט מדי מידע לא יוכלו להטות את המערכת.",
      "legend_ai_title": "עיבוד שפה טבעית (AI):",
      "legend_ai_desc": "כל ביקורת מנותחת ע\"י מודל שפה של OpenAI המכיר את הסלנג הישראלי (כגון \"פצצה\" או \"על הפנים\") כדי להחליט על חיוביות הטקסט.",
      "legend_tension_desc": "מד המתח מעניק משקל יתר לפעילות מה-24 שעות האחרונות (Recency Decay factor). ככל שהרשת סוערת יותר סביב המיקום כרגע - המדד יעלה לכיוון האזור האדום. מטרתנו לזהות שינויים פתאומיים באיכות המקום.",
      "live_feed_title": "Live Intel Feed",
      "scan_national": "סורק אחר המלך הארצי...",
      "no_data": "לא נמצאו נתונים.",
      "based_on_reports": "מבוסס על {{count}} דיווחי שטח",
      "awaiting_transmissions": "[SYSTEM] ממתין לשידורים חדשים..."
    }
  },
  en: {
    translation: {
      "app_name": "ShawarmaRadar",
      "toggle_lang": "עברית",
      "national_king": "National King",
      "region_north": "North",
      "region_center": "Center",
      "region_south": "South",
      "region_sharon": "Sharon",
      "region_shfela": "Shfela",
      "tension_meter": "Tension Meter",
      "loading": "Loading data...",
      "score": "Overall Score",
      "legend_title": "Data Legend",
      "legend_radar_title": "Radar Score (0-100):",
      "legend_radar_desc": "A weighted score based on a Bayesian average. It balances the sentiment of the reviews with the volume of reviews, preventing places with very few reviews from skewing the system.",
      "legend_ai_title": "Natural Language Processing (AI):",
      "legend_ai_desc": "Each review is analyzed by OpenAI, considering local slang heavily to determine the sentiment of the text.",
      "legend_tension_desc": "The tension meter gives extra weight to activity from the last 24 hours (Recency decay). The more turbulent the web is around this location right now, the closer to the red zone it gets.",
      "live_feed_title": "Live Intel Feed",
      "scan_national": "Scanning for the National King...",
      "no_data": "No data found.",
      "based_on_reports": "Based on {{count}} Intel Reports",
      "awaiting_transmissions": "[SYSTEM] Awaiting transmissions..."
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "he", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
