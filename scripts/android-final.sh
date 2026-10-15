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
# warm-up: clear any ANR dialog
sleep 45; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1
open glass; dump w; if grep -q "isn't responding" "$OUT/ui-w.xml"; then say "warmup ANR dialog present, tapping Wait"; W=$(C Wait w); [ -n "$W" ] && adb shell input tap $W; sleep 5; fi
# ---- 1 Liquid Tabs: observable = hidden node 'Selected: X'
say "== LIQUID TABS (glass) observable: node desc 'Selected: <tab>'"
open glass; dump g0; L g0; say "  before: $(grep -o 'Selected: [A-Za-z]*' $OUT/ui-g0.xml | head -1)"
for TB in Explore Saved You Home Home; do tapn "$TB" g0; sleep 2; dump g1; say "  tap $TB -> $(grep -o 'Selected: [A-Za-z]*' $OUT/ui-g1.xml | head -1)"; cp "$OUT/ui-g1.xml" "$OUT/ui-g0.xml"; done
say "  crash=$(crash)"
# ---- 2 Toast Stack
say "== TOAST STACK (toasts) observable: toast text nodes"
open toasts; dump t0; L t0
tapn "Clear all" t0; sleep 1
tapn "Save + Undo" t0; sleep 1.5; dump t1; say "  save: 'Saved to collection' present=$(H 'Saved to collection' t1) Undo present=$(H Undo t1)"
tapn Undo t1; sleep 1.5; dump t2; say "  undo: 'Save undone' present=$(H 'Save undone' t2) 'Saved to collection' present=$(H 'Saved to collection' t2)"
tapn "Clear all" t2; sleep 1.5; dump t3; say "  clear all: 'Save undone' present=$(H 'Save undone' t3)"
tapn "Queue five" t3; sleep 1.5; dump q1; say "  queue five @1.5s: $(grep -o 'Message [0-9] of 5' $OUT/ui-q1.xml | sort -u | tr '\n' ',')"
sleep 7; dump q2; say "  queue five @8.5s: $(grep -o 'Message [0-9] of 5' $OUT/ui-q2.xml | sort -u | tr '\n' ',')"
sleep 8; dump q3; say "  queue five @16.5s: $(grep -o 'Message [0-9] of 5' $OUT/ui-q3.xml | sort -u | tr '\n' ',')"
tapn "Clear all" q3; sleep 1; tapn "Persistent error" q3; sleep 1.5; dump e1; sleep 8; dump e2; say "  persistent error @1.5s=$(H 'Upload failed' e1) @9.5s=$(H 'Upload failed' e2)"
tapn "Clear all" e2; sleep 1.5; dump e3; say "  after clear all: 'Upload failed' present=$(H 'Upload failed' e3)"
dump p0; say "  position before: $(grep -o 'Position: [a-z]*' $OUT/ui-p0.xml | head -1)"; tapn "Position: bottom" p0; sleep 1.5; dump p1; say "  position after tap: $(grep -o 'Position: [a-z]*' $OUT/ui-p1.xml | head -1)"
say "  crash=$(crash)"
# ---- 3 Morph Capsule
say "== MORPH CAPSULE (capsule) observable: text 'State: <x>' and selected buttons"
open capsule; dump c0; L c0; say "  before: $(grep -o 'State: [a-z]*' $OUT/ui-c0.xml | head -1)"
for S in expanded compact idle expanded; do tapn "$S" c0; sleep 2; dump c1; say "  button $S -> $(grep -o 'State: [a-z]*' $OUT/ui-c1.xml | head -1)"; cp "$OUT/ui-c1.xml" "$OUT/ui-c0.xml"; done
tapn idle c0; sleep 2; dump c2; CP=$(C "Focus session" c2); say "  capsule node 'Focus session' center=[$CP]"
if [ -n "$CP" ]; then adb shell input tap $CP; sleep 2; dump c3; say "  tap capsule from idle -> $(grep -o 'State: [a-z]*' $OUT/ui-c3.xml | head -1)"; adb shell input tap $CP; sleep 2; dump c4; say "  tap capsule again -> $(grep -o 'State: [a-z]*' $OUT/ui-c4.xml | head -1)"
  set -- $CP; adb shell input swipe $1 $2 $1 $(( $2 + 500 )) 400; sleep 2; dump c5; say "  swipe down on capsule -> $(grep -o 'State: [a-z]*' $OUT/ui-c5.xml | head -1)"
  CP2=$(C "Focus session" c5); [ -n "$CP2" ] && { set -- $CP2; adb shell input swipe $1 $2 $1 $(( $2 - 500 )) 400; sleep 2; dump c6; say "  swipe up on capsule -> $(grep -o 'State: [a-z]*' $OUT/ui-c6.xml | head -1)"; }; fi
