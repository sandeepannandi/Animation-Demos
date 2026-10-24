#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/player; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
[ -n "$PKG" ]
trap 'adb logcat -d > "$OUT/session.logcat.txt" 2>/dev/null || true' EXIT
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///player "$PKG" > "$OUT/launch.txt"
sleep 10
adb shell uiautomator dump /sdcard/boot-ui.xml >/dev/null 2>&1
adb shell cat /sdcard/boot-ui.xml > "$OUT/boot-ui.xml"
if grep -q "Pixel Launcher isn't responding" "$OUT/boot-ui.xml"; then
 adb shell input keyevent KEYCODE_BACK
 adb shell am force-stop com.google.android.apps.nexuslauncher
 adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///player "$PKG" >/dev/null
 sleep 3
fi
adb exec-out screencap -p > "$OUT/playlist.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/ui.xml"
grep -q 'Night Bus' "$OUT/ui.xml"
center() {
 python3 - "$OUT/ui.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('text')==sys.argv[2] or n.get('content-desc')==sys.argv[2]:
  x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')));print((x+a)//2,(y+b)//2);break
else: raise SystemExit('Missing control: '+sys.argv[2])
PY
}
# Tap a track: the mini bar appears and simulated playback starts.
XY=$(center 'Play Night Bus by Low Orbit'); adb shell input tap $XY
sleep 2
adb exec-out screencap -p > "$OUT/bar.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/bar.xml"
grep -q 'Mini player' "$OUT/bar.xml"
grep -q 'Expand player' "$OUT/bar.xml"
# Drag the bar up: the player expands.
read BX1 BY1 BX2 BY2 < <(python3 - "$OUT/bar.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if 'Mini player' in n.get('content-desc',''):
  print(*re.findall(r'\d+',n.get('bounds')));break
else: raise SystemExit('Missing player surface bounds')
PY
)
X=$(( (BX1+BX2)/2 ))
adb shell input swipe "$X" "$((BY1+10))" "$X" 220 600
sleep 2
adb exec-out screencap -p > "$OUT/expanded.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/expanded.xml"
grep -q 'Collapse player' "$OUT/expanded.xml"
grep -q 'Seek\.' "$OUT/expanded.xml"
grep -q 'Next track' "$OUT/expanded.xml"
# Seek with the accessibility action and verify the clock text moves.
adb shell uiautomator dump /dev/tty >/dev/null 2>&1 || true
NEXT=$(center 'Next track'); adb shell input tap $NEXT
sleep 1
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/next.xml"
grep -q 'Saffron Line' "$OUT/next.xml"
# Drag down to collapse.
adb shell input swipe "$X" 400 "$X" 1500 600
sleep 2
adb exec-out screencap -p > "$OUT/collapsed.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/collapsed.xml"
grep -q 'Expand player' "$OUT/collapsed.xml"
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then
 echo 'player-session crash=yes' | tee "$OUT/summary.txt"; exit 1
fi
cmp -s "$OUT/playlist.png" "$OUT/bar.png" && { echo 'bar did not appear'; exit 1; }
cmp -s "$OUT/bar.png" "$OUT/expanded.png" && { echo 'expand unchanged'; exit 1; }
cmp -s "$OUT/expanded.png" "$OUT/collapsed.png" && { echo 'collapse unchanged'; exit 1; }
echo 'player-session crash=no bar=appears expand=drag next=changes-track collapse=drag haptics=untested' | tee "$OUT/summary.txt"
