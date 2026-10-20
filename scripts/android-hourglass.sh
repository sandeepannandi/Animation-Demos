#!/usr/bin/env bash
set -u
OUT=smoke-out/hourglass; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open hourglass; sleep 2; shot hour-a
# Sand should be visibly draining on its own.
sleep 4; shot hour-b
report hourglass-drains hour-a hour-b
# Drag sideways: gravity tilts, the pile avalanches.
adb shell input swipe 300 1200 800 1200 2500 &
sleep 1.6; shot hour-tilt-1
sleep 0.9; shot hour-tilt-2
wait
report hourglass-tilt hour-tilt-1 hour-tilt-2
# Fast vertical fling: the hourglass turns over.
adb shell input swipe 540 1500 540 700 250
sleep 4; shot hour-flip
report hourglass-flip hour-tilt-2 hour-flip
sleep 6; shot hour-settled
report hourglass-settles hour-flip hour-settled
adb logcat -d > "$OUT/hourglass-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/hourglass-session.logcat.txt" | grep -q . && CR=yes
echo "hourglass-session crash=$CR" | tee -a "$OUT/summary.txt"
