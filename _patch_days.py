#!/usr/bin/env python3
"""Update Day 1-4 match data and notes in both JSON files."""
import json

# ── 14red ────────────────────────────────────────────────────────────────────
with open('14red-data.json', 'r', encoding='utf-8') as f:
    d14 = json.load(f)

d14['matches']['1'] = [
    {'opponent': 'SNVF 14 BLIZZARD (#42)',   'time_court': '5:00 PM \u00b7 Court 61 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': 'CMASS Edge 14 Black (#88)', 'time_court': '7:00 PM \u00b7 Court 62 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
]

d14['matches']['2'] = [
    {'opponent': 'UNION 14 Black (#74)',  'time_court': '3:00 PM \u00b7 Court 26 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': 'DYNASTY 14 Gold (#56)', 'time_court': '5:00 PM \u00b7 Court 27 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': 'PSVA 14-1 (#9)',        'time_court': '7:00 PM \u00b7 Court 27 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
]

d14['hub']['day3_notes'] = 'Schedule based on pool play results \u2014 check back after Day 2!'
d14['hub']['day4_notes'] = 'Championship Sunday \u2014 schedule TBD based on Day 3 results'

with open('14red-data.json', 'w', encoding='utf-8') as f:
    json.dump(d14, f, ensure_ascii=False, indent=2)
print('Updated 14red-data.json')

# ── 15red ────────────────────────────────────────────────────────────────────
with open('15red-data.json', 'r', encoding='utf-8') as f:
    d15 = json.load(f)

d15['matches']['1'] = [
    {'opponent': '540 VB 15 Elite (#38)',       'time_court': '1:30 PM \u00b7 Court 23 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': '949 G15 Black (#92)',          'time_court': '3:30 PM \u00b7 Court 38 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
]

d15['matches']['2'] = [
    {'opponent': 'Red Rock 15 Chi (#70)',         'time_court': '4:00 PM \u00b7 Court 14 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': 'Premier Nebraska 15 Red (#60)', 'time_court': '6:00 PM \u00b7 Court 14 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
    {'opponent': 'GP 15 National (#5)',           'time_court': '8:00 PM \u00b7 Court 13 ICC', 'score_us': '', 'score_them': '', 'result': 'upcoming'},
]

d15['hub']['day3_notes'] = 'Schedule based on pool play results \u2014 check back after Day 2!'
d15['hub']['day4_notes'] = 'Championship Sunday \u2014 schedule TBD based on Day 3 results'

with open('15red-data.json', 'w', encoding='utf-8') as f:
    json.dump(d15, f, ensure_ascii=False, indent=2)
print('Updated 15red-data.json')

print('\nDone.')
