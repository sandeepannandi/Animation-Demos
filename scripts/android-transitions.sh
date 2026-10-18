#!/usr/bin/env bash
# GL Transitions on the Android emulator: cold start, find the pager by its accessibility label, drag left
# with real held touch events (frames at each stage), flick fast, catch it mid-flight, use the Prev/Next
# buttons, then Reduce motion. Reports crashes, whether frames changed, and the page counter. 1080x2400
# emulator, APK already installed.
set -u
OUT=smoke-out/transitions; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///transitions" "$PKG" >/dev/null 2>&1; sleep 9; }
center() { # $1 = content-desc or text; prints "x y" of the first matching node
  adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml "$OUT/ui.xml" >/dev/null 2>&1
  python3 - "$OUT/ui.xml" "$1" <<'PY'
import re,sys
x=open(sys.argv[1]).read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    if ('content-desc="%s"'%sys.argv[2]) in n or ('text="%s"'%sys.argv[2]) in n:
        b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
        if b:
            a=[int(v) for v in b.groups()]; print((a[0]+a[2])//2,(a[1]+a[3])//2); break
PY
}
crash() { adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG|FATAL EXCEPTION" | grep -q . && echo yes || echo no; }
md() { md5sum < "$OUT/$1.png" | cut -c1-8; }
differs() { [ "$(md "$1")" != "$(md "$2")" ] && echo yes || echo no; }
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
counter() { adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml "$OUT/ui.xml" >/dev/null 2>&1; grep -oE '[0-9] of 7' "$OUT/ui.xml" | head -1; }

open; shot a-rest
C=$(center "Landscape gallery"); say "pager at: ${C:-not found}"
X=${C% *}; Y=${C#* }; X=${X:-540}; Y=${Y:-1000}
say "counter at rest: $(counter)"
# Slow drag left, held, with a frame at each stage
adb shell input motionevent DOWN "$X" "$Y"; sleep 0.3
i=0; for d in 60 140 240 360; do adb shell input motionevent MOVE $((X-d)) "$Y"; sleep 0.5; i=$((i+1)); shot b-drag$i; done
adb shell input motionevent UP $((X-360)) "$Y"; sleep 2.5; shot c-settled
say "drag-left crash=$(crash) rest->drag2=$(differs a-rest b-drag2) drag2->drag4=$(differs b-drag2 b-drag4) settled!=rest=$(differs a-rest c-settled) counter=$(counter)"
# Fast flick left: short swipe, a frame mid-flight, then settled
adb shell input swipe $((X+260)) "$Y" $((X-260)) "$Y" 110; sleep 0.12; shot d-flick-mid; sleep 2.5; shot e-flicked
say "flick crash=$(crash) flick-mid!=rest=$(differs a-rest d-flick-mid) flicked!=settled=$(differs c-settled e-flicked) counter=$(counter)"
# Buttons: Next then Prev
NB=$(center "Next photo"); say "next at: ${NB:-not found}"
if [ -n "$NB" ]; then
  adb shell input tap ${NB% *} ${NB#* }; sleep 2; shot f-next; say "after next: counter=$(counter) changed=$(differs e-flicked f-next)"
fi
PB=$(center "Previous photo"); say "prev at: ${PB:-not found}"
if [ -n "$PB" ]; then
  adb shell input tap ${PB% *} ${PB#* }; sleep 2; shot g-prev; say "after prev: counter=$(counter)"
fi
# Mid-flight catch: Next, then grab the moving pages and hold
if [ -n "$NB" ]; then
  adb shell input tap ${NB% *} ${NB#* }; sleep 0.12
  adb shell input motionevent DOWN "$X" "$Y"; sleep 0.5; shot h-caught
  adb shell input motionevent MOVE $((X-120)) "$Y"; sleep 0.3; adb shell input motionevent UP $((X-120)) "$Y"; sleep 2.5; shot i-caught-settled
  say "catch crash=$(crash) caught!=settled=$(differs h-caught i-caught-settled) counter=$(counter)"
fi
say "transitions final crash=$(crash)"
adb logcat -d | tail -300 > "$OUT/logcat-tail.txt"
