# Writes public/icons/logo-16.svg, the 16px icon drawn pixel by pixel (logo.svg blurs at 16px).
# Usage: python3 scripts/pixel-icon.py public/icons/logo-16.svg; then see README for the PNGs.
import sys
rows = [
"................",
"................",
"....OOOOOOOO....",
"..OOFFFWWFFFOO..",
".OEOFFFWWFFFOEO.",
"OEEOFFFFFFFFOEEO",
"OEEFHKFFFFHKFEEO",
"OEEFKKFFFFKKFEEO",
"OEEFKKFFFFKKFEEO",
"OEEPFFFNNFFFPEEO",
".OOFFMWMMWMFFOO.",
"..OFFWMWWMWFFO..",
"..OFFWWWWWWFFO..",
"...OOFFFFFFOO...",
".....OOOOOO.....",
"................",
]
assert all(len(r) == 16 for r in rows), [len(r) for r in rows]
colors = {'O':'#3a2418','E':'#a8683c','F':'#f2c48d','W':'#fff4e4','K':'#2a1a12','H':'#ffffff','P':'#ff8f9c','N':'#2a1a12','M':'#3a2418'}
out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">',
       '  <!-- logo.svg as 16px pixel art, made by scripts/pixel-icon.py. -->']
for y, row in enumerate(rows):
    x = 0
    while x < 16:
        c = row[x]
        if c == '.':
            x += 1; continue
        w = 1
        while x + w < 16 and row[x + w] == c: w += 1
        out.append(f'  <rect x="{x}" y="{y}" width="{w}" height="1" fill="{colors[c]}"/>')
        x += w
out.append('</svg>')
open(sys.argv[1], 'w').write('\n'.join(out) + '\n')
