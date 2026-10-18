#!/usr/bin/env bash
# Fogged Glass on the Android emulator: rest frame fully misted, wipe the
# pane with real touch events (the streak must clear), then a decisive
# quiet-window check - with no pokes at all, the fog must keep creeping back
# and beads keep forming (the JS-thread frame loop keeps the pipeline awake
# on an idle Android screen). Reports crashes and whether frames changed.
# 1080x2400 emulator, APK already installed.
set -u
OUT=smoke-out/fog; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() { # name before after
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open fog; sleep 3; shot fog-a
# Wipe a long streak across the middle of the pane.
adb shell input swipe 300 1000 780 1150 900
sleep 1; shot fog-b
report fog-wipe fog-a fog-b
# Decisive quiet-window test: NO pokes (no screencaps, dumps or input) while
# the fog regrows and beads condense. Two frames 8s apart must differ.
shot fog-q1; sleep 8; shot fog-q2
report fog-quiet-regrowth fog-q1 fog-q2
adb logcat -d > "$OUT/fog-session.logcat.txt"
