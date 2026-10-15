#!/usr/bin/env bash
# Final-main interaction inventory. Observables are accessibility-tree state (uiautomator dump) unless a line says PIXELS.
# Every target logs a before state, an action, an after state, and a control where one exists. No pass/fail is decided here; raw lines go to summary.txt.
set -u
OUT=smoke-out/final; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | grep -v verify | sed 's/package://' | head -1 | tr -d '\r')
PY=$OUT/q.py
cat > "$PY" <<'PYEOF'
import re,sys
mode,needle,f=sys.argv[1],sys.argv[2],sys.argv[3]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
rows=[]
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); t=(re.search(r' text="([^"]*)"',n) or [0,''])[1] if re.search(r' text="([^"]*)"',n) else ''
    d=re.search(r'content-desc="([^"]*)"',n); d=d.group(1) if d else ''
    b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if not b: continue
    x1,y1,x2,y2=map(int,b.groups())
    en=re.search(r'enabled="(\w+)"',n); sel=re.search(r'selected="(\w+)"',n); ck=re.search(r'checked="(\w+)"',n)
    rows.append((y1,x1,x2,y2,t,d,en.group(1) if en else '',sel.group(1) if sel else '',ck.group(1) if ck else ''))
if mode=='sel':
    for r in rows:
        if r[5]==needle: print(r[7]); break
    sys.exit()
if mode=='list':
    for r in sorted(rows):
        if r[4] or r[5]: print('y%d x%d-%d y2=%d text=[%s] desc=[%s] en=%s sel=%s chk=%s'%(r[0],r[1],r[2],r[3],r[4],r[5],r[6],r[7],r[8]))
else:
    for r in rows:
        s=[r[4],r[5]]
        ok=any(v==needle for v in s) if mode in('center','has') else any(v.startswith(needle) for v in s)
        if ok:
            print('%d %d'%((r[1]+r[2])//2,(r[0]+r[3])//2) if mode in('center','pcenter') else 'yes'); break
PYEOF
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
C() { python3 "$PY" center "$1" "$OUT/ui-$2.xml"; }
P() { python3 "$PY" pcenter "$1" "$OUT/ui-$2.xml"; }
H() { python3 "$PY" has "$1" "$OUT/ui-$2.xml"; }
PH() { python3 "$PY" phas "$1" "$OUT/ui-$2.xml"; }
L() { python3 "$PY" list x "$OUT/ui-$1.xml" > "$OUT/list-$1.txt"; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 9; }
crash() { adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG|Fatal signal" | head -2; }
tapn() { local p; p=$(C "$1" "$2"); [ -z "$p" ] && p=$(P "$1" "$2"); if [ -n "$p" ]; then adb shell input tap $p; else say "  NOTAP '$1' not found"; fi; }

SEL() { python3 "$PY" sel "$1" "$OUT/ui-$2.xml"; }
shotn() { adb exec-out screencap -p > "$OUT/$1.png"; }
sleep 45; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1
open glass; dump w; if grep -q "isn't responding" "$OUT/ui-w.xml"; then say "warmup ANR dialog present"; W=$(C Wait w); [ -n "$W" ] && adb shell input tap $W; sleep 5; fi
pip install pillow -q 2>&1 | tail -1
cat > $OUT/px.py <<'PY'
import sys
from PIL import Image, ImageChops
def d(a,b):
    A=Image.open(a).convert('L'); B=Image.open(b).convert('L')
    return ImageChops.difference(A,B).point(lambda v:255 if v>24 else 0).histogram()[255]
a=sys.argv[1]; print(' '.join(str(d(a,b)) for b in sys.argv[2:]))
PY
px() { python3 $OUT/px.py "$@"; }


say "== CAPSULE drag distance matrix from idle (source: DRAG_RANGE=120 px/state; expected settle index = round(dy/120 + release projection): 60->compact(0.5 rounds up), 100->compact, 140->compact, 200->expanded, 300->expanded)"
st() { grep -o 'State: [a-z]*' "$OUT/ui-$1.xml" | head -1 | sed 's/State: //'; }
open capsule; dump m0
for DUR in 700 250; do for D in 60 100 140 200 300; do for R in 1 2 3; do
  dump mr; tapn idle mr; sleep 1.5; dump mi; B=$(st mi)
  CP=$(P "Focus session" mi); set -- $CP; CX=$1; CY=$2
  adb shell input swipe $CX $CY $CX $(( CY + D )) $DUR; sleep 2; dump mo; A=$(st mo)
  say "  dur=${DUR}ms dy=${D}px trial=$R: $B -> $A"
done; done; done
say "  crash=$(crash)"
