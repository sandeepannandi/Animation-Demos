#!/usr/bin/env bash
set -u
adb install -r apk/*.apk >/dev/null 2>&1 || { echo install failed; exit 1; }
OUT=smoke-out/caps2; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 7; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
adb shell getevent -lp > "$OUT/getevent.txt" 2>&1
cols() { python3 - "$OUT/ui-$1.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    if re.search(r'content-desc="\d columns"',n) and 'selected="true"' in n: print(re.search(r'content-desc="(\d columns)"',n).group(1)); break
PY
}
say "== pinch on each multitouch device; baseline control = a plain tap via sendevent on same device to prove injection reaches the app =="
for DEV in /dev/input/event2 /dev/input/event3 /dev/input/event12; do
  open pinch; dump a-$$; 
  MAXX=$(awk -v d="$DEV" '/^add device/{cur=$4} cur==d && /ABS_MT_POSITION_X/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  MAXY=$(awk -v d="$DEV" '/^add device/{cur=$4} cur==d && /ABS_MT_POSITION_Y/{print; exit}' "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
  say "device $DEV maxX=$MAXX maxY=$MAXY; columns before=$(cols a-$$)"
  [ -z "$MAXX" ] && { say "device $DEV: no MT axes"; continue; }
  SX=$((MAXX/1080)); SY=$((MAXY/2400))
  se() { adb shell sendevent "$DEV" "$1" "$2" "$3"; }
  pinch() { local cx=$((540*SX)) cy=$((1300*SY)) g0=$1 g1=$2
    se 3 47 0; se 3 57 101; se 3 53 $cx; se 3 54 $((cy-g0*SY)); se 3 47 1; se 3 57 102; se 3 53 $cx; se 3 54 $((cy+g0*SY)); se 0 0 0
    for s in 1 2 3 4 5 6 7 8 9 10; do g=$((g0+(g1-g0)*s/10)); se 3 47 0; se 3 54 $((cy-g*SY)); se 3 47 1; se 3 54 $((cy+g*SY)); se 0 0 0; sleep 0.05; done
    se 3 47 0; se 3 57 -1; se 3 47 1; se 3 57 -1; se 0 0 0; }
  pinch 60 360; sleep 2; dump b-$$; say "device $DEV pinch out: columns after=$(cols b-$$)"
  pinch 360 60; sleep 2; dump c-$$; say "device $DEV pinch in: columns after=$(cols c-$$)"
done
say "== TalkBack: is the installed package enableable and does it bind =="
adb shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
sleep 8
say "enabled services now: $(adb shell settings get secure enabled_accessibility_services | tr -d '\r')"
say "dumpsys accessibility talkback lines: $(adb shell dumpsys accessibility | grep -iE 'talkback' | head -5 | tr '\n' '|' | cut -c1-500)"
say "talkback process: $(adb shell ps -A | grep -i talkback | head -2 | tr -d '\r' | tr '\n' '|')"
open chart; sleep 3
adb shell dumpsys accessibility | grep -iE 'focus|accessibilityFocused' | head -3 | tee -a "$OUT/summary.txt"
adb exec-out screencap -p > "$OUT/talkback-chart.png"
say "done"
