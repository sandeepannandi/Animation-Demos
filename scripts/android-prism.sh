#!/usr/bin/env bash
set -u
OUT=smoke-out/prism; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open prism; sleep 2; shot prism-a
sleep 1; shot prism-a2
report prism-idle-steady prism-a prism-a2
# Drag the prism from its rest spot below the beam up into the beam.
adb shell input swipe 540 1450 540 950 2200 &
sleep 1.6; shot prism-in-beam
wait
sleep 2; shot prism-settled
report prism-rainbow-appears prism-a2 prism-in-beam
report prism-fan-steady prism-in-beam prism-settled
# Drag sideways: the fan follows.
adb shell input swipe 540 950 760 1000 2000 &
sleep 1.2; shot prism-drag-1
sleep 0.9; shot prism-drag-2
wait
report prism-fan-follows-drag prism-drag-1 prism-drag-2
adb logcat -d > "$OUT/prism-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/prism-session.logcat.txt" | grep -q . && CR=yes
echo "prism-session crash=$CR" | tee -a "$OUT/summary.txt"
