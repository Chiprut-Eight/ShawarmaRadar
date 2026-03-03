import json
import codecs

raw_blacklist = [
    'זה" אשדוד',
    "לינדה",
    "סטקיית עמרם",
    'אלברט מסעדה ומעדניה בע"מ'
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
