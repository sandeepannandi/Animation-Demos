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
# ---- Liquid Tabs: observable = 'selected' attribute of the tab node (content-desc = tab name), one dump per tap
say "== LIQUID TABS observable: selected attribute of tab nodes"
open glass; dump g0; say "  initial selected: Home=$(SEL Home g0) Explore=$(SEL Explore g0) Saved=$(SEL Saved g0) You=$(SEL You g0)"
for TB in Explore Saved You Home Home; do tapn "$TB" g0; sleep 2; dump g1; say "  tap $TB -> Home=$(SEL Home g1) Explore=$(SEL Explore g1) Saved=$(SEL Saved g1) You=$(SEL You g1)"; done
say "  crash=$(crash)"
# ---- Toasts: tree via --windows plus PIXELS
say "== TOASTS pixels (frames after action vs baseline) and --windows tree"
open toasts; dump t0; shotn tb0; sleep 1; shotn tb1; say "  noise control baseline vs second baseline changed_px=$(px $OUT/tb0.png $OUT/tb1.png)"
tapn "Save + Undo" t0; sleep 1.2; shotn ts1; adb shell uiautomator dump --windows /sdcard/w.xml >/dev/null 2>&1; adb pull /sdcard/w.xml $OUT/win-save.xml >/dev/null 2>&1
say "  save toast: changed_px vs baseline=$(px $OUT/tb0.png $OUT/ts1.png); 'Saved to collection' in --windows dump=$(grep -c 'Saved to collection' $OUT/win-save.xml 2>/dev/null) Undo nodes=$(grep -c 'text=\"Undo\"\|content-desc=\"Undo\"' $OUT/win-save.xml 2>/dev/null)"
sleep 7; shotn ts2; say "  save toast after 8s: changed_px vs baseline=$(px $OUT/tb0.png $OUT/ts2.png)"
tapn "Clear all" t0; sleep 1.5; tapn "Persistent error" t0; sleep 1.2; shotn te1; sleep 8; shotn te2; adb shell uiautomator dump --windows /sdcard/w.xml >/dev/null 2>&1; adb pull /sdcard/w.xml $OUT/win-err.xml >/dev/null 2>&1
say "  persistent error: vs baseline @1.2s=$(px $OUT/tb0.png $OUT/te1.png) @9.2s=$(px $OUT/tb0.png $OUT/te2.png) @1.2s vs @9.2s=$(px $OUT/te1.png $OUT/te2.png); 'Upload failed' in windows dump=$(grep -c 'Upload failed' $OUT/win-err.xml 2>/dev/null)"
tapn "Clear all" t0; sleep 1.8; shotn te3; say "  after Clear all: vs baseline=$(px $OUT/tb0.png $OUT/te3.png)"
tapn "Clear all" t0; sleep 1; tapn "Queue five" t0; sleep 1.2; shotn tq1; sleep 5; shotn tq2; sleep 8; shotn tq3; say "  queue five: vs baseline @1.2s=$(px $OUT/tb0.png $OUT/tq1.png) @6.2s=$(px $OUT/tb0.png $OUT/tq2.png) @14.2s=$(px $OUT/tb0.png $OUT/tq3.png); consecutive diffs q1-q2=$(px $OUT/tq1.png $OUT/tq2.png) q2-q3=$(px $OUT/tq2.png $OUT/tq3.png)"
say "  crash=$(crash)"
# ---- Capsule tap/drag by coordinates between the 'Native demo' label and the State text
say "== CAPSULE tap/drag by coordinates"
open capsule; dump c0; tapn idle c0; sleep 2; dump c1; L c1
A=$(P "Native demo" c1); B=$(P "State:" c1); say "  label=[$A] state=[$B] before: $(grep -o 'State: [a-z]*' $OUT/ui-c1.xml | head -1)"
if [ -n "$A" ] && [ -n "$B" ]; then set -- $A; ay=$2; set -- $B; by=$2; MY=$(( (ay + by) / 2 )); say "  capsule tap y=$MY"
  adb shell input tap 540 $MY; sleep 2; dump c2; say "  tap1 -> $(grep -o 'State: [a-z]*' $OUT/ui-c2.xml | head -1)"
  adb shell input tap 540 $MY; sleep 2; dump c3; say "  tap2 -> $(grep -o 'State: [a-z]*' $OUT/ui-c3.xml | head -1)"
  adb shell input swipe 540 $MY 540 $(( MY + 400 )) 400; sleep 2; dump c4; say "  swipe down -> $(grep -o 'State: [a-z]*' $OUT/ui-c4.xml | head -1)"
  adb shell input swipe 540 $MY 540 $(( MY - 300 )) 400; sleep 2; dump c5; say "  swipe up -> $(grep -o 'State: [a-z]*' $OUT/ui-c5.xml | head -1)"; fi
say "  crash=$(crash)"
# ---- Chart Replay pixels
say "== CHART REPLAY pixels (frame series after Replay vs no-action control)"
frames() { for i in $(seq 1 "$2"); do echo "$(date +%s.%N)" >> "$OUT/$1.times"; adb exec-out screencap -p > "$OUT/$1-$i.png"; done; }
open chart; dump r0; sleep 4; rm -f $OUT/rctl.times; frames rctl 8
open chart; dump r0; sleep 4; shotn rbase; P1=$(C Replay r0); say "  replay node=[$P1]"
rm -f $OUT/rrep.times; [ -n "$P1" ] && { adb shell input tap $P1 & frames rrep 12; wait; }
sleep 2; shotn rfinal
say "  control series (no action) changed_px vs first: $(px $OUT/rctl-1.png $OUT/rctl-2.png $OUT/rctl-3.png $OUT/rctl-4.png $OUT/rctl-8.png)"
say "  replay frames changed_px vs pre-replay baseline: $(px $OUT/rbase.png $OUT/rrep-1.png $OUT/rrep-2.png $OUT/rrep-3.png $OUT/rrep-4.png $OUT/rrep-5.png $OUT/rrep-6.png $OUT/rrep-8.png $OUT/rrep-12.png $OUT/rfinal.png)"
say "  replay spacing s: $(python3 -c "t=[float(x) for x in open('$OUT/rrep.times').read().split()]; print([round(t[i+1]-t[i],2) for i in range(len(t)-1)])")"
say "  crash=$(crash)"
