#!/usr/bin/env bash
# Core interaction for each component not covered by android-gestures.sh. 1080x2400 emulator.
# A step "changed" when the screenshot differs; judge the saved before/after images, not only the flag.
set -u
OUT=smoke-out/core; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
tap() { adb shell input tap "$1" "$2"; sleep "${3:-1.2}"; }
report() { A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E 'FATAL EXCEPTION|has died|ANR in' | grep -q "$PKG" && CR=yes
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"; }
# Morph Capsule: compact, expanded, idle chips
open capsule; shot capsule-a; tap 199 1878; shot capsule-compact; tap 511 1878; shot capsule-expanded; tap 119 1878; shot capsule-idle; report capsule-chips capsule-a capsule-expanded
# Expanding Card: tap to open, drag down to leave
open cards; shot cards-a; tap 540 1276 2; shot cards-open; adb shell input swipe 540 900 540 2000 500; sleep 1.5; shot cards-closed; report cards-open cards-a cards-open
# Stacked Carousel: Next, Next, Previous
open carousel; shot carousel-a; tap 739 1553; tap 739 1553; shot carousel-next2; tap 381 1553; shot carousel-prev; report carousel-pager carousel-a carousel-next2
# Scrub Chart: drag across the plot, then Replay
open chart; shot chart-a; adb shell input swipe 200 1250 900 1250 1500 & sleep 0.8; shot chart-mid; wait; sleep 1; tap 364 1616 1; shot chart-replay; report chart-scrub chart-a chart-mid
# Glass Lens: drag the lens
open lens; shot lens-a; adb shell input swipe 540 1219 800 1350 800; sleep 1; shot lens-b; report lens-move lens-a lens-b
# Text Morph: Turn into a picture, then slow motion
open morph; shot morph-a; tap 546 1661 3; shot morph-picture; report morph-picture morph-a morph-picture
# Theme Reveal: tap to switch Dusk to Dawn
open ripple; shot ripple-a; tap 540 1185 3; shot ripple-b; report ripple-switch ripple-a ripple-b
# Swipe Row: swipe right on first row, then Reset
open swipe; shot swipe-a; adb shell input swipe 100 1130 800 1130 400; sleep 1; shot swipe-b; report swipe-row swipe-a swipe-b
# Toast Stack: Save with Undo, Queue five, Position: bottom, Clear all
open toasts; shot toasts-a; tap 540 652 1; shot toasts-b; tap 540 828 1; shot toasts-c; tap 540 1179 1; tap 540 652 1; shot toasts-d; tap 540 1355 1; shot toasts-e; report toasts-show toasts-a toasts-c
# Orbit QR: Turn into QR
open orbit; shot orbit-a; tap 540 1622 4; shot orbit-b; report orbit-qr orbit-a orbit-b
# Light on Painting: drag the bulb, swipe to the next painting
open light; shot light-a; adb shell input swipe 626 1055 380 1055 600; sleep 1; shot light-b; adb shell input swipe 900 1500 200 1500 300; sleep 1.5; shot light-c; report light-bulb light-a light-b
# Preview Rail: drag along the rail
open index; shot rail-a; adb shell input swipe 188 1650 188 1950 800; sleep 1; shot rail-b; report rail-drag rail-a rail-b
# Gooey Menu: open, tap an item, then close
open gooey; shot gooey-a; tap 540 1720 1.2; shot gooey-open; tap 425 1471 1.2; shot gooey-item; tap 540 1720 1.2; shot gooey-reopen; tap 540 1720 1.2; shot gooey-closed; report gooey-item gooey-open gooey-item
