#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/signature; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
trap 'adb logcat -d > "$OUT/session.logcat.txt" 2>/dev/null || true' EXIT
[ -n "$PKG" ]; adb shell am force-stop "$PKG"; adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///path "$PKG" > "$OUT/launch.txt"
sleep 10
snapshot(){ adb shell uiautomator dump /sdcard/ink.xml >/dev/null 2>&1; adb shell cat /sdcard/ink.xml > "$OUT/$1.xml"; adb exec-out screencap -p > "$OUT/$1.png"; }
snapshot boot
if grep -q "Pixel Launcher isn't responding" "$OUT/boot.xml"; then adb shell input keyevent KEYCODE_BACK; adb shell am force-stop com.google.android.apps.nexuslauncher; adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///path "$PKG" >/dev/null; sleep 3; fi
snapshot rest
center(){
 adb shell uiautomator dump /sdcard/ink-current.xml >/dev/null 2>&1
 adb shell cat /sdcard/ink-current.xml > "$OUT/current.xml"
 python3 - "$OUT/current.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('text')==sys.argv[2] or n.get('content-desc')==sys.argv[2]:
  x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')));print((x+a)//2,(y+b)//2);break
else:raise SystemExit('Missing '+sys.argv[2])
PY
}
read X1 Y1 X2 Y2 < <(python3 - "$OUT/rest.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('content-desc','').startswith('Signature canvas'):
  print(*re.findall(r'\d+',n.get('bounds')));break
else:raise SystemExit('Missing signature canvas')
PY
)
X=$((X1+(X2-X1)*60/340)); Y=$((Y1+(Y2-Y1)*220/320)); A=$((X1+(X2-X1)*200/340)); B=$((Y1+(Y2-Y1)*95/320))
adb shell input swipe "$X" "$Y" "$A" "$B" 1200
X=$((X1+(X2-X1)*110/340)); Y=$((Y1+(Y2-Y1)*225/320)); A=$((X1+(X2-X1)*285/340)); B=$((Y1+(Y2-Y1)*185/320))
adb shell input swipe "$X" "$Y" "$A" "$B" 1200
sleep .3; snapshot drawn
grep -q 'Your handwriting' "$OUT/drawn.xml"
XY=$(center 'Slow motion'); adb shell input tap $XY
XY=$(center Replay); adb shell input tap $XY
sleep .4; adb exec-out screencap -p > "$OUT/replay-1.png"
sleep 1.2; adb exec-out screencap -p > "$OUT/replay-2.png"
cmp -s "$OUT/replay-1.png" "$OUT/replay-2.png" && { echo 'Replay frames unchanged'; exit 1; }
sleep 10
XY=$(center Undo); adb shell input tap $XY; sleep .5; snapshot undo
XY=$(center Clear); adb shell input tap $XY; sleep .5; snapshot clear
grep -q 'Sign above' "$OUT/clear.xml"
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then echo 'signature-session crash=yes' | tee "$OUT/summary.txt"; exit 1; fi
echo 'signature-session crash=no draw=two-strokes replay=frames-changed undo=captured clear=empty' | tee "$OUT/summary.txt"
