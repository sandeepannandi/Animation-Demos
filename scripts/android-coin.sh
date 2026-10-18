#!/usr/bin/env bash
set -u
OUT=smoke-out/coin; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open coin; sleep 2; shot coin-a
sleep 1; shot coin-a2
report coin-spins-on-its-own coin-a coin-a2
adb shell input swipe 540 1250 700 1000 400
sleep 1; shot coin-b
report coin-flick coin-a2 coin-b
sleep 3; shot coin-c
report coin-keeps-tumbling coin-b coin-c
shot coin-q1; sleep 8; shot coin-q2
report coin-quiet-spin coin-q1 coin-q2
adb logcat -d > "$OUT/coin-session.logcat.txt"
