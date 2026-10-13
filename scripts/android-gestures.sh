#!/usr/bin/env bash
# Targeted gestures for screens the generic smoke swipes do not exercise.
# Coordinates are for the 1080x2400 emulator screen. Each step saves before / during / after screenshots.
set -u
OUT=smoke-out/gestures; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
report() { # name before after
  A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E 'FATAL EXCEPTION|has died|ANR in' | grep -q "$PKG" && CR=yes
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"
}
# Genie: slow drag down on the card, capture mid-drag, release, then drag back up
open genie; shot genie-a
adb shell input swipe 540 650 540 1500 2500 & sleep 1.3; shot genie-mid; wait; sleep 1; shot genie-b
adb shell input swipe 540 1500 540 650 600; sleep 1; shot genie-c
report genie-drag genie-a genie-b
# Genie: tap the minimize button then tap again
open genie; shot genie-t0; adb shell input tap 540 1500; sleep 1.2; shot genie-t1; adb shell input tap 540 1500; sleep 1.2; shot genie-t2
report genie-button genie-t0 genie-t1
# Page Curl: slow horizontal drag
open curl; shot curl-a
adb shell input swipe 900 1100 250 1100 2500 & sleep 1.3; shot curl-mid; wait; sleep 1; shot curl-b
report curl-drag curl-a curl-b
# Gooey menu: tap the + button
open gooey; shot gooey-a; adb shell input tap 540 1720; sleep 1.0; shot gooey-b
report gooey-tap gooey-a gooey-b
# Liquid tabs: tap Explore, then Saved
open glass; shot glass-a; adb shell input tap 415 2104; sleep 1.5; shot glass-b; adb shell input tap 700 2104; sleep 1.5; shot glass-c
report glass-tap glass-a glass-b
# Drag to Sort: long-press a handle and drag down
open sort; shot sort-a
adb shell input draganddrop 943 615 943 1000 1500; sleep 1.5; shot sort-b
report sort-drag sort-a sort-b
# Pinch Gallery: tap a density chip (true two-finger pinch is not possible with adb input)
open pinch; shot pinch-a; adb shell input tap 780 420; sleep 1.5; shot pinch-b
report pinch-chip5 pinch-a pinch-b
# Blossom: tap URL field, type a URL, press the button
open blossom; shot blossom-a
adb shell input tap 540 1520; sleep 1; adb shell input keyevent KEYCODE_MOVE_END; for i in $(seq 1 6); do adb shell input keyevent KEYCODE_DEL; done; adb shell input text 'abc'; sleep 1; shot blossom-b
adb shell input tap 540 1700; sleep 3; shot blossom-c
report blossom-edit blossom-a blossom-c
