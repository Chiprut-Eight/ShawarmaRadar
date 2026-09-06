import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
seeds=json.load(open('backend/auto_seeds.json', encoding='utf-8'))
for s in seeds:
    if "טאבון" in s['query'] or "הטאבון" in s['query']:
        print(s)
