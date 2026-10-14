#!/usr/bin/env bash
# Capability probes + remaining checks. Verification only. Verdicts from accessibility text; nothing retried; failures logged as-is.
set -u
OUT=smoke-out/caps; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 7; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
say "== capability probe =="
say "abi: $(adb shell getprop ro.product.cpu.abi | tr -d '\r') sdk: $(adb shell getprop ro.build.version.sdk | tr -d '\r') image: $(adb shell getprop ro.product.model | tr -d '\r')"
say "talkback packages: $(adb shell pm list packages | grep -iE 'talkback|marvin|accessibility' | tr '\n' ' ' | tr -d '\r')"
say "enabled a11y services: $(adb shell settings get secure enabled_accessibility_services | tr -d '\r')"
adb shell getevent -lp > "$OUT/getevent.txt" 2>&1
say "touch devices: $(grep -E '^add device|name:' "$OUT/getevent.txt" | tr '\n' ' ')"
say "== chart intermediate scrub values (hold at 7 x positions, compare to DEMO_DATA Mon42 Tue58 Wed51 Thu76 Fri69 Sat94 Sun88) =="
open chart; dump g0
python3 - "$OUT/ui-g0.xml" > "$OUT/chart-bounds.txt" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    if 'SeekBar' in n or 'Weekly activity' in n:
        b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
        if b: print(*b.groups()); break
PY
read X1 Y1 X2 Y2 < "$OUT/chart-bounds.txt"
say "chart bounds: $X1 $Y1 $X2 $Y2"
if [ -n "${X1:-}" ]; then
  W=$((X2-X1)); YC=$(((Y1+Y2)/2))
  for i in 0 1 2 3 4 5 6; do
    XP=$((X1 + W*(2*i+1)/14))
    adb shell input swipe $XP $YC $XP $YC 2500 &
    sleep 1.6; dump gs$i; wait
    say "scrub pos $i x=$XP: $(python3 - "$OUT/ui-gs$i.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
out=set(re.findall(r'(?:text|content-desc)="([A-Z][a-z]{2} · \d+ pts)"',x)); print(sorted(out))
PY
)"
  done
else say "chart: UNRESOLVED (SeekBar node not found)"; fi
say "== pinch via sendevent multi-touch (Pinch Gallery) =="
open pinch; dump p0
cols() { python3 - "$OUT/ui-$1.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    if re.search(r'content-desc="\d columns"',n) and 'selected="true"' in n: print(re.search(r'content-desc="(\d columns)"',n).group(1)); break
PY
}
say "pinch: selected columns before = $(cols p0)"
DEV=$(awk '/^add device/{d=$4} /ABS_MT_POSITION_X/{print d; exit}' "$OUT/getevent.txt")
MAXX=$(grep -m1 ABS_MT_POSITION_X "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
MAXY=$(grep -m1 ABS_MT_POSITION_Y "$OUT/getevent.txt" | sed -E 's/.*max ([0-9]+).*/\1/')
say "multitouch device=$DEV maxX=$MAXX maxY=$MAXY"
if [ -n "${DEV:-}" ] && [ -n "${MAXX:-}" ]; then
  SX=$((MAXX/1080)); [ $SX -lt 1 ] && SX=1
  SY=$((MAXY/2400)); [ $SY -lt 1 ] && SY=1
  se() { adb shell sendevent "$DEV" "$1" "$2" "$3"; }
  # types: EV_ABS=3, EV_SYN=0, ABS_MT_SLOT=47, ABS_MT_TRACKING_ID=57, ABS_MT_POSITION_X=53, ABS_MT_POSITION_Y=54
  pinch() { # args: startgap endgap
    local cx=$((540*SX)) cy=$((1300*SY)) g0=$1 g1=$2
    se 3 47 0; se 3 57 101; se 3 53 $cx; se 3 54 $((cy-g0*SY)); se 3 47 1; se 3 57 102; se 3 53 $cx; se 3 54 $((cy+g0*SY)); se 0 0 0
    for s in 1 2 3 4 5 6 7 8 9 10; do g=$((g0+(g1-g0)*s/10)); se 3 47 0; se 3 54 $((cy-g*SY)); se 3 47 1; se 3 54 $((cy+g*SY)); se 0 0 0; sleep 0.05; done
    se 3 47 0; se 3 57 -1; se 3 47 1; se 3 57 -1; se 0 0 0
  }
  pinch 60 360; sleep 2; dump p1; say "pinch out (60->360 px half-gap): selected columns after = $(cols p1)"
  pinch 360 60; sleep 2; dump p2; say "pinch in (360->60): selected columns after = $(cols p2)"
else say "pinch: UNRESOLVED (no multitouch device found)"; fi
say "== FPS probe (software GPU emulator: jank figures are NOT device performance) =="
open chart; adb shell dumpsys gfxinfo "$PKG" reset >/dev/null
adb shell input swipe 200 1250 900 1250 2500; adb shell input swipe 900 1250 200 1250 2500
adb shell dumpsys gfxinfo "$PKG" | grep -E 'Total frames rendered|Janky frames|50th|90th|95th|99th' | tee -a "$OUT/summary.txt"
say "== Light screenrecord at display rate =="
open light
adb shell screenrecord --time-limit 14 --bit-rate 8000000 /sdcard/light.mp4 &
sleep 2
for i in 1 2 3 4; do adb shell input swipe 900 1100 200 1100 300; sleep 2.5; done
wait; sleep 1
adb pull /sdcard/light.mp4 "$OUT/light.mp4" >/dev/null 2>&1; ls -la "$OUT/light.mp4" | tee -a "$OUT/summary.txt"
crash=no; adb logcat -d | grep -q "Fatal signal" && crash=yes; say "crash during caps run=$crash"
