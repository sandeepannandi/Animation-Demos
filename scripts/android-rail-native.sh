#!/usr/bin/env bash
# Rail lost-drag diagnostic, native side. Runs the same single Listen -> Rest drag from a fresh start, N times, with the temporary RAILDBG
# JS logging in the build, and saves the FULL logcat (all buffers, epoch timestamps) for every attempt so that a lost drag can be lined
# up against native input/window/system events at the same millisecond. After a lost drag it also saves dumpsys input and window state.
# No retries; first-attempt outcomes only.
set -u
OUT=smoke-out/railnative; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
node_center() { python3 - "$1" "$OUT/ui-$2.xml" <<'PY'
import re,sys
t,f=sys.argv[1],sys.argv[2]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if b and d and d.group(1)==t:
        x1,y1,x2,y2=map(int,b.groups()); print((x1+x2)//2,(y1+y2)//2); break
PY
}
card() { grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1; }
ok=0; fail=0; total=${RAIL_N:-12}
for i in $(seq 1 "$total"); do
  adb shell am force-stop "$PKG"; adb logcat -b all -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://" "$PKG" >/dev/null 2>&1; sleep 4
  dump "n$i-a"; L=($(node_center Listen "n$i-a")); R=($(node_center Rest "n$i-a"))
  [ -z "${L[1]:-}" ] || [ -z "${R[1]:-}" ] && { echo "attempt $i UNRESOLVED nodes" | tee -a "$OUT/summary.txt"; continue; }
  adb shell input swipe "${L[0]}" "${L[1]}" "${R[0]}" "${R[1]}" 1200; sleep 1.5
  dump "n$i-b"; C=$(card "n$i-b")
  adb logcat -b all -d -v threadtime -v epoch > "$OUT/full-$i.log" 2>&1
  if [ "$C" = 'text="Rest"' ]; then ok=$((ok+1)); V=pass; else fail=$((fail+1)); V=FAIL
    adb shell dumpsys input > "$OUT/dumpsys-input-$i.txt" 2>&1; adb shell dumpsys window windows 2>/dev/null | grep -E "mCurrentFocus|mFocusedApp|Window #" | head -30 > "$OUT/dumpsys-window-$i.txt"; adb exec-out screencap -p > "$OUT/fail-$i.png"; fi
  echo "attempt $i: card=$C -> $V; RAILDBG lines: $(grep -c RAILDBG "$OUT/full-$i.log")" | tee -a "$OUT/summary.txt"
  grep -E "RAILDBG" "$OUT/full-$i.log" | sed 's/^/    /' | tee -a "$OUT/summary.txt"
  # native-side lines near the gesture (any tag), without assuming which ones matter
  grep -iE "InputDispatcher|InputReader|InputTransport|cancel|ANR|not responding|ViewRootImpl.*(focus|Window)|WindowManager.*(focus|Focus)|SystemUI|NotificationShade|inputmethod|ime|IMM" "$OUT/full-$i.log" | grep -v RAILDBG | head -40 | sed 's/^/    native: /' >> "$OUT/native-$i.txt"
done
echo "rail native diag first-attempt results: pass=$ok fail=$fail of $total" | tee -a "$OUT/summary.txt"
