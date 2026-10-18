#!/usr/bin/env bash
set -u
OUT=smoke-out/pendulum; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open pendulum; sleep 2; shot pend-a
sleep 1; shot pend-a2
report pendulum-free-swing pend-a pend-a2
adb shell input swipe 540 1250 760 1500 700
sleep 1; shot pend-b
report pendulum-fling pend-a2 pend-b
sleep 3; shot pend-c
report pendulum-keeps-swinging pend-b pend-c
shot pend-q1; sleep 8; shot pend-q2
report pendulum-quiet-swing pend-q1 pend-q2
adb logcat -d > "$OUT/pendulum-session.logcat.txt"
