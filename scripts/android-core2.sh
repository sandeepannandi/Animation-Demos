#!/usr/bin/env bash
# Second pass: Genie left target / slow motion / target switch, Light next painting, Preview Rail, Drag to Sort Cancel attempt. 1080x2400.
set -u
OUT=smoke-out/core2; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
tap() { adb shell input tap "$1" "$2"; sleep "${3:-1.2}"; }
report() { A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E 'FATAL EXCEPTION|has died|ANR in' | grep -q "$PKG" && CR=yes
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"; }
open nativelet-showcase:///genie; shot genie-a
tap 706 1778; shot genie-target-left
tap 540 1646 0.5; shot genie-left-mid; sleep 3; shot genie-left-done
tap 540 1646 3; shot genie-left-restored
tap 403 1778; shot genie-slow-on
tap 540 1646 1.0; shot genie-slow-mid; sleep 5; shot genie-slow-done
report genie-left-target genie-a genie-left-done
report genie-slow genie-slow-on genie-slow-mid
open nativelet-showcase:///light; shot light-a
adb shell input swipe 900 1100 200 1100 300; sleep 1.5; shot light-next
adb shell input swipe 900 1100 200 1100 300; sleep 1.5; shot light-next2
report light-next light-a light-next2
open nativelet-showcase://; shot rail-a
adb shell input swipe 150 1640 150 2000 900; sleep 1; shot rail-b
adb shell input swipe 150 2000 150 1700 900; sleep 1; shot rail-c
report rail-drag rail-a rail-b
open nativelet-showcase:///sort; shot sort-a
adb shell input motionevent DOWN 943 615; sleep 0.5; adb shell input motionevent MOVE 943 800; sleep 0.5; shot sort-held
adb shell input motionevent MOVE 943 1000; sleep 0.5; shot sort-held2
adb shell input motionevent UP 943 1000; sleep 1.5; shot sort-released
report sort-motionevent sort-a sort-released
# Cancel attempts: hold a drag, then tap Cancel reorder with a second injected touch (may not register as a second pointer)
open nativelet-showcase:///sort; shot cancel-a
adb shell input motionevent DOWN 943 615; sleep 0.5; adb shell input motionevent MOVE 943 800; sleep 0.5; shot cancel-held
adb shell input tap 540 1497; sleep 1; shot cancel-after-tap
adb shell input motionevent UP 943 800; sleep 1.5; shot cancel-released
report sort-cancel-tap cancel-a cancel-released
