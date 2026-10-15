#!/usr/bin/env bash
# Rail matched A/B. Same APK; arm chosen by launch URL (?lock=0 control, ?lock=1 experimental parent-scroll-lock on rail touch).
# Fresh launch each time, same timing, first-attempt drag scored on its own, second attempt logged separately. Arms interleaved, order alternated.
set -u
OUT=smoke-out/railab; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
N=${RAIL_N:-16}; M=${RAIL_M:-6}
PY=$OUT/q.py
cat > "$PY" <<'PYEOF'
import re,sys
mode,needle,f=sys.argv[1],sys.argv[2],sys.argv[3]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); t=re.search(r' text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if not b: continue
    if (t and t.group(1)==needle) or (d and d.group(1)==needle):
        x1,y1,x2,y2=map(int,b.groups())
        print(((x1+x2)//2,(y1+y2)//2) if mode=='center' else y1); break
PYEOF
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
C() { python3 "$PY" center "$1" "$OUT/ui-$2.xml"; }
T() { python3 "$PY" top "$1" "$OUT/ui-$2.xml"; }
card() { grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1 | tr -d '"' | sed 's/text=//'; }
launch() { adb shell am force-stop "$PKG"; adb logcat -b all -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://?lock=$1" "$PKG" >/dev/null 2>&1; sleep 4; }
evs() { adb logcat -b all -d -v epoch | grep -E "RAILDBG" | grep -v "page scroll " | sed -E 's/^ *([0-9]+)\.[0-9]+ .*RAILDBG [0-9]+ /\1 /' | tr '\n' ';' | cut -c1-600; }
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
drag() { local P=($(C "$1" "$3")) Q=($(C "$2" "$3")); [ -z "${P[1]:-}" ] || [ -z "${Q[1]:-}" ] && return 1; adb shell input swipe "${P[0]}" "${P[1]}" "${Q[0]}" "${Q[1]}" 1200; sleep 1.5; return 0; }
# warm-up: the emulator was just booted, the launcher can ANR; settle, clear dialogs, open the app once before any scored attempt
sleep 60; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1
adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://?lock=0" "$PKG" >/dev/null 2>&1; sleep 20; dump warm
say "warmup: anr_dialog=$(grep -c "isn't responding" $OUT/ui-warm.xml 2>/dev/null)"
if grep -q "isn't responding" "$OUT/ui-warm.xml" 2>/dev/null; then W=($(C Wait warm)); [ -n "${W[1]:-}" ] && adb shell input tap "${W[0]}" "${W[1]}"; sleep 5; fi
for i in $(seq 1 "$N"); do
  if [ $((i%2)) = 1 ]; then ORDER="0 1"; else ORDER="1 0"; fi
  for A in $ORDER; do
    launch $A; dump a
    if ! drag Listen Rest a; then say "V i=$i arm=$A UNRESOLVED nodes"; continue; fi
    dump b; F=$(card b); E1=$(evs)
    adb logcat -b all -d -v threadtime -v epoch > "$OUT/full-v$i-arm$A.log" 2>&1
    adb logcat -b all -c
    # second attempt, separate observation: Move -> Focus
    S=$(drag Move Focus b && { dump c; card c; } || echo UNRESOLVED); E2=$(evs)
    # tap control: Create
    P=($(C Create c)); [ -n "${P[1]:-}" ] && { adb shell input tap "${P[0]}" "${P[1]}"; sleep 1; dump d; TP=$(card d); } || TP=UNRESOLVED
    # page scroll starting off the rail: from subtitle upward, compare eyebrow y
    Y0=$(T "PREVIEW RAIL" d); SB=($(C "Press a tick. Drag to explore. Release to choose." d))
    if [ -n "${SB[1]:-}" ]; then adb shell input swipe "${SB[0]}" "${SB[1]}" "${SB[0]}" $((SB[1]-400)) 500; sleep 1.2; dump e; Y1=$(T "PREVIEW RAIL" e); else Y1=NA; fi
    say "V i=$i arm=$A first=$F second=$S tap=$TP offrailscroll_eyebrow_y=$Y0->$Y1 first_events=[$E1] second_events=[$E2]"
  done
done
for i in $(seq 1 "$M"); do
  if [ $((i%2)) = 1 ]; then ORDER="0 1"; else ORDER="1 0"; fi
  for A in $ORDER; do
    launch $A; dump h0
    H=($(C Horizontal h0)); [ -z "${H[1]:-}" ] && { say "H i=$i arm=$A UNRESOLVED pill"; continue; }
    adb shell input tap "${H[0]}" "${H[1]}"; sleep 1.5; dump h1
    HD=$(drag Focus Create h1 && { dump h2; card h2; } || echo UNRESOLVED)
    # vertical swipe starting ON the horizontal rail: page should scroll in control
    Y0=$(T "PREVIEW RAIL" h2); R=($(C Listen h2))
    if [ -n "${R[1]:-}" ]; then adb shell input swipe "${R[0]}" "${R[1]}" "${R[0]}" $((R[1]-400)) 500; sleep 1.2; dump h3; Y1=$(T "PREVIEW RAIL" h3); else Y1=NA; fi
    say "H i=$i arm=$A horizontal_drag_card=$HD (expect Create) pagescroll_from_rail_eyebrow_y=$Y0->$Y1"
  done
done
echo done | tee -a "$OUT/summary.txt"
