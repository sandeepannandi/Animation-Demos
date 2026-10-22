#!/usr/bin/env bash
# OTP Verify: rest frame, auto-typed code, mid-sequence frames, settled frame
# (two identical frames 3 s apart), plus the graphics frame stats of the run.
set -u
OUT=smoke-out/otp; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() {
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}
dumpui() {
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

open otp; sleep 2; shot otp-a
XY=$(center "Type code for me"); [ -z "${XY:-}" ] && XY="400 1500"
echo "type-for-me button: $XY" >> "$OUT/summary.txt"
adb shell dumpsys gfxinfo "$PKG" reset >/dev/null 2>&1
adb shell input tap $XY
sleep 1.4; shot otp-typing
sleep 2.0; shot otp-typed
sleep 1.2; shot otp-merge-1
sleep 0.6; shot otp-merge-2
report otp-typing otp-a otp-typing
report otp-sequence otp-typed otp-merge-2
# The emulator clock can run slower than real time: wait, then prove SETTLED
# (not stalled) with two identical frames 3 s apart.
sleep 9; shot otp-done; sleep 3; shot otp-done2
report otp-ends-different otp-a otp-done
A=$(md5sum < "$OUT/otp-done.png" | cut -c1-8); B=$(md5sum < "$OUT/otp-done2.png" | cut -c1-8)
echo "otp-settled stable=$([ "$A" = "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
adb shell dumpsys gfxinfo "$PKG" > "$OUT/gfxinfo.txt" 2>&1
grep -E "Total frames rendered|Janky frames|50th percentile|90th percentile|95th percentile|99th percentile" "$OUT/gfxinfo.txt" | tee -a "$OUT/summary.txt"
adb logcat -d > "$OUT/otp-session.logcat.txt"
CR=no; grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" "$OUT/otp-session.logcat.txt" | grep -q . && CR=yes
echo "otp-session crash=$CR" | tee -a "$OUT/summary.txt"
