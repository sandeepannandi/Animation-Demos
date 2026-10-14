#!/usr/bin/env bash
# Clean pinch (with injection-validity control) and TalkBack walkthrough attempt. Verification only. Raw evidence saved; nothing retried to force a pass.
set -u
adb install -r apk/*.apk >/dev/null 2>&1 || { echo install failed; exit 1; }
OUT=smoke-out/caps3; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
PYH=$OUT/h.py
cat > "$PYH" <<'PY'
import re,sys
mode,needle,f=sys.argv[1],sys.argv[2],sys.argv[3]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    t=re.search(r' text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    t=t.group(1) if t else ''; d=d.group(1) if d else ''
    if mode=='center' and (needle==t or needle==d or (needle in d and needle!='')) and b:
        b=tuple(map(int,b.groups())); print((b[0]+b[2])//2,(b[1]+b[3])//2); break
    if mode=='anr' and "isn't responding" in t: print('anr')
    if mode=='selcols' and re.search(r'^\d columns$',d) and 'selected="true"' in n: print(d); break
PY
h() { python3 "$PYH" "$@"; }
clear_anr() { for i in 1 2 3; do dump anr; if [ "$(h anr x "$OUT/ui-anr.xml")" = anr ]; then say "ANR dialog seen; tapping Wait"; P=$(h center Wait "$OUT/ui-anr.xml"); [ -n "$P" ] && adb shell input tap $P || adb shell input keyevent KEYCODE_BACK; sleep 3; else return; fi; done; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 10; clear_anr; }
sleep 40; adb shell input keyevent KEYCODE_HOME; sleep 10; clear_anr
SZ=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1); W=${SZ%x*}; H=${SZ#*x}
say "screen $SZ"
adb shell getevent -lp > "$OUT/getevent.txt" 2>&1
DEVS=$(grep '^add device' "$OUT/getevent.txt" | awk '{print $4}' | while read d; do awk -v d="$d" '/^add device/{c=$4} c==d && /ABS_MT_POSITION_X/{print d; exit}' "$OUT/getevent.txt"; done)
say "== PINCH: injection validity control (single-finger sendevent tap on '5 columns') per device =="
GOOD=""
for DEV in $DEVS; do
  open pinch; dump a; B=$(h selcols x "$OUT/ui-a.xml"); P=$(h center '5 columns' "$OUT/ui-a.xml")
  MX=$(awk -v d="$DEV" '/^add device/{c=$4} c==d && /ABS_MT_POSITION_X/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  MY=$(awk -v d="$DEV" '/^add device/{c=$4} c==d && /ABS_MT_POSITION_Y/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  if [ -z "$P" ] || [ -z "$B" ]; then say "device $DEV: cannot read start state (before='$B' chip='$P')"; continue; fi
  PX=${P% *}; PY=${P#* }; RX=$((PX*MX/W)); RY=$((PY*MY/H))
  se() { adb shell sendevent "$DEV" "$1" "$2" "$3"; }
  se 3 47 0; se 3 57 201; se 3 53 $RX; se 3 54 $RY; se 0 0 0; sleep 0.15; se 3 57 -1; se 0 0 0; sleep 2; dump b; A=$(h selcols x "$OUT/ui-b.xml")
  say "device $DEV tap control: before=$B after=$A (tap at px $PX,$PY)"
  [ "$A" = "5 columns" ] && GOOD="$GOOD $DEV"
done
say "devices where injected touch reached the app:${GOOD:- none}"
for DEV in $GOOD; do
  open pinch; dump c; B=$(h selcols x "$OUT/ui-c.xml")
  MX=$(awk -v d="$DEV" '/^add device/{c=$4} c==d && /ABS_MT_POSITION_X/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  MY=$(awk -v d="$DEV" '/^add device/{c=$4} c==d && /ABS_MT_POSITION_Y/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  se() { adb shell sendevent "$DEV" "$1" "$2" "$3"; }
  CX=$((W/2)); CY=$((H*55/100))
  pinch() { local g0=$1 g1=$2
    se 3 47 0; se 3 57 101; se 3 53 $((CX*MX/W)); se 3 54 $(((CY-g0)*MY/H)); se 3 47 1; se 3 57 102; se 3 53 $((CX*MX/W)); se 3 54 $(((CY+g0)*MY/H)); se 0 0 0
    for s in 1 2 3 4 5 6 7 8 9 10 11 12; do g=$((g0+(g1-g0)*s/12)); se 3 47 0; se 3 54 $(((CY-g)*MY/H)); se 3 47 1; se 3 54 $(((CY+g)*MY/H)); se 0 0 0; sleep 0.06; done
    se 3 47 0; se 3 57 -1; se 3 47 1; se 3 57 -1; se 0 0 0; }
  say "device $DEV pinch test: columns before=$B"
  pinch 80 400; sleep 2.5; dump d; say "device $DEV two-finger OUT (80->400 px half-gap): columns after=$(h selcols x "$OUT/ui-d.xml")"; adb exec-out screencap -p > "$OUT/pinch-out.png"
  pinch 400 80; sleep 2.5; dump e; say "device $DEV two-finger IN (400->80 px half-gap): columns after=$(h selcols x "$OUT/ui-e.xml")"; adb exec-out screencap -p > "$OUT/pinch-in.png"
done
say "== TALKBACK walkthrough attempt =="
adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
sleep 15
for i in 1 2 3; do adb shell input keyevent KEYCODE_BACK; sleep 2; done
say "talkback bound: $(adb shell dumpsys accessibility | grep -c 'Bound services.*TalkBack')"
open swipe; adb logcat -c; sleep 2
adb exec-out screencap -p > "$OUT/tb-swipe-0.png"
dump t0
say "TalkBack on: nodes in Swipe screen dump: $(grep -c '<node' "$OUT/ui-t0.xml")"
for i in 1 2 3 4 5 6; do adb shell input keycombination KEYCODE_ALT_LEFT KEYCODE_DPAD_RIGHT; sleep 1.5; done
adb logcat -d -b all > "$OUT/tb-logcat-swipe.txt" 2>&1
say "after 6 Alt+Right next-item shortcuts: talkback log lines=$(grep -ciE 'talkback|marvin' "$OUT/tb-logcat-swipe.txt") speech-like lines=$(grep -ciE 'speak|utterance|Speech' "$OUT/tb-logcat-swipe.txt")"
grep -iE 'marvin|talkback' "$OUT/tb-logcat-swipe.txt" | grep -iE 'speak|utterance|speech|focus' | head -30 | cut -c1-300 >> "$OUT/summary.txt"
# explore-by-touch on the chart scrubber and on pinch chips
open chart; adb logcat -c; dump t1; P=$(h center 'Weekly activity' "$OUT/ui-t1.xml"); say "chart node center under TalkBack: ${P:-not found}"
[ -n "$P" ] && { adb shell input tap $P; sleep 2; }
adb logcat -d -b all | grep -iE 'marvin|talkback' | grep -iE 'speak|utterance|speech|focus' | head -20 | cut -c1-300 >> "$OUT/summary.txt"
adb exec-out screencap -p > "$OUT/tb-chart.png"
crash=no; adb logcat -d | grep -q "Fatal signal" && crash=yes; say "crash during run=$crash"
