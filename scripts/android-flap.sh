#!/usr/bin/env bash
# Split-Flap Board: rest frame, tap to advance, cascade frames, settled frame.
# Plus the Bubble Picker selection-tap check with the content-desc fix
# (uiautomator text lookup misses labels inside accessible Pressables).
set -u
OUT=smoke-out/flap; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() { # name before after
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}
# center of the node whose text OR content-desc starts with $1 (the fix:
# accessible Pressables expose their label as content-desc, not text)
center() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  B=$(adb shell cat /sdcard/ui.xml 2>/dev/null | tr '<' '\n<' | grep -E "(text|content-desc)=\"$1" | head -1 | grep -o 'bounds="\[[0-9]*,[0-9]*\]\[[0-9]*,[0-9]*\]"' | head -1)
  [ -z "$B" ] && return 1
  echo "$B" | sed -E 's/bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\1 \2 \3 \4/' | awk '{printf "%d %d", ($1+$3)/2, ($2+$4)/2}'
}

open flap; sleep 3; shot flap-a
XY=$(center "Departure board"); [ -z "${XY:-}" ] && XY="540 1176"
echo "board center: $XY" >> "$OUT/summary.txt"
adb shell screenrecord --time-limit 10 /sdcard/flap.mp4 &
RP=$!
sleep 1
adb shell input tap $XY
sleep 0.7; shot flap-mid1
sleep 1.2; shot flap-mid2
wait $RP 2>/dev/null
adb pull /sdcard/flap.mp4 "$OUT/flap.mp4" >/dev/null 2>&1
sleep 3; shot flap-c
report flap-advance flap-a flap-c

# Bubble Picker selection tap, content-desc fix
open bubbles; sleep 3; shot bub-a
XY=$(center "Music"); [ -z "${XY:-}" ] && XY="540 1200"
echo "music center: $XY" >> "$OUT/summary.txt"
adb shell input tap $XY; sleep 1; shot bub-b
SEL=$(adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb shell cat /sdcard/ui.xml 2>/dev/null | tr '<' '\n<' | grep -E '(text|content-desc)="Music"' | grep -o 'selected="true"' | head -1)
echo "bubbles-select selected_attr=${SEL:-no}" | tee -a "$OUT/summary.txt"
report bubbles-select bub-a bub-b
