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
      "score": "ציון מצטבר"
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
      "score": "Overall Score"
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
