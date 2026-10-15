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

# coordinates measured from the Save-toast frame of run 38739266555 (1080x2400): toast body y~2166, Undo x~813, X x~932
UX=813; XX=932; TY=2166
# ---- Capsule: hit region grounded from the tree: node desc 'Focus session, <state>...' (source: Pressable absoluteFill inside the pan-handler view; DRAG_RANGE=120 px per state; tap cycles idle,compact,expanded)
say "== CAPSULE tap/drag at the node's own center"
st() { grep -o 'State: [a-z]*' "$OUT/ui-$1.xml" | head -1; }
nd() { grep -o 'content-desc="Focus session[^"]*"' "$OUT/ui-$1.xml" | head -1; }
open capsule; dump k0; CP=$(P "Focus session" k0); say "  node center=[$CP] before: $(st k0) | $(nd k0)"; shotn cap0
if [ -n "$CP" ]; then set -- $CP; CX=$1; CY=$2
  adb shell input tap $CX $CY; sleep 2; dump k1; shotn cap1; say "  tap1 -> $(st k1) | $(nd k1)"
  adb shell input tap $CX $CY; sleep 2; dump k2; shotn cap2; say "  tap2 -> $(st k2) | $(nd k2)"
  adb shell input tap $CX $CY; sleep 2; dump k3; shotn cap3; say "  tap3 (cycle) -> $(st k3) | $(nd k3)"
  CP3=$(P "Focus session" k3); set -- $CP3; CX=$1; CY=$2
  adb shell input swipe $CX $CY $CX $(( CY + 140 )) 700; sleep 2; dump k4; shotn cap4; say "  drag down 140px from $(st k3) -> $(st k4) | $(nd k4)"
  CP4=$(P "Focus session" k4); set -- $CP4; CX=$1; CY=$2
  adb shell input swipe $CX $CY $CX $(( CY + 300 )) 700; sleep 2; dump k5; shotn cap5; say "  drag down 300px -> $(st k5) | $(nd k5)"
  CP5=$(P "Focus session" k5); set -- $CP5; CX=$1; CY=$2
  adb shell input swipe $CX $CY $CX $(( CY - 300 )) 700; sleep 2; dump k6; shotn cap6; say "  drag up 300px -> $(st k6) | $(nd k6)"
  say "  capsule frames cap0..cap6 saved"
fi
say "  crash=$(crash)"
# ---- Toast: Undo, X, swipe dismiss, hold pause (source: DEFAULT 5000ms; Undo runs action then dismisses and toasts 'Save undone'; PanResponder pauses the timer while dragging/held; swipe dismisses by shouldDismiss)
say "== TOASTS interactions"
open toasts; dump t0; shotn u0
tapn "Clear all" t0; sleep 1
tapn "Save + Undo" t0; sleep 1.2; shotn u1; dump u1x; L u1x; say "  save toast tree lines containing Undo/Dismiss: $(grep -c -E 'Undo|Dismiss' $OUT/list-u1x.txt)"
adb shell input tap $UX $TY; sleep 1.0; shotn u2; sleep 1.0; shotn u2b; sleep 8; shotn u3
say "  UNDO tap: baseline vs save@1.2s=$(px $OUT/u0.png $OUT/u1.png) ; after Undo tap @1.0s vs save frame=$(px $OUT/u1.png $OUT/u2.png) ; @2.0s=$(px $OUT/u1.png $OUT/u2b.png); @10s vs baseline=$(px $OUT/u0.png $OUT/u3.png)"
tapn "Clear all" t0; sleep 1.5; tapn "Save + Undo" t0; sleep 1.2; shotn x1; adb shell input tap $XX $TY; sleep 1.2; shotn x2; say "  X dismiss: save frame vs baseline=$(px $OUT/u0.png $OUT/x1.png); after X tap vs baseline=$(px $OUT/u0.png $OUT/x2.png)"
tapn "Clear all" t0; sleep 1.5; tapn "Persistent error" t0; sleep 1.2; shotn w1; sleep 3; shotn w1b
adb shell input swipe 300 $TY 950 $TY 250; sleep 1.2; shotn w2; say "  SWIPE: persistent error present @1.2s vs baseline=$(px $OUT/u0.png $OUT/w1.png), unchanged @4.2s (control, no swipe)=$(px $OUT/w1.png $OUT/w1b.png); after horizontal swipe vs baseline=$(px $OUT/u0.png $OUT/w2.png)"
tapn "Clear all" t0; sleep 1.5; tapn "Save + Undo" t0; sleep 1.0; adb shell input motionevent DOWN 400 $TY; sleep 1; shotn h1; sleep 7; shotn h2
adb shell input motionevent UP 400 $TY; sleep 1; shotn h3; sleep 7; shotn h4
say "  HOLD: toast shown; held ~8s (past the 5s default): present while held? held@2s vs baseline=$(px $OUT/u0.png $OUT/h1.png) held@9s vs baseline=$(px $OUT/u0.png $OUT/h2.png) 1s after release vs baseline=$(px $OUT/u0.png $OUT/h3.png) 8s after release vs baseline=$(px $OUT/u0.png $OUT/h4.png)"
say "  crash=$(crash)"
