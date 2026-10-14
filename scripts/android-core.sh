#!/usr/bin/env bash
# Core interaction for each component not covered by android-gestures.sh. 1080x2400 emulator.
# A step "changed" when the screenshot differs; judge the saved before/after images, not only the flag.
set -u
OUT=smoke-out/core; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { U="nativelet-showcase:///$1"; [ "$1" = index ] && U="nativelet-showcase://"; adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "$U" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
tap() { adb shell input tap "$1" "$2"; sleep "${3:-1.2}"; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1; }
# center "text": print "x y" of the first node whose text or content-desc contains the argument (accessibility bounds), else nothing
center() { python3 - "$1" "$OUT/ui-$2.xml" <<'PY'
import re,sys
t,f=sys.argv[1],sys.argv[2]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    a=re.search(r'text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if b and t in ((a.group(1) if a else '')+' '+(d.group(1) if d else '')):
        x1,y1,x2,y2=map(int,b.groups()); print((x1+x2)//2,(y1+y2)//2); break
PY
}
center_desc() { python3 - "$1" "$OUT/ui-$2.xml" <<'PY'
import re,sys
t,f=sys.argv[1],sys.argv[2]
x=open(f,encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if b and d and d.group(1)==t:
        x1,y1,x2,y2=map(int,b.groups()); print((x1+x2)//2,(y1+y2)//2); break
PY
}
report() { A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  [ "$CR" = yes ] && adb logcat -d > "$OUT/$1.crash.logcat.txt"
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"; }
# Morph Capsule: compact, expanded, idle chips
open capsule; shot capsule-a; tap 300 1032; shot capsule-compact; tap 528 1032; shot capsule-expanded; tap 120 1032; shot capsule-idle; report capsule-chips capsule-a capsule-expanded
# Expanding Card: tap to open, drag down to leave
open cards; shot cards-a; tap 540 680 2; shot cards-open; adb shell input swipe 540 900 540 2000 500; sleep 1.5; shot cards-closed; report cards-open cards-a cards-open
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
open swipe; sleep 1; dump swipe; shot swipe-a; P=($(center 'Asha Rao' swipe)); if [ -z "${P[1]:-}" ]; then echo "swipe-row UNRESOLVED (no accessibility bounds for Asha Rao); interaction not run" | tee -a "$OUT/summary.txt"; else SY=${P[1]}; echo "swipe row y=$SY (a11y bounds: ${P[*]})" | tee -a "$OUT/summary.txt"; adb shell input swipe 100 "$SY" 800 "$SY" 400; sleep 1; shot swipe-b; report swipe-row swipe-a swipe-b; fi
# Toast Stack: Save with Undo, Queue five, Position: bottom, Clear all
open toasts; shot toasts-a; tap 192 504 1; shot toasts-b; tap 468 504 1; shot toasts-c; tap 220 640 1; tap 192 504 1; shot toasts-d; tap 508 640 1; shot toasts-e; report toasts-show toasts-a toasts-c
# Orbit QR: Turn into QR
open orbit; shot orbit-a; tap 540 1622 4; shot orbit-b; report orbit-qr orbit-a orbit-b
# Light on Painting: drag the bulb, swipe to the next painting
open light; shot light-a; adb shell input swipe 626 1055 380 1055 600; sleep 1; shot light-b; adb shell input swipe 900 1100 200 1100 300; sleep 1.5; shot light-c; report light-bulb light-a light-b
# Preview Rail: drag along the rail
open index; sleep 1; dump rail; shot rail-a
title() { dump "$1"; grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1; }
L=($(center_desc Listen rail)); M=($(center_desc Move rail)); R=($(center_desc Rest rail))
echo "rail nodes listen=${L[*]:-none} move=${M[*]:-none} rest=${R[*]:-none}; card before: $(title rail-t0)" | tee -a "$OUT/summary.txt"
if ((${#L[@]} < 2 || ${#R[@]} < 2)); then echo "rail-drag UNRESOLVED (no accessibility bounds for Listen/Rest); interaction not run" | tee -a "$OUT/summary.txt"; else
adb shell input tap "${L[0]}" "${L[1]}"; sleep 1.2; shot rail-tap; echo "rail tap Listen -> card: $(title rail-t1)" | tee -a "$OUT/summary.txt"
for attempt in 1 2 3; do
  adb shell input swipe "${L[0]}" "${L[1]}" "${R[0]}" "${R[1]}" 1200; sleep 1.5; shot rail-b; T2=$(title rail-t2); echo "rail drag attempt $attempt Listen->Rest -> card: $T2" | tee -a "$OUT/summary.txt"
  [ "$T2" = 'text="Rest"' ] && break
done
report rail-drag rail-a rail-b
fi
# Gooey Menu: open, tap an item, then close
open gooey; shot gooey-a; tap 540 1720 1.2; shot gooey-open; tap 425 1471 1.2; shot gooey-item; tap 540 1720 1.2; shot gooey-reopen; tap 540 1720 1.2; shot gooey-closed; report gooey-item gooey-open gooey-item
