#!/usr/bin/env bash
set -u
OUT=smoke-out/blackhole; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open blackhole; sleep 2; shot hole-a
sleep 1; shot hole-a2
report hole-disk-spins hole-a hole-a2
adb shell input swipe 540 1250 760 900 700
sleep 1; shot hole-b
report hole-drag hole-a2 hole-b
sleep 3; shot hole-c
report hole-keeps-spinning hole-b hole-c
shot hole-q1; sleep 8; shot hole-q2
report hole-quiet-spin hole-q1 hole-q2
adb logcat -d > "$OUT/hole-session.logcat.txt"
