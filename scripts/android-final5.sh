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

# ---- Remaining gestures. Sources: ToastStack toastLogic.shouldDismiss: dismiss when |dx|>64 or |dy|>64 or (|dx|>12 and |vx|>0.6) or (|dy|>12 and |vy|>0.6); card PanResponder starts on move >8.
# LiquidTabs: holding the ACTIVE tab for holdDelay=280ms starts a scrub; moveX picks the tab under the finger (cell = track width/4); release leaves the last tab selected; a swipe without a hold has no source-defined slide.
say "== LIQUID TABS hold-and-slide (observable: selected attribute of tab nodes)"
tabsel() { say "  $1 -> Home=$(SEL Home $2) Explore=$(SEL Explore $2) Saved=$(SEL Saved $2) You=$(SEL You $2)"; }
open glass; dump a0; tabsel initial a0
HP=$(P Home a0); EP=$(P Explore a0); SP=$(P Saved a0); YP=$(P You a0); say "  tab centers Home=[$HP] Explore=[$EP] Saved=[$SP] You=[$YP]"
set -- $HP; HX=$1; TYY=$2; set -- $EP; EX=$1; set -- $SP; SX=$1; set -- $YP; YX=$1
slide() { # name from-x then target xs, hold seconds
  local nm=$1 hold=$2 start=$3; shift 3
  adb shell input motionevent DOWN $start $TYY; sleep $hold
  for tx in "$@"; do adb shell input motionevent MOVE $tx $TYY; sleep 0.4; done
  dump m_$nm; adb shell input motionevent UP ${!#} $TYY; sleep 1.5; dump r_$nm
  tabsel "$nm held ${hold}s then slid to [$*]: during" m_$nm; tabsel "$nm after release" r_$nm; }
# 1 hold Home 0.8s, slide right through Explore to Saved, release
slide hold1 0.8 $HX $(( HX + (EX-HX)/2 )) $EX $(( (EX+SX)/2 )) $SX
# 2 now Saved is active: hold it, slide to You, then back left to Explore
slide hold2 0.8 $SX $(( (SX+YX)/2 )) $YX $(( (YX+SX)/2 )) $SX $(( (SX+EX)/2 )) $EX
# 3 Explore active: hold, slide left to Home
slide hold3 0.8 $EX $(( (EX+HX)/2 )) $HX
# control A: no hold (touch down and move immediately) from the active tab to You
adb shell input motionevent DOWN $HX $TYY; adb shell input motionevent MOVE $(( (HX+YX)/2 )) $TYY; adb shell input motionevent MOVE $YX $TYY; adb shell input motionevent UP $YX $TYY; sleep 1.5; dump ca; tabsel "control no-hold move Home->You (no source expectation; raw)" ca
# control B: hold a NON-active tab (Explore while Home active), then slide to You; source: onLongPress only set on the active tab
open glass; dump b0; tabsel "fresh" b0
adb shell input motionevent DOWN $EX $TYY; sleep 0.8; adb shell input motionevent MOVE $(( (EX+SX)/2 )) $TYY; sleep 0.4; adb shell input motionevent MOVE $YX $TYY; sleep 0.4; dump bm; adb shell input motionevent UP $YX $TYY; sleep 1.5; dump br; tabsel "control hold non-active Explore, slide to You: during" bm; tabsel "after release" br
say "  crash=$(crash)"
say "== TOAST vertical and small-move dismissals (Persistent error toast, baseline = screen after Clear all)"
shotn() { adb exec-out screencap -p > "$OUT/$1.png"; }
open toasts; dump t0; tapn "Clear all" t0; sleep 1.5; shotn tz0; sleep 1; shotn tz0b; say "  noise control baseline vs second baseline px=$(px $OUT/tz0.png $OUT/tz0b.png)"
TY=2166
mk() { tapn "Clear all" t0; sleep 1.5; tapn "Persistent error" t0; sleep 1.5; shotn $1p; }
mk v1; say "  toast present vs baseline=$(px $OUT/tz0.png $OUT/v1p.png)"
sleep 3; shotn v1q; say "  unmoved control at +3s vs first frame=$(px $OUT/v1p.png $OUT/v1q.png)"
adb shell input swipe 540 $TY 540 $(( TY + 220 )) 300; sleep 1.5; shotn v1a; say "  swipe DOWN 220px/300ms (source: |dy|>64 dismisses): vs baseline=$(px $OUT/tz0.png $OUT/v1a.png) vs toast frame=$(px $OUT/v1p.png $OUT/v1a.png)"
mk v2; adb shell input swipe 540 $TY 540 $(( TY - 220 )) 300; sleep 1.5; shotn v2a; say "  swipe UP 220px/300ms (|dy|>64): vs baseline=$(px $OUT/tz0.png $OUT/v2a.png) vs toast frame=$(px $OUT/v2p.png $OUT/v2a.png)"
mk v3; adb shell input swipe 540 $TY 540 $(( TY + 30 )) 900; sleep 1.5; shotn v3a; say "  slow short swipe DOWN 30px/900ms (|dy|<64, vy~0.03; source says stays): vs baseline=$(px $OUT/tz0.png $OUT/v3a.png) vs toast frame=$(px $OUT/v3p.png $OUT/v3a.png)"
mk v4; adb shell input swipe 540 $TY 600 $(( TY + 40 )) 300; sleep 1.5; shotn v4a; say "  diagonal 60x40px/300ms (|dx|=60,|dy|=40 both <=64; vx=0.2,vy=0.13; source says stays): vs baseline=$(px $OUT/tz0.png $OUT/v4a.png) vs toast frame=$(px $OUT/v4p.png $OUT/v4a.png)"
mk v5; adb shell input swipe 540 $TY 570 $(( TY + 40 )) 80; sleep 1.5; shotn v5a; say "  fast flick 30x40px/80ms (|dy|=40>12 and vy=0.5; source: needs vy>0.6, so borderline; raw only): vs baseline=$(px $OUT/tz0.png $OUT/v5a.png) vs toast frame=$(px $OUT/v5p.png $OUT/v5a.png)"
say "  crash=$(crash)"
