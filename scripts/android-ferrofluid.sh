#!/usr/bin/env bash
set -u
OUT=smoke-out/ferrofluid; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open ferrofluid; sleep 2; shot ferrofluid-a
sleep 1; shot ferrofluid-a2
report ferrofluid-flat-until-touched ferrofluid-a ferrofluid-a2
adb shell input swipe 540 1100 540 1100 2500 &
sleep 1.8; shot ferrofluid-hold
wait
report ferrofluid-spikes-grow-under-finger ferrofluid-a2 ferrofluid-hold
sleep 3; shot ferrofluid-after
report ferrofluid-flattens-on-release ferrofluid-hold ferrofluid-after
adb shell input swipe 300 1000 800 1300 2500 &
sleep 1.2; shot ferrofluid-drag-1
sleep 0.9; shot ferrofluid-drag-2
wait
report ferrofluid-spikes-follow-drag ferrofluid-drag-1 ferrofluid-drag-2
adb logcat -d > "$OUT/ferrofluid-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/ferrofluid-session.logcat.txt" | grep -q . && CR=yes
echo "ferrofluid-session crash=$CR" | tee -a "$OUT/summary.txt"
