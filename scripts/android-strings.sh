#!/usr/bin/env bash
set -u
OUT=smoke-out/strings; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open strings; sleep 2; shot str-a
# Pull the middle string down slowly: the string follows the finger.
adb shell input swipe 540 1000 540 1300 2500 &
sleep 1.6; shot str-drag-1
sleep 0.9; shot str-drag-2
wait
report strings-drag str-drag-1 str-drag-2
# Release: the pluck rings and the wave travels.
shot str-ring-1
sleep 0.5; shot str-ring-2
report strings-ring str-ring-1 str-ring-2
# It settles back to straight strings.
sleep 8; shot str-settled
report strings-settles str-ring-2 str-settled
adb logcat -d > "$OUT/strings-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/strings-session.logcat.txt" | grep -q . && CR=yes
echo "strings-session crash=$CR" | tee -a "$OUT/summary.txt"
