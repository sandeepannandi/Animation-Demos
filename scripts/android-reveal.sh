#!/usr/bin/env bash
set -u
OUT=smoke-out/reveal; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open reveal; sleep 2; shot reveal-a
sleep 1; shot reveal-a2
report reveal-static-until-touched reveal-a reveal-a2
adb shell input swipe 300 1000 800 1400 500 &
sleep 0.45; shot reveal-mid
wait
shot reveal-b
report reveal-glyphs-under-finger reveal-a2 reveal-mid
sleep 6; shot reveal-c
report reveal-fades-back reveal-b reveal-c
adb shell input swipe 300 1400 800 1000 150
shot reveal-fast
adb shell input swipe 300 1400 800 1000 1500
shot reveal-slow
report reveal-fast-vs-slow reveal-fast reveal-slow
adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open reveal; sleep 2; shot reveal-a
sleep 1; shot reveal-a2
report reveal-static-until-touched reveal-a reveal-a2
adb shell input swipe 300 1000 800 1400 500 &
sleep 0.45; shot reveal-mid
wait
shot reveal-b
report reveal-glyphs-under-finger reveal-a2 reveal-mid
sleep 6; shot reveal-c
report reveal-fades-back reveal-b reveal-c
adb shell input swipe 300 1400 800 1000 150
shot reveal-fast
adb shell input swipe 300 1400 800 1000 1500
shot reveal-slow
report reveal-fast-vs-slow reveal-fast reveal-slow
adb shell input tap 400 2150
sleep 1; shot reveal-color-off
adb shell input swipe 300 1000 800 1400 500
shot reveal-color-on
adb logcat -d > "$OUT/reveal-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/reveal-session.logcat.txt" | grep -q . && CR=yes
echo "reveal-session crash=$CR" | tee -a "$OUT/summary.txt"
