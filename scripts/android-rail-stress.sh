#!/usr/bin/env bash
# Rail drag stress: repeat the same Listen -> Rest drag from a fresh start many times and log every outcome, plus whether the
# page scrolled during the gesture (rail top before/after), to tell a lost drag (gesture arbitration) from a layout/coordinate problem.
# Does not retry or hide failures: first-attempt outcomes only.
set -u
OUT=smoke-out/railstress; mkdir -p "$OUT"
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
        x1,y1,x2,y2=map(int,b.groups()); print((x1+x2)//2,(y1+y2)//2,y1); break
PY
}
card() { grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1; }
ok=0; fail=0; total=${RAIL_N:-12}
for i in $(seq 1 "$total"); do
  adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://" "$PKG" >/dev/null 2>&1; sleep 4
  dump "s$i-a"; L=($(node_center Listen "s$i-a")); R=($(node_center Rest "s$i-a")); P=($(node_center "Preview rail" "s$i-a"))
  [ -z "${L[1]:-}" ] || [ -z "${R[1]:-}" ] && { echo "attempt $i UNRESOLVED nodes" | tee -a "$OUT/summary.txt"; continue; }
  adb shell input swipe "${L[0]}" "${L[1]}" "${R[0]}" "${R[1]}" 1200; sleep 1.5
  adb logcat -d -s ReactNativeJS:V > "$OUT/rn-$i.log" 2>&1; grep -c RAILDBG "$OUT/rn-$i.log" | sed 's/^/  raildbg lines: /' >> "$OUT/summary.txt"
  dump "s$i-b"; C=$(card "s$i-b"); P2=($(node_center "Preview rail" "s$i-b"))
  if [ "$C" = 'text="Rest"' ]; then ok=$((ok+1)); V=pass; else fail=$((fail+1)); V=FAIL; adb exec-out screencap -p > "$OUT/fail-$i.png"; fi
  echo "attempt $i from Listen(${L[0]},${L[1]}) to Rest(${R[0]},${R[1]}): card=$C rail_top before=${P[2]:-?} after=${P2[2]:-?} -> $V" | tee -a "$OUT/summary.txt"
done
echo "rail stress first-attempt results: pass=$ok fail=$fail of $total" | tee -a "$OUT/summary.txt"
