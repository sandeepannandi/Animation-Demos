#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/timeline; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
[ -n "$PKG" ]
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///timeline "$PKG" > "$OUT/launch.txt"
sleep 10
adb exec-out screencap -p > "$OUT/rest.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/ui.xml"
grep -q 'Timeline trim' "$OUT/ui.xml"
center() {
 python3 - "$OUT/ui.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('text')==sys.argv[2] or n.get('content-desc')==sys.argv[2]:
  x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')));print((x+a)//2,(y+b)//2);break
else: raise SystemExit('Missing control: '+sys.argv[2])
PY
}
XY=$(center 'Zoom in'); adb shell input tap $XY
sleep .2; adb exec-out screencap -p > "$OUT/zoom-moving.png"
sleep 2; adb exec-out screencap -p > "$OUT/zoomed.png"
XY=$(center 'Start +'); adb shell input tap $XY
sleep 1; adb exec-out screencap -p > "$OUT/adjusted.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/adjusted.xml"
grep -q '00:25' "$OUT/adjusted.xml"
# Locate the actual interaction bounds, not emulator-specific constants.
read X1 Y1 X2 Y2 < <(python3 - "$OUT/ui.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('content-desc','').startswith('Timeline trim.'):
  print(*re.findall(r'\d+',n.get('bounds')));break
else: raise SystemExit('Missing timeline interaction bounds')
PY
)
SX=$((X1+(X2-X1)*7/10)); EX=$((X1+(X2-X1)*4/10)); Y=$((Y1+(Y2-Y1)*255/300))
adb shell input swipe "$SX" "$Y" "$EX" "$Y" 450
sleep 2; adb exec-out screencap -p > "$OUT/panned.png"
# Reset and exercise native trim/playhead gestures against known source geometry.
XY=$(center 'Reset'); adb shell input tap $XY; sleep 1
A=$((X1+(X2-X1)*80/340)); B=$((X1+(X2-X1)*115/340)); TY=$((Y1+(Y2-Y1)*175/300))
adb shell input swipe "$A" "$TY" "$B" "$TY" 700
sleep 2; adb exec-out screencap -p > "$OUT/trimmed.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/trimmed.xml"
grep -q '00:38' "$OUT/trimmed.xml"
A=$((X1+(X2-X1)*140/340)); B=$((X1+(X2-X1)*180/340)); PY=$((Y1+(Y2-Y1)*100/300))
adb shell input swipe "$A" "$PY" "$B" "$PY" 700
sleep 2; adb exec-out screencap -p > "$OUT/playhead.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/playhead.xml"
grep -q '01:04' "$OUT/playhead.xml"
adb shell getevent -lp > "$OUT/input-devices.txt"
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then
 echo 'timeline-session crash=yes' | tee "$OUT/summary.txt"; exit 1
fi
cmp -s "$OUT/rest.png" "$OUT/zoomed.png" && { echo 'zoom unchanged'; exit 1; }
cmp -s "$OUT/zoomed.png" "$OUT/panned.png" && { echo 'pan unchanged'; exit 1; }
echo 'timeline-session crash=no zoom=changed range=25s pan=changed trim=38s playhead=64s pinch=untested haptics=untested' | tee "$OUT/summary.txt"
