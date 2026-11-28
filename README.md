# 🥙 ShawarmaRadar — מכ"ם השווארמה של ישראל

> **מסמך שורש הפרויקט (Single Source of Truth)**  
> מסמך זה מגדיר במדויק את מהות הפרויקט, התשתית הרשמית החינמית שלו, אלגוריתם הדירוג, חוויית המשחקיות והמבנה המלא של המערכת.

---

## 🎯 1. מהות הפרויקט והחזון

**ShawarmaRadar (מכ"ם השווארמה)** הוא מערכת אוטונומית לאיסוף נתונים רשמיים, עיבוד שפה טבעית (NLP בעברית) ודירוג שקוף והוגן של שווארמיות בישראל.  
המערכת משלבת נתונים ממקורות רשמיים ופומביים, מזקקת אותם לציון מכ"ם משוקלל (`0%` עד `100%`), ומציגה:
1. **מלך השווארמה הארצי (`/`)** — השווארמיה המובילה בישראל ברגע זה וטבלת המובילות הארצית.
2. **מלכי האזורים (`/region/:id`)** — הדירוג המוביל ב-5 אזורים: **צפון**, **מרכז**, **שרון**, **שפלה** ו**דרום**.
3. **קרוב אלי ב-GPS (`/near-me`)** — איתור 10 השווארמיות הקרובות ביותר למיקום הגולש (או סינון לפי עיר), עם מיון לפי מרחק או לפי הדירוג הארצי.
4. **משחקיות אינטראקטיבית — "אתגר השווארמה הרשמי" (`/play`)** — חוויית חיתוך שווארמה מהשיפוד במכ"ם וכרטיס שיתוף HD לסטורי/וואטסאפ.
5. **דו"ח מודיעין יומי לטלגרם** — עדכון אוטומטי הנשלח בסיום הסריקה היומית, כולל תנועות מיקום יומיות, רצף המלך בפסגה ומצב מכסת הגוגל החינמית.

### עקרונות הברזל של הפרויקט
* **100% חינמי לתמיד (Zero-Cost Architecture / 0 ₪ עלות)**:
  * ללא שרתים בתשלום (ללא Render וללא שרתי VPS).
  * אירוח חינמי ב-**Firebase Hosting**, סטטיסטיקות ונוכחות חיה חינמיות ב-**Cloud Firestore**, ואוטומציה יומית חינמית ב-**GitHub Actions**.
  * איסוף נתוני גוגל מתבצע דרך **Google Places API (New)** הרשמי תחת המכסה החינמית החודשית (1,000 בקשות חינם בחודש), המוגנת הן במכסות קשיחות בקונסולת Google Cloud (`25` `GetPlaceRequest` ו-`15` `SearchTextRequest` ליום) והן בחסם קשיח שני בקוד ([`backend/google_quota_ledger.json`](backend/google_quota_ledger.json), מקסימום `850` בקשות בחודש).
* **שווארמיות אמיתיות בלבד (חוק גלגל השווארמה)**:
  * המכ"ם מציג אך ורק עסקים פעילים המפעילים **גלגל שווארמה אמיתי** כמרכיב מרכזי בתפריט.
  * איסור מוחלט על הכללת מסעדות כלליות, שניצליות, כריכיות, סביח, פיצריות, המבורגריות, סושי או עסקים סגורים.
  * סגירה לצמיתות בגוגל (`CLOSED_PERMANENTLY`) מטופלת אוטומטית על ידי הסורק (התראה בדוח היומי ומניעת הוספה ב-[`backend/add_shawarma.py`](backend/add_shawarma.py)).
* **מזהים רשמיים נעולים — אפס ניחושים (`backend/auto_seeds.json`)**:
  * לכל שווארמיה נשמרים מזהים חד-ערכיים רשמיים וקבועים ב-[`backend/auto_seeds.json`](backend/auto_seeds.json) ובמסד הנתונים: `google_place_id`, `wolt_slug` ו-`tenbis_id`, יחד עם כתובת ומיקום GPS מאומתים.
  * הוספת עסקים חדשים מתבצעת באופן מאומת דרך [`backend/add_shawarma.py`](backend/add_shawarma.py) המושך ישירות מ-Google Places API (New), מוודא שהעסק פעיל וללא כפילות `place_id`, ונועל את מזהי הפלטפורמות.

---

## 🏗️ 2. ארכיטקטורת המערכת (Deterministic & 100% Free)

המערכת בנויה בארכיטקטורת **Static Bundle + Official API Sync + Scheduled GitHub Action** שמבטיחה טעינה מיידית (`0ms` השהיית שרת), נתוני אמת מדויקים ואפס עלויות תשתית:

```text
[GitHub Actions Cron (יומי)]
       │
       ▼
[backend/worker.py]
  ├──► עדכון רוטציוני של עד 20 עסקים בלילה מול Official Google Places API (New) לפי place_id נעול
  ├──► סריקה יומית של כל העסקים ב-Wolt (לפי wolt_slug) וב-תן ביס (לפי tenbis_id)
  └──► ניתוח סנטימנט עברי מקומי לביקורות אמת מגוגל ומתן ביס (nlp.py)
       │
       ▼
[backend/shawarma_radar.db + backend/auto_seeds.json + backend/google_quota_ledger.json]
       │
       ├──► שליחת דו"ח יומי + תנועות דירוג לבוט הטלגרם (Telegram Bot API)
       │
       ▼
[backend/export_json.py] ──► ייצוא ל-restaurants_data.json + king_history.json
       │
       ▼
[Vite Build & Firebase Deploy] ──► פריסה אוטומטית ל-https://shawarmaradar-app.web.app
```

---

## 🧮 3. אלגוריתם הדירוג של המכ"ם (0% – 100%)

הציון הסופי (`bayesian_average`) מחושב בקובץ [`backend/nlp.py`](backend/nlp.py) ומורכב מ-4 מרכיבים (סה"כ 100 נקודות):

### א. מוניטין גוגל בייסיאני — 40% (עד 40 נקודות)
כדי למנוע ממקום חדש עם 3 ביקורות של 5 כוכבים לעקוף שווארמיה ותיקה עם 1,500 ביקורות וציון 4.7, מחושב **ממוצע בייסיאני** עם רף אמינות של `40` ביקורות וממוצע בסיס של `3.5` כוכבים:
* `דירוג בייסיאני = (כמות ביקורות / (כמות ביקורות + 40)) * ציון גוגל + (40 / (כמות ביקורות + 40)) * 3.5`
* `ניקוד גוגל = (דירוג בייסיאני / 5.0) * 40`

### ב. מדד Wolt — 30% (עד 30 נקודות)
* **אם העסק קיים ב-Wolt**: `ניקוד וולט = (ציון וולט / 10.0) * 30`
* **אם העסק אינו ב-Wolt** (שווארמיות מסורתיות / כפרים / ללא משלוחים): **ללא שום קנס** — ניקוד מנורמל בסקאלה שווה מהדירוג הבייסיאני בגוגל: `(דירוג בייסיאני / 5.0) * 30`

### ג. מדד תן ביס (10Bis) — 15% (עד 15 נקודות)
* **אם העסק קיים בתן ביס**: `ניקוד תן ביס = (ציון תן ביס / 5.0) * 15`
* **אם העסק אינו בתן ביס**: **ללא שום קנס** — ניקוד מנורמל בסקאלה שווה מהדירוג הבייסיאני בגוגל: `(דירוג בייסיאני / 5.0) * 15`

### ד. סנטימנט חי מביקורות אמיתיות — 15% (עד 15 נקודות)
מנוע ה-NLP המקומי מנתח ביקורות אמיתיות מ-Google Places ומ-10Bis (ללא ביקורות מלאכותיות או תקצירי אינדקסים):
* **מילון סלנג שווארמה עברי + זיהוי שלילות**: ניתוח טקסט (`"אש"`, `"פצצה"`, `"עסיסי"`, `"מפנק"` מול `"יבש"`, `"קמצנים"`, `"לא טרי"`, `"מגעיל"`) עם היפוך שלילות (`"לא טעים"`, `"ממש לא עסיסי"`).
* **שילוב דירוג כוכבים פר ביקורת**: כאשר לביקורת מוצמד ציון כוכבים (`1–5`), הסנטימנט משלב `60%` ניתוח טקסט + `40%` דירוג הכוכבים של אותה ביקורת.
* **מכפיל טריות (Recency Decay)**: ביקורות מ-24 השעות האחרונות מקבלות משקל של עד פי `3.0x`, עם דעיכה חלקה עד ל-`0.25x` לאורך 365 יום.
* **החלקה בייסיאנית (Bayesian Smoothing)**: משקל קדם ניטרלי (`prior_weight = 4.0`) כדי למנוע מביקורת קיצונית בודדת להטות לבדה את מלוא 15 הנקודות.
* **ציון בסיס ניטרלי (ללא ביקורות טקסט)**: `7.5` נקודות (`50%`).

---

## 🎮 4. פיצ'רים, משחקיות ומוניטיזציה באתר (`frontend/`)

1. **משחקיות אינטראקטיבית — "אתגר השווארמה הרשמי" (`/play`)**:
   * **חיתוך משיפוד מסתובב (`ShawarmaSpitCanvas.tsx`, `ShawarmaGame.tsx`)**: סימולציית חיתוך פיזיקלית על בד Canvas מול שיפוד שווארמה וגחלים, סכין חיתוך ושבבי בשר נופלים, תחת טיימר סיבוב (`35` שניות) עם מנוע סאונד פרוצדורלי (`soundEffects.ts` מבוסס Web Audio API ללא קבצי MP3 כבדים).
   * **אתגר שקילה עיוורת של 3 מנות (`PortionIcon.tsx`, `shawarmaGameConfig.ts`)**: הלאפה (`280g`), פיתה (`180g`) וחצי פיתה (`80g`) — חישוב דיוק משוקלל, דרגות שווארמולוג / שווארמולוגית בהתאמת מגדר, ושמירת שיא אישי מקומי.
   * **כרטיס תוצאה לשיתוף בסטורי / וואטסאפ (`shareCardGenerator.ts`, `ShareDrawer.tsx`)**: מחולל בזמן אמת תמונת PNG ברזולוציית HD (`1080×1920`) ממותגת עם דיוק לכל מנה וקריאה לשחק באתר, יחד עם כפתורי שיתוף וואטסאפ/ווב/הורדה.
   * **נקודות כניסה**: כפתור ניווט קבוע בתפריט העליון + כרטיס הזמנה ייעודי בעמוד הבית ([`Home.tsx`](frontend/src/pages/Home.tsx)).
2. **דף "📍 קרוב אלי" (`/near-me`)**:
   * [`NearMe.tsx`](frontend/src/pages/NearMe.tsx) — מאתר GPS או סינון לפי עיר מתוך רשימת הערים הזמינות, מציג את 10 השווארמיות הקרובות ביותר ומאפשר למיין אותן לפי הכי קרוב או לפי הדירוג הארצי.
3. **מודאל ניווט אוניברסלי וקופוני מפרסמים (`NavigationModal.tsx`)**:
   * פתיחה ישירה של **Waze** או **Google Maps** בכל מכשיר + משבצת ייעודית לקופון הטבה למפרסמים בזמן שהלקוח בוחר ניווט.
4. **מערכת פרסום ובאנרים (`BANNER_GUIDELINES.md`, `AdBanner.tsx`)**:
   * משבצת באנר עליונה בעמוד הראשי (כיום פעילה עם [`bon-taam-tlv.jpg`](frontend/public/banners/bon-taam-tlv.jpg) המקושר לדירוג בגוגל), משבצת תחתונה פנויה למפרסם נוסף, ובאנרים אזוריים ייעודיים ב-[`RegionalDashboard.tsx`](frontend/src/pages/RegionalDashboard.tsx).
   * מסמכי התמחור והמודל העסקי מרוכזים בשורש הפרויקט (`ShawarmaRadar_Advertiser_Pricing_Proposal.docx`, `ShawarmaRadar_Business_Model_And_Pricing.docx`, `ShawarmaRadar_Internal_Revenue_Forecast.docx`).
5. **חדר בקרה נסתר למנהל (`/admin`) ואנליטיקס חי ב-Firestore**:
   * [`AdminDashboard.tsx`](frontend/src/pages/AdminDashboard.tsx) — מוגן בקוד PIN עם חתימת `SHA-256` (נגיש דרך כתובת `/admin` או הקלדת הקוד בשורת חיפוש העסקים).
   * [`analytics.ts`](frontend/src/services/analytics.ts) — מעקב חי וקל משקל ב-Firestore (`firestore.rules`): גולשים באתר כרגע (`LIVE`), סה"כ גולשים ייחודיים, זמן שהייה ממוצע, התפלגות צפיות לפי עמודים ומכשירים, קליקים על באנר מפרסמים וניווטים, ומדדי המשחק (`/play`).
   * מציג בנוסף את היסטוריית כס המלכות ([`king_history.json`](frontend/src/data/king_history.json)) וטבלת דירוג מלאה, מסוננת וניתנת לחיפוש של כל 300+ השווארמיות.
6. **חוויית משתמש ומובייל (PWA)**:
   * כותרת רספונסיבית עם לוגו מפוצל למובייל (`logo-icon.png`), פופ-אפ פתיחה המשאיר את כותרת "מלך השווארמה עכשיו" והשעון החי קריאים, סגירת חלון ההסבר בלחיצה על כפתור "חזור" בטלפון/דפדפן, וממשק דו-לשוני מלא (`i18n.ts`).

---

## 📂 5. מבנה הפרויקט המלא

```text
ShawarmaRadar/
├── README.md                                       # מסמך שורש הפרויקט (קובץ זה)
├── shawarma_radar_algorithm.txt                    # תיעוד מפורט של נוסחת האלגוריתם המעודכנת
├── BANNER_GUIDELINES.md                            # מפרט וחוקים להכנת באנרים למפרסמים (1024×123)
├── ShawarmaRadar_Advertiser_Pricing_Proposal.docx  # הצעת מחיר ותפריט פרסום למפרסמים
├── ShawarmaRadar_Business_Model_And_Pricing.docx   # אסטרטגיה ומודל עסקי ותמחור
├── ShawarmaRadar_Internal_Revenue_Forecast.docx    # תחזית הכנסות פנימית
├── firebase.json                                   # הגדרות Firebase Hosting ו-Firestore
├── .firebaserc                                     # קישור לפרויקט shawarmaradar-app ב-Firebase
├── firestore.rules                                 # חוקי אבטחה ל-Firestore (קריאת מסעדות + אנליטיקס)
├── firestore.indexes.json                          # אינדקסים לשאילתות Firestore
├── pyrefly.toml                                    # הגדרות בודק הטיפוסים Pyrefly
├── deploy.ps1                                      # סקריפט PowerShell לבנייה ופריסה מהירה ל-Firebase
├── .github/
│   └── workflows/
│       ├── daily-scraper.yml                       # אוטומציית GitHub Actions לסריקה יומית ופריסה
│       └── firebase-hosting-pull-request.yml
├── backend/
│   ├── worker.py                                   # מנוע הסריקה הדטרמיניסטי, שקלול ציונים ודוח טלגרם
│   ├── add_shawarma.py                             # כלי CLI להוספת שווארמיה מאומתת מ-Google Places API
│   ├── nlp.py                                      # אלגוריתם הדירוג ומנוע ה-NLP העברי המקומי
│   ├── regions.py                                  # מיפוי ערים בישראל ל-5 אזורי המכ"ם
│   ├── database.py                                 # חיבור SQLAlchemy למסד הנתונים SQLite
│   ├── models.py                                   # מודלים (כולל google_place_id, wolt_slug, tenbis_id)
│   ├── schemas.py                                  # סכמות Pydantic
│   ├── export_json.py                              # ייצוא ל-restaurants_data.json ול-king_history.json
│   ├── seed_generator.py                           # מחולל מועמדים ראשוניים (candidate_seeds.json)
│   ├── auto_seeds.json                             # מקור האמת הנעול (300+ שווארמיות ומזהה כל עסק)
│   ├── google_quota_ledger.json                    # מונה בקשות גוגל חודשי להגנה קשיחה על עלות ₪0
│   ├── shawarma_radar.db                           # מסד הנתונים SQLite
│   ├── run_scan.py                                 # סקריפט להרצת סריקה ידנית מקומית
│   ├── main.py                                     # שרת FastAPI לפיתוח ובדיקות מקומיות
│   ├── requirements.txt                            # חבילות פייתון נדרשות
│   └── scrapers/
│       ├── base.py                                 # מחלקת בסיס לסריקה מנומסת (PoliteScraper)
│       ├── google.py                               # לקוח Google Places API (New) הרשמי + QuotaGuard
│       ├── wolt.py                                 # לקוח Wolt ו-10Bis לפי מזהים וקואורדינטות GPS
│       └── social.py                               # עזר היסטורי לאזכורי רשת
└── frontend/
    ├── package.json                                # תלויות React 19, TypeScript, Vite, Firebase, i18next
    ├── index.html                                  # כניסת האפליקציה ומטא-תגיות PWA / מובייל
    ├── public/
    │   ├── logo.png                                # לוגו ראשי רחב (לשיתוף ומטא)
    │   ├── logo-icon.png                           # סמל המכ"ם הנפרד לכותרת המובייל והדסקטופ
    │   ├── manifest.json                           # הגדרות PWA להתקנה כאפליקציה
    │   └── banners/                                # באנרים מאושרים של מפרסמים (כגון bon-taam-tlv.jpg)
    └── src/
        ├── App.tsx                                 # ניתוב ראשי (/, /near-me, /region/:id, /play, /admin)
        ├── i18n.ts                                 # מילון תרגום מלא (עברית / אנגלית)
        ├── data/
        │   ├── restaurants_data.json               # מאגר הנתונים המיוצא לטעינה מיידית ב-0ms
        │   └── king_history.json                   # היסטוריית כהונות ושיאי מקום #1 הארצי
        ├── services/
        │   ├── firebase.ts                         # שכבת שליפה, חישובי מרחק קרוב אלי וחיפוש מקומי
        │   └── analytics.ts                        # שירות האנליטיקס ונוכחות חיה ב-Firestore
        ├── game/
        │   ├── shawarmaGameConfig.ts               # חוקי המנות (לאפה/פיתה/חצי), שקילה ודרגות תוצאה
        │   └── soundEffects.ts                     # מנוע אפקטים קוליים פרוצדורלי (Web Audio API)
        ├── utils/
        │   └── shareCardGenerator.ts               # מחולל כרטיס תוצאה PNG 1080×1920 לשיתוף בסטורי
        ├── hooks/
        │   └── useRadarWebSocket.ts                # הוק עזר לחיבור חי מקומי
        ├── pages/
        │   ├── Home.tsx / Home.css                 # מלך השווארמה הארצי, כרטיס המשחק והמובילות
        │   ├── RegionalDashboard.tsx / .css        # מכ"ם אזורי + באנרים אזוריים
        │   ├── NearMe.tsx / NearMe.css             # דף 10 השווארמיות הקרובות + סינון ערים ו-GPS
        │   ├── ShawarmaGame.tsx / .css             # משחק חיתוך השווארמה האינטראקטיבי (/play)
        │   └── AdminDashboard.tsx / .css           # חדר בקרה נסתר למנהל (/admin)
        └── components/
            ├── Layout.tsx / Layout.css             # כותרת מפוצלת, תפריט, חיפוש, פופ-אפ ובאנרים
            ├── AdBanner.tsx / AdBanner.css         # רכיב הצגת באנרים ומדידת קליקים
            ├── NavigationModal.tsx / .css          # מודאל ניווט ל-Waze / Google Maps + קופון
            ├── TensionMeter.tsx / .css             # רכיב מד מתח ויזואלי
            └── game/
                ├── PortionIcon.tsx                 # איור וקטורי של לאפה, פיתה וחצי פיתה
                ├── ShawarmaSpitCanvas.tsx          # קנבס חיתוך השווארמה האינטראקטיבי והפיזיקה
                └── ShareDrawer.tsx / .css          # מגירת השיתוף (WhatsApp, שיתוף מובייל, הורדה)
```

---

## 🔐 6. משתני סביבה וסודות (GitHub Secrets)

עבור הרצת האוטומציה הלילית ב-GitHub Actions מוגדרים הסודות הבאים במאגר:
* `GOOGLE_PLACES_API_KEY` — מפתח Places API (New) מוגבל שירות, בתוך המכסה החינמית החודשית.
* `TELEGRAM_BOT_TOKEN` — טוקן בוט הטלגרם לשליחת הדו"ח היומי.
* `TELEGRAM_CHAT_ID` — מזהה הצ'אט לקבלת ההתראות.
* `FIREBASE_SERVICE_ACCOUNT_SHAWARMARADAR_APP` — מפתח Service Account לפריסה אוטומטית ל-Firebase Hosting.
