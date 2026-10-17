#!/usr/bin/env bash
# Vinyl Player: quiet-window test on a canvas that NEVER settles while
# playing - the decisive check for the JS-state clock on Android new arch.
# Rest settle pair (identical), tap to play, arm-in frame, then two frames
# 3s apart over a TOTAL quiet window (no pokes) must differ (rotation
# advancing), then tap to stop: spin-down, arm parks, settle pair identical.
set -u
OUT=smoke-out/vinyl; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() { # name before after
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}
dumpui() { # uiautomator dump is flaky on continuously animating screens; retry
  for i in 1 2 3 4 5; do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    adb shell cat /sdcard/ui.xml 2>/dev/null | grep -q 'Preview Rail' && return 0
    sleep 1
  done
  return 1
}
center() {
  dumpui || return 1
  B=$(adb shell cat /sdcard/ui.xml 2>/dev/null | tr '<' '\n<' | grep -E "(text|content-desc)=\"$1" | head -1 | grep -o 'bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' | head -1)
  [ -z "$B" ] && return 1
  echo "$B" | sed -E 's/bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\1 \2 \3 \4/' | awk '{printf "%d %d", ($1+$3)/2, ($2+$4)/2}'
}

open vinyl; sleep 3; shot vin-rest
sleep 2; shot vin-rest2   # idle deck: settle pair must be identical
XY=$(center "Turntable"); [ -z "${XY:-}" ] && XY="540 1150"
echo "deck center: $XY" >> "$OUT/summary.txt"

# PLAY. Arm swings in first; the platter powers up once the needle is down.
adb shell input tap $XY
sleep 2; shot vin-armin   # arm mid-swing / just landed, spin-up beginning
# TOTAL quiet window: two frames 3s apart while playing MUST differ.
sleep 6; shot vin-spin1; sleep 3; shot vin-spin2

# STOP. Power cut -> drag to a halt while the arm lifts and parks.
adb shell input tap $XY
sleep 2; shot vin-stopping
# Long quiet settle (emulator JS clock runs slow), then settle pair identical.
sleep 16; shot vin-parked; sleep 3; shot vin-parked2
adb logcat -d > "$OUT/vinyl-session.logcat.txt"

report vinyl-idle-settle vin-rest vin-rest2
report vinyl-arm-in vin-rest vin-armin
report vinyl-quiet-rotation vin-spin1 vin-spin2
report vinyl-stopping vin-spin2 vin-stopping
report vinyl-parked-settle vin-parked vin-parked2
