#!/usr/bin/env bash
# Cloth Banner on the Android emulator: rest frame, drag the fabric with real
# touch events, release and let it settle, then a decisive quiet-window check -
# after all pokes stop, the banner must keep swaying (the CanvasKeepAlive keeps
# canvas-only animation alive on a quiet Android screen). Reports crashes and
# whether frames changed. 1080x2400 emulator, APK already installed.
set -u
OUT=smoke-out/banner; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() { # name before after
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}

open banner; sleep 3; shot banner-a
# Grab the middle of the fabric and pull it down-left, then release.
adb shell input swipe 540 1100 380 1400 900
sleep 1; shot banner-b
sleep 6; shot banner-c
report banner-drag banner-a banner-b
report banner-settle banner-b banner-c
# Decisive quiet-window test: NO pokes (no screencaps, dumps or input) while
# the breeze keeps the banner moving. Two frames 8s apart must differ.
shot banner-q1; sleep 8; shot banner-q2
report banner-quiet-sway banner-q1 banner-q2
adb logcat -d > "$OUT/banner-session.logcat.txt"
