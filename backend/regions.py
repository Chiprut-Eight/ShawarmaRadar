# Comprehensive region mapping for Israel
# Note: This list maps variations of city names in Hebrew and English to the 5 designated regions

REGIONS = {
    # הצפון (North)
    "חיפה": "north", "haifa": "north",
    "קריות": "north", "krayot": "north", "קרית אתא": "north", "קרית ביאליק": "north", "קרית מוצקין": "north", "קרית ים": "north",
    "נצרת": "north", "nazareth": "north", "נוף הגליל": "north",
    "עפולה": "north", "afula": "north",
    "טבריה": "north", "tiberias": "north",
    "צפת": "north", "safed": "north", "tzfat": "north",
    "נהריה": "north", "nahariya": "north",
    "עכו": "north", "acre": "north", "akko": "north",
    "כרמיאל": "north", "karmiel": "north",
    "קרית שמונה": "north", "kiryat shmona": "north",
    "בית שאן": "north", "beit she'an": "north",
    "עוספיא": "north", "usfiya": "north", "דלית אל כרמל": "north", "דאלית אל כרמל": "north", "daliyat al-karmel": "north",
    "שפרעם": "north", "שפר עמר": "north", "shefa-'amr": "north",
    "טמרה": "north", "tamra": "north", "סכנין": "north", "sakhnin": "north",
    "כפר יאסיף": "north", "kfar yasif": "north", "ירכא": "north", "yarka": "north", "פקיעין": "north", "peki'in": "north",
    "מג'דל שמס": "north", "majd al-shams": "north",
    

    
    # מרכז (Center)
    "תל אביב": "center", "תל אביב-יפו": "center", "tel aviv": "center", "tel aviv-yafo": "center", "tlv": "center",
    "רמת גן": "center", "ramat gan": "center",
    "גבעתיים": "center", "givatayim": "center",
    "חולון": "center", "holon": "center",
    "בת ים": "center", "bat yam": "center",
    "פתח תקווה": "center", "petah tikva": "center", "פתח תקוה": "center",
    "בני ברק": "center", "bnei brak": "center",
    "קרית אונו": "center", "kiryat ono": "center",
    "אור יהודה": "center", "or yehuda": "center",
    "ראש העין": "center", "rosh haayin": "center",
    
    # השרון (Sharon)
    "נתניה": "sharon", "netanya": "sharon",
    "הרצליה": "sharon", "herzliya": "sharon",
    "כפר סבא": "sharon", "kfar saba": "sharon",
    "רעננה": "sharon", "ra'anana": "sharon", "raanana": "sharon",
    "הוד השרון": "sharon", "hod hasharon": "sharon",
    "רמת השרון": "sharon", "ramat hasharon": "sharon",
    "טייבה": "sharon", "tayibe": "sharon",
    "טירה": "sharon", "tira": "sharon",
    "חדרה": "sharon", "hadera": "sharon",
    "כפר יונה": "sharon", "kfar yona": "sharon",
    
    # השפלה (Shfela)
    "ראשון לציון": "shfela", "rishon lezion": "shfela",
    "רחובות": "shfela", "rehovot": "shfela",
    "לוד": "shfela", "lod": "shfela",
    "רמלה": "shfela", "ramla": "shfela",
    "נס ציונה": "shfela", "ness ziona": "shfela",
    "יבנה": "shfela", "yavne": "shfela",
    "מודיעין": "shfela", "modi'in": "shfela", "מודיעין-מכבים-רעות": "shfela",
    "באר יעקב": "shfela", "beer yaakov": "shfela",
    "אשדוד": "shfela", "ashdod": "shfela", # Moving Ashdod to shfela/south border - typically south but sometimes considered shfela. Let's keep Ashdod/Ashkelon in south as requested by prompt.
    
    # הדרום (South)
    "אשדוד": "south", "ashdod": "south", # Prompt specified Ashdod in south
    "אשקלון": "south", "ashkelon": "south",
    "באר שבע": "south", "beer sheva": "south", "be'er sheva": "south",
    "אילת": "south", "eilat": "south",
    "נתיבות": "south", "netivot": "south",
    "שדרות": "south", "sderot": "south",
    "ערד": "south", "arad": "south",
    "קרית גת": "south", "kiryat gat": "south",
    "דימונה": "south", "dimona": "south",
    "אופקים": "south", "ofakim": "south"
}

def get_region_by_city(city_name: str) -> str:
    """
    Normalizes city name and returns the region it belongs to.
    Returns None if the city is not found in the mapping.
    """
    if not city_name:
        return None
        
    normalized_city = city_name.strip().lower()
    return REGIONS.get(normalized_city)
