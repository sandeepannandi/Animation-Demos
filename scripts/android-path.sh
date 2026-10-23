#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/path; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
[ -n "$PKG" ]; adb shell am force-stop "$PKG"; adb logcat -c
adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///path "$PKG" > "$OUT/launch.txt"
sleep 10
snapshot(){ adb shell uiautomator dump /sdcard/path.xml >/dev/null 2>&1; adb shell cat /sdcard/path.xml > "$OUT/$1.xml"; adb exec-out screencap -p > "$OUT/$1.png"; }
snapshot boot
if grep -q "Pixel Launcher isn't responding" "$OUT/boot.xml"; then adb shell input keyevent KEYCODE_BACK; adb shell am force-stop com.google.android.apps.nexuslauncher; adb shell am start -W -a android.intent.action.VIEW -d nativelet-showcase:///path "$PKG" >/dev/null; sleep 3; fi
snapshot rest
grep -q 'Motion path canvas' "$OUT/rest.xml"
center(){ python3 - "$OUT/rest.xml" "$1" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('text')==sys.argv[2] or n.get('content-desc')==sys.argv[2]:
  x,y,a,b=map(int,re.findall(r'\d+',n.get('bounds')));print((x+a)//2,(y+b)//2);break
else:raise SystemExit('Missing '+sys.argv[2])
PY
}
XY=$(center Pause); adb shell input tap $XY
read X1 Y1 X2 Y2 < <(python3 - "$OUT/rest.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
for n in E.parse(sys.argv[1]).iter('node'):
 if n.get('content-desc','').startswith('Motion path canvas'):
  print(*re.findall(r'\d+',n.get('bounds')));break
else:raise SystemExit('Missing canvas bounds')
PY
)
X=$((X1+(X2-X1)*174/340)); Y=$((Y1+(Y2-Y1)*94/320)); A=$((X1+(X2-X1)*194/340)); B=$((Y1+(Y2-Y1)*124/320))
adb shell input swipe "$X" "$Y" "$A" "$B" 600
sleep 1; snapshot anchor
# Real geometry must change near the intended logical coordinate, not just selected styling.
python3 - "$OUT/anchor.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
values=[n.get('text','') for n in E.parse(sys.argv[1]).iter('node')]
s=next(v for v in values if v.startswith('M 40 220 C'))
numbers=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',s)));assert 189<numbers[6]<199 and 119<numbers[7]<129,s
PY
XY=$(center Split); adb shell input tap $XY; sleep 1; snapshot split
grep -q '4 anchors' "$OUT/split.xml"
XY=$(center Undo); adb shell input tap $XY; sleep 1; snapshot undo
grep -q '3 anchors' "$OUT/undo.xml"
XY=$(center Corner); adb shell input tap $XY
# Outgoing handle has moved with the anchor to242,124.
X=$((X1+(X2-X1)*242/340)); Y=$((Y1+(Y2-Y1)*124/320)); A=$((X1+(X2-X1)*255/340)); B=$((Y1+(Y2-Y1)*165/320))
adb shell input swipe "$X" "$Y" "$A" "$B" 650; sleep 1; snapshot handle
python3 - "$OUT/handle.xml" <<'PY'
import sys,re,xml.etree.ElementTree as E
s=next(n.get('text','') for n in E.parse(sys.argv[1]).iter('node') if n.get('text','').startswith('M 40 220 C'))
v=list(map(float,re.findall(r'-?\d+(?:\.\d+)?',s)));assert 249<v[8]<261 and 159<v[9]<171,s
PY
# Linked tangents must change the opposite side, while preserving both anchor positions.
XY=$(center Smooth); adb shell input tap $XY; sleep 1; snapshot smooth
python3 - "$OUT/handle.xml" "$OUT/smooth.xml" <<'PYTEST'
import sys,re,xml.etree.ElementTree as E
vals=[]
for f in sys.argv[1:]:
 s=next(n.get('text','') for n in E.parse(f).iter('node') if n.get('text','').startswith('M 40 220 C'))
 vals.append(list(map(float,re.findall(r'-?\d+(?:\.\d+)?',s))))
a,b=vals;assert a[4:6]!=b[4:6] and a[6:8]==b[6:8] and a[8:10]==b[8:10],vals
PYTEST
XY=$(center +); adb shell input tap $XY; sleep 1; snapshot zoom
# Resume and capture distinct native motion frames; helper tests independently check distance integration.
XY=$(center Pause); adb shell input tap $XY
sleep 1; adb exec-out screencap -p > "$OUT/motion-1.png"
sleep 1; adb exec-out screencap -p > "$OUT/motion-2.png"
cmp -s "$OUT/motion-1.png" "$OUT/motion-2.png" && { echo 'Native marker frames unchanged'; exit 1; }
adb logcat -d > "$OUT/session.logcat.txt"
if grep -Eq "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION|Fatal signal|JavascriptException" "$OUT/session.logcat.txt"; then echo 'path-session crash=yes' | tee "$OUT/summary.txt"; exit 1; fi
echo 'path-session crash=no anchor=source-changed split=4 undo=3 tangent=source-changed marker=frames-changed' | tee "$OUT/summary.txt"
