#!/usr/bin/env bash
# Folded Pass on the Android emulator: cold start, find the cover by its accessibility label, drag it open and
# closed with real touch events (down, held moves with a screenshot at each stage, up), then the button path
# and Reduce motion. Reports crashes and whether frames changed. 1080x2400 emulator, APK already installed.
set -u
OUT=smoke-out/fold; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///fold" "$PKG" >/dev/null 2>&1; sleep 9; }
center() { # $1 = content-desc text; prints "x y" of the first matching node
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

open; shot a-rest
C=$(center "Open pass"); say "cover at: ${C:-not found}"
X=${C% *}; Y=${C#* }; X=${X:-540}; Y=${Y:-700}
# Drag open: real touch, held, with a frame at each stage (hold a moment so the frame is the held mesh)
adb shell input motionevent DOWN "$X" "$Y"; sleep 0.3
i=0; for d in 120 260 420 600 800; do adb shell input motionevent MOVE "$X" $((Y+d)); sleep 0.5; i=$((i+1)); shot b-drag$i; done
adb shell input motionevent UP "$X" $((Y+800)); sleep 0.25; shot c-release; sleep 3; shot d-open
say "fold-drag-open crash=$(crash) rest->drag1=$(differs a-rest b-drag1) drag1->drag3=$(differs b-drag1 b-drag3) drag3->drag5=$(differs b-drag3 b-drag5) open!=rest=$(differs a-rest d-open)"
adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml "$OUT/ui-open.xml" >/dev/null 2>&1
say "open-state a11y: Check in node present=$(grep -c 'Check in' "$OUT/ui-open.xml")"
# Fold back: drag up from the cover
C2=$(center "Fold pass"); say "cover (open) at: ${C2:-not found}"
X=${C2% *}; Y=${C2#* }; X=${X:-540}; Y=${Y:-700}
adb shell input motionevent DOWN "$X" "$Y"; sleep 0.3
for d in 150 350 550; do adb shell input motionevent MOVE "$X" $((Y-d)); sleep 0.5; shot e-up$d; done
adb shell input motionevent UP "$X" $((Y-550)); sleep 3.5; shot f-closed
say "fold-drag-close crash=$(crash) closed==rest=$(differs a-rest f-closed) open!=closed=$(differs d-open f-closed) up150!=up550=$(differs e-up150 e-up550)"
# Interrupt: start opening with the button, catch it mid-flight with a touch, then let go
BTN=$(center "Unfold pass"); say "button at: ${BTN:-not found}"
if [ -n "$BTN" ]; then
  adb shell input tap ${BTN% *} ${BTN#* }; sleep 0.45; shot g-mid1; sleep 0.25; shot g-mid2
  adb shell input motionevent DOWN "$X" 1100; sleep 0.4; shot g-caught; adb shell input motionevent UP "$X" 1100; sleep 3.5; shot g-settled
  say "fold-interrupt crash=$(crash) mid1!=mid2=$(differs g-mid1 g-mid2) caught!=settled=$(differs g-caught g-settled)"
fi
# Check in (live content at rest) then slow motion
CI=$(center "Check in"); say "check-in at: ${CI:-not found}"
[ -n "$CI" ] && { adb shell input tap ${CI% *} ${CI#* }; sleep 1.2; shot h-checked; say "check-in changed=$(differs g-settled h-checked)"; }
# Reduce motion: no fold, instant swap
RM=$(center "Reduce motion: off"); [ -z "$RM" ] && RM=$(center "Reduce motion: off ")
say "reduce toggle at: ${RM:-not found}"
if [ -n "$RM" ]; then
  adb shell input tap ${RM% *} ${RM#* }; sleep 0.6
  FB=$(center "Fold pass"); [ -z "$FB" ] && FB=$(center "Unfold pass")
  shot i-reduce-before; adb shell input tap ${FB% *} ${FB#* }; sleep 0.12; shot i-reduce-after; say "reduce-motion crash=$(crash) swapped=$(differs i-reduce-before i-reduce-after)"
fi
say "fold final crash=$(crash)"
adb logcat -d | tail -300 > "$OUT/logcat-tail.txt"