say "  crash=$(crash)"
# ---- 4 Sort cancel (second injected tap while a drag is held)
say "== DRAG TO SORT cancel observable: row text order in tree"
order() { python3 "$PY" list x "$OUT/ui-$1.xml" | sed -n 's/.*text=\[\([^]]*\)\].*/\1/p' | tr '\n' '|'; }
open sort; dump s0; say "  initial order: $(order s0)"
adb shell input motionevent DOWN 900 824; sleep 0.6; adb shell input motionevent MOVE 900 1000; sleep 0.5; dump s1; say "  held order: $(order s1)"; L s1
BTN=$(C "Cancel reorder" s1); [ -z "$BTN" ] && BTN=$(P "Cancel" s1); say "  cancel node=[$BTN]"
[ -n "$BTN" ] && adb shell input tap $BTN; sleep 1; adb shell input motionevent UP 900 1000; sleep 2; dump s2; say "  after cancel+release order: $(order s2)"
open sort; dump s3; adb shell input motionevent DOWN 900 824; sleep 0.6; adb shell input motionevent MOVE 900 900; sleep 0.4; adb shell input motionevent MOVE 900 1100; sleep 0.8; adb shell input motionevent UP 900 1100; sleep 3; dump s4
say "  control (no cancel): order before=$(order s3) after drag+release=$(order s4)"
say "  crash=$(crash)"
# ---- 5 Chart replay
say "== CHART REPLAY observable: accessibility nodes before/during/after Replay; value node by scrub"
open chart; dump r0; L r0; say "  before nodes: $(wc -l < $OUT/list-r0.txt)"
tapn Replay r0; for i in 1 2 3; do sleep 0.4; dump r$i; L r$i; done; sleep 3; dump r5; L r5
say "  nodes during(+0.4..): $(wc -l < $OUT/list-r1.txt) $(wc -l < $OUT/list-r2.txt) $(wc -l < $OUT/list-r3.txt) after: $(wc -l < $OUT/list-r5.txt); tree identical before vs after=$(cmp -s $OUT/list-r0.txt $OUT/list-r5.txt && echo yes || echo no) before vs during1=$(cmp -s $OUT/list-r0.txt $OUT/list-r1.txt && echo yes || echo no)"
say "  crash=$(crash)"
# ---- 6 PIXELS: Gooey close and Genie frame series
frames() { # name count
  for i in $(seq 1 "$2"); do echo "$(date +%s.%N)" >> "$OUT/$1.times"; adb exec-out screencap -p > "$OUT/$1-$i.png"; done; }
say "== GOONEY/GENIE PIXELS (frame series; internal sampling, spacing recorded in *.times; not a timing assertion)"
open gooey; dump g00; L g00; say "  gooey items before open: $(grep -c 'enabled\|en=' $OUT/list-g00.txt) lines"; cp "$OUT/list-g00.txt" "$OUT/gooey-closed-initial.txt"
adb shell input tap 540 1720; sleep 2.5; dump g01; L g01; cp "$OUT/list-g01.txt" "$OUT/gooey-open.txt"
rm -f "$OUT/gooey-close.times"; adb shell input tap 540 1720 & frames gooey-close 10; wait; sleep 1; dump g02; L g02; cp "$OUT/list-g02.txt" "$OUT/gooey-closed.txt"
say "  gooey tree closed-initial vs open identical=$(cmp -s $OUT/gooey-closed-initial.txt $OUT/gooey-open.txt && echo yes || echo no); open vs closed-after identical=$(cmp -s $OUT/gooey-open.txt $OUT/gooey-closed.txt && echo yes || echo no); closed-initial vs closed-after identical=$(cmp -s $OUT/gooey-closed-initial.txt $OUT/gooey-closed.txt && echo yes || echo no)"
open genie; rm -f "$OUT/genie-btn.times"; adb shell input tap 540 1500 & frames genie-btn 10; wait; sleep 1; adb exec-out screencap -p > "$OUT/genie-btn-final.png"
rm -f "$OUT/genie-ctl.times"; frames genie-ctl 10  # no-action control: frame series with nothing happening
pip install pillow -q 2>&1 | tail -1
python3 - <<'PY' | tee -a "$OUT/summary.txt"
import glob,os
from PIL import Image, ImageChops
O='smoke-out/final'
def d(a,b):
    A=Image.open(a).convert('L'); B=Image.open(b).convert('L')
    h=ImageChops.difference(A,B).point(lambda v:255 if v>24 else 0).histogram(); return h[255]
for name,final in (('gooey-close',None),('genie-btn','genie-btn-final.png'),('genie-ctl',None)):
    fr=sorted(glob.glob(f'{O}/{name}-[0-9]*.png'),key=lambda p:int(p.rsplit('-',1)[1][:-4]))
    if not fr: print('PIXELS',name,'no frames'); continue
    last=final and f'{O}/{final}' or fr[-1]
    ts=[float(t) for t in open(f'{O}/{name}.times').read().split()]
    print('PIXELS',name,'frames=%d spacing_s=%s'%(len(fr),[round(ts[i+1]-ts[i],2) for i in range(len(ts)-1)]))
    print('PIXELS',name,'changed_px_vs_last=',[d(f,last) for f in fr])
    print('PIXELS',name,'changed_px_vs_prev=',[d(fr[i],fr[i+1]) for i in range(len(fr)-1)])
PY
say "  crash=$(crash)"
# ---- 7 Pinch Gallery on final main (merged #93): UiAutomator two-finger gestures, observable = selected columns chip, with tap control, noise control and single-finger scroll control
say "== PINCH GALLERY final main (instrumented UiAutomator pinch; same tests as the pre-merge validation)"
adb install -r -t verifyapp/app/build/outputs/apk/debug/app-debug.apk 2>&1 | tail -1
adb shell input keyevent KEYCODE_HOME; sleep 3; adb logcat -c
for TST in control scrollcheck shapes; do adb shell am instrument -w -e class com.nativelet.verify.VerifyTest#$TST com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner 2>&1 | tee "$OUT/instr-$TST.txt" | tail -3; done
adb logcat -d | grep -E ' NLV ' | cut -c1-240 | tee "$OUT/pinch.txt" | grep -E 'CONTROL|SC |SHAPE|SCROLL|control' >> "$OUT/summary.txt"
