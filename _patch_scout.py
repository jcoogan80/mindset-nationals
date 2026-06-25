#!/usr/bin/env python3
"""Add scout video links to match cards in 14red.html, 15red.html, and update JSON files."""
import json, re

# ── 1. Update JSON files ────────────────────────────────────────────────────

def add_scout_video_to_json(path, match0_url=''):
    with open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    for i, m in enumerate(d['matches']['pool']):
        if 'scoutVideo' not in m:
            m['scoutVideo'] = match0_url if i == 0 else ''
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {path}')

add_scout_video_to_json('14red-data.json', 'https://www.youtube.com/live/OC3X7_IiHt0?si=bxz9tvbdoAhRunQ4')
add_scout_video_to_json('15red-data.json', '')

# ── 2. Helper: build the scout video HTML block for a given match index ─────

def scout_html(mi):
    return (
        f'\n      <div style="margin-top:.38rem;display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">'
        f'\n        <a class="scout-link" id="scout-link-{mi}" href="" target="_blank" rel="noopener" '
        f'style="font-size:.78rem;color:var(--red);display:none;text-decoration:none">&#127916; Watch Opponent Film &#8594;</a>'
        f'\n        <div class="scout-edit" id="scout-edit-{mi}" style="display:none;gap:.3rem;align-items:center">'
        f'\n          <input class="fi" id="scout-url-{mi}" type="text" placeholder="Paste YouTube URL here..." '
        f'style="font-size:.75rem;padding:.22rem .5rem;min-width:180px">'
        f'\n          <button onclick="saveScoutVideo({mi})" class="abtn" style="font-size:.72rem;padding:.22rem .55rem;white-space:nowrap">Save</button>'
        f'\n        </div>'
        f'\n      </div>'
    )

# ── 3. Patch HTML file ───────────────────────────────────────────────────────

def patch_html(path, pool_fn_end_marker, standings_fn_name):
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 3a. Insert scout HTML after each match card's score row
    for mi in range(5):
        old = (
            f'        <select class="pres-sel fi" id="pres-{mi}" data-pmatch="{mi}" disabled '
            f'style="width:auto;font-size:.78rem;padding:.25rem .5rem;margin-left:auto;display:none">'
            f'<option value="pending">Pending</option>'
            f'<option value="W">W &#8212; Win</option>'
            f'<option value="L">L &#8212; Loss</option></select>\n      </div>\n    </div>'
        )
        new = (
            f'        <select class="pres-sel fi" id="pres-{mi}" data-pmatch="{mi}" disabled '
            f'style="width:auto;font-size:.78rem;padding:.25rem .5rem;margin-left:auto;display:none">'
            f'<option value="pending">Pending</option>'
            f'<option value="W">W &#8212; Win</option>'
            f'<option value="L">L &#8212; Loss</option></select>\n      </div>'
            + scout_html(mi)
            + '\n    </div>'
        )
        if old in html:
            html = html.replace(old, new, 1)
            print(f'  {path}: inserted scout block for match {mi}')
        else:
            # Try with plain em-dash in the select options (entity vs literal)
            old2 = (
                f'        <select class="pres-sel fi" id="pres-{mi}" data-pmatch="{mi}" disabled '
                f'style="width:auto;font-size:.78rem;padding:.25rem .5rem;margin-left:auto;display:none">'
                f'<option value="pending">Pending</option>'
                f'<option value="W">W \u2014 Win</option>'
                f'<option value="L">L \u2014 Loss</option></select>\n      </div>\n    </div>'
            )
            new2 = (
                f'        <select class="pres-sel fi" id="pres-{mi}" data-pmatch="{mi}" disabled '
                f'style="width:auto;font-size:.78rem;padding:.25rem .5rem;margin-left:auto;display:none">'
                f'<option value="pending">Pending</option>'
                f'<option value="W">W \u2014 Win</option>'
                f'<option value="L">L \u2014 Loss</option></select>\n      </div>'
                + scout_html(mi)
                + '\n    </div>'
            )
            if old2 in html:
                html = html.replace(old2, new2, 1)
                print(f'  {path}: inserted scout block for match {mi} (em-dash variant)')
            else:
                print(f'  WARNING: could not find select for match {mi} in {path}')

    # 3b. Add scout video population to renderPoolSchedule()
    old_rps_end = (
        '  updatePoolRecord();\n'
        f'  {pool_fn_end_marker}();\n'
        '}'
    )
    new_rps_end = (
        '  updatePoolRecord();\n'
        f'  {pool_fn_end_marker}();\n'
        '  // populate scout video links\n'
        '  for(let i=0;i<5;i++){\n'
        '    const sl=document.getElementById(\'scout-link-\'+i);\n'
        '    const si=document.getElementById(\'scout-url-\'+i);\n'
        '    const url=(pm[i]&&pm[i].scoutVideo)||\'\';\n'
        '    if(sl){sl.href=url;sl.style.display=url?\'inline\':\'none\';}\n'
        '    if(si) si.value=url;\n'
        '  }\n'
        '}'
    )
    if old_rps_end in html:
        html = html.replace(old_rps_end, new_rps_end, 1)
        print(f'  {path}: updated renderPoolSchedule()')
    else:
        print(f'  WARNING: could not find renderPoolSchedule end in {path}')

    # 3c. Add saveScoutVideo() function after bindPoolSchedule()
    # Find the closing of bindPoolSchedule
    bps_marker = 'function bindPoolSchedule(){'
    bps_idx = html.find(bps_marker)
    if bps_idx == -1:
        print(f'  WARNING: bindPoolSchedule not found in {path}')
    else:
        # Find the matching closing brace
        depth = 0
        i = bps_idx
        while i < len(html):
            if html[i] == '{': depth += 1
            elif html[i] == '}':
                depth -= 1
                if depth == 0:
                    insert_after = i + 1
                    break
            i += 1
        save_fn = (
            '\n\nfunction saveScoutVideo(mi){\n'
            '  const inp=document.getElementById(\'scout-url-\'+mi);\n'
            '  if(!inp) return;\n'
            '  const url=inp.value.trim();\n'
            '  if(!D.matches.pool[mi]) D.matches.pool[mi]={};\n'
            '  D.matches.pool[mi].scoutVideo=url;\n'
            '  const sl=document.getElementById(\'scout-link-\'+mi);\n'
            '  if(sl){sl.href=url;sl.style.display=url?\'inline\':\'none\';}\n'
            '  saveData();\n'
            '  toast(\'Scout video saved\');\n'
            '}'
        )
        html = html[:insert_after] + save_fn + html[insert_after:]
        print(f'  {path}: added saveScoutVideo()')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Wrote {path}')

patch_html('14red.html', 'renderPool9Standings', 'renderPool9Standings')
patch_html('15red.html', 'renderPool5Standings', 'renderPool5Standings')

# ── 4. Add CSS for scout-edit ────────────────────────────────────────────────

css_path = 'css/14red.css'
scout_css = '\n/* SCOUT VIDEO */\nbody.em .scout-edit{display:flex!important}\nbody.em .scout-link{display:none!important}\n'
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()
if 'scout-edit' not in css:
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write(scout_css)
    print(f'Added scout CSS to {css_path}')
else:
    print(f'Scout CSS already present in {css_path}')

print('\nAll done.')
