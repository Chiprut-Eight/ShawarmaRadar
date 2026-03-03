import json
import codecs

# We compile the user's manual list of strings
raw_blacklist = [
    "האחים תל אביב",
    "Congress Basel",
    "שיפודי זיקה",
    "שיפודי הנכסים",
    "Jasmino",
    "מסעדת רג'ינה",
    "גודנס",
    "לה גדריה גריל בר",
    "סטקיית הבוקרים",
    "פטוש",
    "צ'יקן האוס חיפה",
    "Kababji",
    "אווזיי",
    "VINNI",
    "BP -חורב חיפה",
    "ויוינו",
    "מסעדת הלו תימן ירושלים",
    "Deja Bu - דז'ה בו ירושלים",
    "שבט אחים ירושלים",
    "נערי המרבד",
    "גריל בר - ירושלים ירושלים",
    "Tala Hummus and Falafel",
    "אליז",
    "מפגש הסדנא ירושלים",
    "סאטיה",
    "הארווי",
    "התימני",
    "הפאלפל",
    "סבא ג'בטו",
    "Jessica",
    "מפגש חברים",
    "אלדו",
    "ניו דלי",
    "קלרה",
    "ג'פניקה",
    "לחם בשר",
    "מסעדת אחלה",
    "פונדק מטלון",
    "פיתה רחוב",
    "איזי גריל",
    "בית הפנקייק",
    "נונו מימי",
    "בבא חלה",
    "בישולים",
    "שניצל מדינה",
    "סביח",
    "גוזל וציונה",
    "האקדמיה לנקניק",
    "שניצל נתי",
    "מסעדת הסאלוף",
    "סנדוויץ בר",
    "זה אשדוד",
    "BBB",
    "דל טורו",
    "טקסס סטייק האוס",
    "ג׳חנון",
    "מסעדת החוף",
    "רובן",
    "סקוצמן",
    "בית רצון",
    "Beit Razon",
    "ביסטרו אלי",
    "בוארון",
    "בתומי",
    "מסעדת רימונים",
    "עיראקי",
    "סבוי",
    "אוכל מוכן לשבת",
    "Mambo",
    "אושי אושי",
    "פנטום",
    "שר האופים",
    "פאטאטאס",
    "שניצל",
    "הלו תימן",
    "פיתה היט",
    "הטבח",
    "מפגש גרונר",
    "שיוסה",
    "דרור",
    "זלבוך",
    "אלישקו",
    "קורניק",
    "גולדיס'",
    "ביס בלחי",
    "Japo",
    "פקוס",
    "אפנדי",
    "חלהוולה",
    "ספייסי",
    "מוסררה",
    "סביחה",
    "אצל מלי",
    "נייברס",
    "אחלן ג׳חנון",
    "המושל גריל",
    "RODEO",
    "רק מרק",
    "שלדון",
    "המטבח של איריס",
    "גריל עוף",
    "Kura",
    "מקסיקני",
    "BUFFET",
    "טעם העמק",
    "בואצוס",
    "מפגש ארבל",
    "שיפודי האווז",
    "מיט מי",
    "קראנצו",
    "Eight 8",
    "סקובר",
    "בוא נאכל הרצליה",
    "לה ואקה",
    "Ruben",
    "יגאל קבב",
    "מול החוף",
    "בני הדייג",
    "שלהבתיה",
    "אולגה",
    "Hummus Eliyahoo",
    "פרש דה מרקט",
    "סמבוסלה",
    "מסעדת דניאל",
    "באבו בשרים על גחלים",
    "פיתה בשרים על האש",
    "קלרה"
]

seeds_path = 'backend/auto_seeds.json'
with open(seeds_path, 'r', encoding='utf-8') as f:
    seeds = json.load(f)

new_seeds = []
removed_count = 0
for s in seeds:
    q = s.get('query', '')
    if any(b.lower() in q.lower() for b in raw_blacklist):
        removed_count += 1
    else:
        new_seeds.append(s)

with open(seeds_path, 'w', encoding='utf-8') as f:
    json.dump(new_seeds, f, ensure_ascii=False, indent=4)

print(f"Purged {removed_count} items from auto_seeds.json.")

# Generate format array for main.py replace
out_arr = ""
for i in range(0, len(raw_blacklist), 6):
    chunk = raw_blacklist[i:i+6]
    line = "            " + ", ".join(f'"%{b}%"' for b in chunk) + ","
    out_arr += line + "\n"

with open('main_array_dump.txt', 'w', encoding='utf-8') as f:
    f.write(out_arr)

print("Generated massive target string chunk in main_array_dump.txt")
