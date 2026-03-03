import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// the translations
const resources = {
  he: {
    translation: {
      "app_name": "ShawarmaRadar",
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
      "awaiting_transmissions": "[SYSTEM] ממתין לשידורים חדשים...",
      
      "nav_info_btn": "איך המכ\"ם מחשב את ציון השווארמה?",
      "ai_modal_title": "איך המכ\"ם מחשב את ציון השווארמה?",
      "ai_modal_subtitle": "הציון מורכב ממספר גורמים:",
      "ai_modal_history_title": "ההיסטוריה ארוכת השנים אצל גוגל",
      "ai_modal_history_desc": " - אנחנו דוגמים את המוניטין של העסק מול אלפי הלקוחות שביקרו בו לאורך השנים כדי לקבוע מיקום התחלתי, המערכת שלנו יודעת להבדיל בין עליה של מקומות חדשים שקיבלו שתי ביקורות טובות מול מקומות ותיקים שקיבלו מאות ביקורות מגוונות.",
      "ai_modal_live_title": "מה הופך את הרדאר ל\"חי\"?",
      "ai_modal_live_desc": " במקום להסתמך רק על היסטוריה, המנוע הייחודי שלנו משוקלל בזמן אמת עם שני גורמים נוספים:",
      "ai_modal_tension_title": "- מדד ה\"ביקוש והלחץ\":",
      "ai_modal_tension_desc": "אנחנו סורקים את אפליקציות המשלוחים ובודקים את העומס, זמני המשלוח, והדירוג של המקום.",
      "ai_modal_nlp_title": "- סנטימנט עכשווי:",
      "ai_modal_nlp_desc": "המערכת קוראת את הביקורות האחרונות והשיח ברשת, מנתחת את השפה ומבינה אם יש כרגע התלהבות שיא או אכזבה.",
      "ai_modal_summary": "האלמנטים החיים הללו משוקללים כמעין \"בונוס\" או \"קנס\" לדירוג. כך הרדאר שלנו מרים מקומות ש'לוהטים' הרגע, ומוריד מקומות שאכזבו לאחרונה - הכל כדי שתדעו איפה לאכול ממש עכשיו.",
      "ai_modal_footer": "בתאבון :)",
      "btn_understood": "הבנתי, תודה",
      
      "about_modal_title": "אודות ShawarmaRadar",
      "about_modal_desc1": "שווארמה רדאר (ShawarmaRadar) הוא פרויקט איסוף נתונים ולמידת מכונה ששם לו למטרה לייצר שקיפות מלאה לגבי ביקורות על שווארמיות בישראל. המערכת סורקת באופן עצמאי הררי מידע פומבי ומזקקת אותו אל תוך מכ\"ם אחד וברור.",
      "about_modal_desc2": "מפותח באהבה ובתיאבון.",
      "btn_close": "סגור",
      
      "business_section_title": "האם העסק שלך ברדאר?",
      "business_section_desc": "חפש את הרשומה שלך ובדוק אם המכ\"ם שלנו סורק אותך (גם אם אינך בטופ):",
      "business_search_placeholder": "שם שווארמיה / עסק...",
      "business_search_btn": "חפש",
      "business_scanning_btn": "סורק...",
      "business_contact_btn": "צור קשר להוספה לרדאר",
      "ads_section_title": "רוצים לשמוע איך ניתן לפרסם אצלנו?",
      "ads_section_desc": "תגיעו ללקוחות רעבים ברגע המדויק שהם בודקים את המכ\"ם.",
      "ads_contact_btn": "שלח הודעת ווצאפ עכשיו",
      "footer_about": "אודות",
      "footer_share": "שתף מכ\"ם",
      "footer_save": "שמור במסך הבית",

      "home_king_title": "מלך השווארמה עכשיו",
      "home_scanning": "סורק רחוב...",
      "home_runners_title": "עוד שווארמיות שאתם אוהבים",

      "region_king_title": "מלך האזור עכשיו",
      "region_no_data": "אין מספיק נתונים לאזור זה",
      "region_leaders": "המובילות באזור",
      "region_no_more_data": "אין נתונים נוספים להצגה באזור זה.",

      "nav_filter_region": "סנן לפי אזור",
      "share_text": "בדוק את מפת הדירוג החיה של השווארמיות בישראל!",
      "share_fallback": "העתק את הקישור ושתף מכל דפדפן!",
      "install_prompt": "להתקנת האפליקציה ב-iOS / אייפון: יש ללחוץ על כפתור השיתוף בתחתית המסך ובחרו \"Add to Home Screen\". באנדרואיד: לחצו על 3 הנקודות בדפדפן ובחרו \"Add to Home screen\".",
      "search_error": "שגיאה בחיבור לשרת הרדאר.",
      "footer_copyright": "ShawarmaRadar © 2026 - מבצעים צבאיים חסויים",
      "whatsapp_ad_prefill": "היי, ספר לי איך ניתן לפרסם את העסק שלי ב-ShawarmaRadar"
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
      "awaiting_transmissions": "[SYSTEM] Awaiting transmissions...",

      "nav_info_btn": "How does the radar calculate the score?",
      "ai_modal_title": "How does the radar calculate the score?",
      "ai_modal_subtitle": "The score consists of several factors:",
      "ai_modal_history_title": "Long-term history on Google",
      "ai_modal_history_desc": " - We sample the business reputation from thousands of customers who visited over the years to determine a starting position. Our system distinguishes between a spike for new places with two good reviews vs veteran places with hundreds of varied reviews.",
      "ai_modal_live_title": "What makes the radar \"Live\"?",
      "ai_modal_live_desc": " Instead of just relying on history, our unique engine weighs two additional factors in real-time:",
      "ai_modal_tension_title": "- \"Demand and Tension\" index:",
      "ai_modal_tension_desc": "We scan delivery apps to check loads, delivery times, and the place's current rating.",
      "ai_modal_nlp_title": "- Current Sentiment:",
      "ai_modal_nlp_desc": "The system reads the latest reviews and network chatter, analyzing the language to understand if there is currently peak enthusiasm or fresh disappointment.",
      "ai_modal_summary": "These live elements act as a \"bonus\" or \"penalty\" to the rating. Thus, our radar boosts places that are 'hot' right now, and demotes places that recently disappointed - all so you know where to eat right now.",
      "ai_modal_footer": "Bon Appetit :)",
      "btn_understood": "Got it, thanks",
      
      "about_modal_title": "About ShawarmaRadar",
      "about_modal_desc1": "ShawarmaRadar is a data collection and machine learning project aimed at creating full transparency regarding shawarma reviews in Israel. The system independently scans mountains of public information and distills it into one clear radar.",
      "about_modal_desc2": "Developed with love and appetite.",
      "btn_close": "Close",
      
      "business_section_title": "Is your business on the radar?",
      "business_section_desc": "Search for your listing and check if our radar scans you (even if you're not at the top):",
      "business_search_placeholder": "Shawarma / Business name...",
      "business_search_btn": "Search",
      "business_scanning_btn": "Scanning...",
      "business_contact_btn": "Contact to be added to radar",
      "ads_section_title": "Want to hear how to advertise with us?",
      "ads_section_desc": "Reach hungry customers exactly when they check the radar.",
      "ads_contact_btn": "Send a WhatsApp message now",
      "footer_about": "About",
      "footer_share": "Share Radar",
      "footer_save": "Save to Home Screen",

      "home_king_title": "Shawarma King Right Now",
      "home_scanning": "Scanning the streets...",
      "home_runners_title": "More shawarma joints you love",

      "region_king_title": "Regional King Right Now",
      "region_no_data": "Not enough data for this area",
      "region_leaders": "Top ranked in",
      "region_no_more_data": "No additional data available for this area.",

      "nav_filter_region": "Filter by Region",
      "share_text": "Check out the live shawarma rating map of Israel!",
      "share_fallback": "Copy the link and share from any browser!",
      "install_prompt": "To install on iOS: Tap the share button at the bottom and select \"Add to Home Screen\". On Android: Tap the 3 dots in the browser and select \"Add to Home screen\".",
      "search_error": "Error connecting to the radar server.",
      "footer_copyright": "ShawarmaRadar © 2026 - Confidential Military Operations",
      "whatsapp_ad_prefill": "Hi, tell me how I can advertise my business on ShawarmaRadar"
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
