#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/seats; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
[ -n "$PKG" ]
trap 'adb logcat -d > "$OUT/session.logcat.txt" 2>/dev/null || true' EXIT
adb shell am force-stop "$PKG"
adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///seats "$PKG" > "$OUT/launch.txt"
sleep 10
# Pixel Launcher can show its own ANR dialog during emulator boot. Dismiss only
# that system-app dialog, never a Nativelet error, before locating test controls.
adb shell uiautomator dump /sdcard/boot-ui.xml >/dev/null 2>&1
adb shell cat /sdcard/boot-ui.xml > "$OUT/boot-ui.xml"
if grep -q "Pixel Launcher isn't responding" "$OUT/boot-ui.xml"; then
 adb shell input keyevent KEYCODE_BACK
 adb shell am force-stop com.google.android.apps.nexuslauncher
 adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///seats "$PKG" >/dev/null
 sleep 3
fi
adb exec-out screencap -p > "$OUT/rest.png"
adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
adb shell cat /sdcard/ui.xml > "$OUT/ui.xml"
grep -q 'Seat Selection' "$OUT/ui.xml"
grep -q 'Venue map.' "$OUT/ui.xml"
grep -q 'No seats yet' "$OUT/ui.xml"
center() {
 python3 - "$OUT/ui.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('text')==sys.argv[2] or n.get('content-desc')==sys.argv[2]:
  x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')));print((x+a)//2,(y+b)//2);break
else: raise SystemExit('Missing control: '+sys.argv[2])
PY
}
dump() { adb shell uiautomator dump "/sdcard/$1" >/dev/null 2>&1; adb shell cat "/sdcard/$1" > "$OUT/$1"; }
# Venue-step zoom control changes the camera.
XY=$(center 'Zoom in'); adb shell input tap $XY
sleep .2; adb exec-out screencap -p > "$OUT/zoom-moving.png"
sleep 2; adb exec-out screencap -p > "$OUT/zoomed.png"
XY=$(center 'Reset'); adb shell input tap $XY; sleep 1.5
# Tap a section label to fly into its seat map.
XY=$(center 'Premium Centre'); adb shell input tap $XY
sleep 2.5; adb exec-out screencap -p > "$OUT/section.png"
dump section.xml
grep -q 'Seat map.' "$OUT/section.xml"
grep -q 'No seats yet' "$OUT/section.xml"
# Tap known-available seat C5 of Premium Centre at its settled camera position.
# Fixture: block('p1', x=440, y=150, rows=5, perRow=8, pitch=36, seed=2);
# C5 world (612,235); sectionCamera scale .8995 center (594,243) -> canvas
# fraction (0.548, 0.476). Sold pattern hash marks C5 available.
read X1 Y1 X2 Y2 < <(python3 - "$OUT/section.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('content-desc','').startswith('Seat map.'):
  print(*re.findall(r'\d+',n.get('bounds')));break
else: raise SystemExit('Missing seat map interaction bounds')
PY
)
adb shell input tap $((X1+(X2-X1)*548/1000)) $((Y1+(Y2-Y1)*476/1000))
sleep 1; adb exec-out screencap -p > "$OUT/selected.png"
dump selected.xml
grep -q '1 seat' "$OUT/selected.xml"
grep -q '₹750' "$OUT/selected.xml"
# Two-pointer pinch-out through the supported instrumentation APK.
dump pinch-before.xml
adb exec-out screencap -p > "$OUT/pinch-before.png"
adb install -r scripts/pinch-instrumentation/app/build/outputs/apk/debug/app-debug.apk
adb install -r scripts/pinch-instrumentation/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -r -e class dev.nativelet.pinch.SeatMapPinchTest dev.nativelet.pinch.test/androidx.test.runner.AndroidJUnitRunner > "$OUT/pinch-test.txt"
grep -q 'OK (1 test)' "$OUT/pinch-test.txt"
if grep -Eq 'FAILURES|INSTRUMENTATION_FAILED|Process crashed' "$OUT/pinch-test.txt"; then cat "$OUT/pinch-test.txt"; exit 1; fi
sleep 2; adb exec-out screencap -p > "$OUT/pinched.png"
dump pinched.xml
python3 scripts/assert-seats-pinch.py "$OUT/pinch-before.xml" "$OUT/pinched.xml"
# Review sheet lists the tapped seat and holds it (demo only, no payment).
XY=$(center 'Review'); adb shell input tap $XY
sleep 1.5; adb exec-out screencap -p > "$OUT/review.png"
dump review.xml
grep -q 'Premium Centre · C5' "$OUT/review.xml"
grep -q 'Demo hold. No payment and no real booking.' "$OUT/review.xml"
XY=$(center 'Hold seats'); adb shell input tap $XY
sleep 1.5; adb exec-out screencap -p > "$OUT/held.png"
dump held.xml
grep -q '✓ Held (demo)' "$OUT/held.xml"
# Back out to the venue overview.
XY=$(center '‹ Seats'); adb shell input tap $XY; sleep 1
XY=$(center '‹ Venue'); adb shell input tap $XY; sleep 2
dump venue.xml
grep -q 'Venue map.' "$OUT/venue.xml"
adb exec-out screencap -p > "$OUT/venue.png"
adb shell getevent -lp > "$OUT/input-devices.txt"
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then
 echo 'seats-session crash=yes' | tee "$OUT/summary.txt"; exit 1
fi
cmp -s "$OUT/rest.png" "$OUT/zoomed.png" && { echo 'zoom unchanged'; exit 1; }
cmp -s "$OUT/section.png" "$OUT/selected.png" && { echo 'selection unchanged'; exit 1; }
cmp -s "$OUT/pinch-before.png" "$OUT/pinched.png" && { echo 'pinch unchanged'; exit 1; }
echo 'seats-session crash=no zoom-button=changed section=premium-centre select=C5 pinch=row-spacing-expanded review=C5-priced hold=demo-confirmed back=venue haptics=untested' | tee "$OUT/summary.txt"
