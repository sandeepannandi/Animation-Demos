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
python3 - "$OUT/trimmed.xml" <<'PYTEST'
import sys,re,xml.etree.ElementTree as E
values=[n.get('text','') for n in E.parse(sys.argv[1]).iter('node') if '→' in n.get('text','')]
assert values, 'Missing source selection output'
numbers=re.findall(r'(\d+):(\d+\.\d+)',values[0]);start=int(numbers[0][0])*60+float(numbers[0][1]);end=int(numbers[1][0])*60+float(numbers[1][1]);assert 35<start<45 and end==84,values
PYTEST
A=$((X1+(X2-X1)*140/340)); B=$((X1+(X2-X1)*180/340)); PY=$((Y1+(Y2-Y1)*100/300))
adb shell input swipe "$A" "$PY" "$B" "$PY" 700
sleep 2; adb exec-out screencap -p > "$OUT/playhead.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/playhead.xml"
python3 - "$OUT/playhead.xml" <<'PYTEST'
import sys,re,xml.etree.ElementTree as E
values=[n.get('text','') for n in E.parse(sys.argv[1]).iter('node')]
assert any(re.fullmatch(r'01:0[0-9]\.\d+',v) for v in values),values
assert any('01:24.00' in v and '→' in v for v in values),values
PYTEST
adb shell getevent -lp > "$OUT/input-devices.txt"
XY=$(center 'Reset'); adb shell input tap $XY; sleep 1
# Legacy UiAutomator injects two real MotionEvent pointer streams, not a zoom-button surrogate.
SDK=${ANDROID_SDK_ROOT:-${ANDROID_HOME:-/usr/local/lib/android/sdk}}
ANDROID_JAR=$(find "$SDK/platforms" -name android.jar | sort -V | tail -1)
UI_JAR=$(dirname "$ANDROID_JAR")/uiautomator.jar
BUILD_TOOLS=$(find "$SDK/build-tools" -name d8 | sort -V | tail -1)
mkdir -p /tmp/timeline-pinch/classes /tmp/timeline-pinch/dex
javac -source 8 -target 8 -cp "$ANDROID_JAR:$UI_JAR" -d /tmp/timeline-pinch/classes scripts/TimelinePinch.java
"$BUILD_TOOLS" --lib "$ANDROID_JAR" --lib "$UI_JAR" --output /tmp/timeline-pinch/dex /tmp/timeline-pinch/classes/TimelinePinch.class
(cd /tmp/timeline-pinch/dex && jar cf ../timeline-pinch.jar classes.dex)
adb push /tmp/timeline-pinch/timeline-pinch.jar /data/local/tmp/ >/dev/null
adb shell uiautomator runtest timeline-pinch.jar -c TimelinePinch > "$OUT/pinch-test.txt"
grep -q 'OK (1 test)' "$OUT/pinch-test.txt"
sleep 2; adb exec-out screencap -p > "$OUT/pinched.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/pinched.xml"
# Require an actual zoom-level change away from fit after the two-pointer gesture.
if grep -q 'text="1.0×"' "$OUT/pinched.xml"; then echo 'Pinch did not change zoom'; exit 1; fi
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then
 echo 'timeline-session crash=yes' | tee "$OUT/summary.txt"; exit 1
fi
cmp -s "$OUT/rest.png" "$OUT/zoomed.png" && { echo 'zoom unchanged'; exit 1; }
cmp -s "$OUT/zoomed.png" "$OUT/panned.png" && { echo 'pan unchanged'; exit 1; }
echo 'timeline-session crash=no zoom=changed range=25s pan=changed trim=source-changed playhead=source-changed pinch=two-pointer haptics=untested' | tee "$OUT/summary.txt"
