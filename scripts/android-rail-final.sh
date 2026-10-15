#!/usr/bin/env bash
# Final Rail validation. arm 0 = main APK (control), arm 1 = fix APK. Same emulator, reinstall per launch, fresh launch, same timing.
# First attempt scored alone; second attempt a separate observation. Controls: tap, page scroll from the card, page scroll from the vertical strip (the accepted behaviour change),
# horizontal orientation: drag Listen->Rest (same method as the baseline behaviour script) and page scroll from the horizontal rail.
set -u
OUT=smoke-out/railfinal; mkdir -p "$OUT"
N=${RAIL_N:-16}; M=${RAIL_M:-8}
APK0=$(ls apk-base/*.apk | head -1); APK1=$(ls apk-fix/*.apk | head -1)
adb install -r "$APK0" >/dev/null 2>&1
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
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
        print('%d %d'%((x1+x2)//2,(y1+y2)//2) if mode=='center' else (y1 if mode=='top' else '%d %d %d %d'%(x1,y1,x2,y2))); break
PYEOF
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
C() { python3 "$PY" center "$1" "$OUT/ui-$2.xml"; }
T() { python3 "$PY" top "$1" "$OUT/ui-$2.xml"; }
card() { grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1 | tr -d '"' | sed 's/text=//'; }
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
launch() { if [ "$1" = 0 ]; then adb install -r "$APK0" >/dev/null 2>&1; else adb install -r "$APK1" >/dev/null 2>&1; fi; adb shell am force-stop "$PKG"; adb logcat -b all -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://" "$PKG" >/dev/null 2>&1; sleep 4; }
drag() { local P=($(C "$1" "$3")) Q=($(C "$2" "$3")); [ -z "${P[1]:-}" ] || [ -z "${Q[1]:-}" ] && return 1; adb shell input swipe "${P[0]}" "${P[1]}" "${Q[0]}" "${Q[1]}" 1200; sleep 1.5; return 0; }
sleep 60; adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1
launch 0; sleep 15; dump warm; say "warmup: anr_dialog=$(grep -c "isn't responding" $OUT/ui-warm.xml 2>/dev/null) apk0=$APK0 apk1=$APK1"
if grep -q "isn't responding" "$OUT/ui-warm.xml" 2>/dev/null; then W=($(C Wait warm)); [ -n "${W[1]:-}" ] && adb shell input tap "${W[0]}" "${W[1]}"; sleep 5; fi
for i in $(seq 1 "$N"); do
  if [ $((i%2)) = 1 ]; then ORDER="0 1"; else ORDER="1 0"; fi
  for A in $ORDER; do
    launch $A; dump a
    if ! drag Listen Rest a; then say "V i=$i arm=$A UNRESOLVED nodes"; continue; fi
    dump b; F=$(card b)
    S=$(drag Move Focus b && { dump c; card c; } || echo UNRESOLVED)
    P=($(C Create c)); [ -n "${P[1]:-}" ] && { adb shell input tap "${P[0]}" "${P[1]}"; sleep 1; dump d; TP=$(card d); } || TP=UNRESOLVED
    say "V i=$i arm=$A first=$F second=$S tap=$TP"
  done
done
for i in $(seq 1 "$M"); do
  if [ $((i%2)) = 1 ]; then ORDER="0 1"; else ORDER="1 0"; fi
  for A in $ORDER; do
    launch $A; dump c0
    Y0=$(T "PREVIEW RAIL" c0); G=($(C "◉" c0))
    if [ -n "${G[1]:-}" ]; then adb shell input swipe "${G[0]}" "${G[1]}" "${G[0]}" $((G[1]-400)) 500; sleep 1.5; dump c1; Y1=$(T "PREVIEW RAIL" c1); else Y1=NA; fi
    launch $A; dump s0
    Z0=$(T "PREVIEW RAIL" s0); R=($(C Rest s0))
    if [ -n "${R[1]:-}" ]; then adb shell input swipe "${R[0]}" "${R[1]}" "${R[0]}" $((R[1]-400)) 500; sleep 1.5; dump s1; Z1=$(T "PREVIEW RAIL" s1); else Z1=NA; fi
    say "CS i=$i arm=$A card_scroll_eyebrow_y=$Y0->$Y1 strip_swipe_eyebrow_y=$Z0->$Z1"
  done
done
for i in $(seq 1 "$M"); do
  if [ $((i%2)) = 1 ]; then ORDER="0 1"; else ORDER="1 0"; fi
  for A in $ORDER; do
    launch $A; dump h0
    H=($(C Horizontal h0)); [ -z "${H[1]:-}" ] && { say "H i=$i arm=$A UNRESOLVED pill"; continue; }
    adb shell input tap "${H[0]}" "${H[1]}"; sleep 2; dump h1
    [ -z "$(C 'Preview rail' h1)" ] && { adb shell input swipe 800 1900 800 700 600; sleep 1.5; dump h1; }
    BEFORE=$(card h1); Y0=$(T "PREVIEW RAIL" h1)
    drag Listen Rest h1; dump h2; HD=$(card h2); Y1=$(T "PREVIEW RAIL" h2)
    # page scroll starting on the horizontal rail (vertical swipe), measured separately
    R=($(C Listen h2)); [ -n "${R[1]:-}" ] && { adb shell input swipe "${R[0]}" "${R[1]}" "${R[0]}" $((R[1]-300)) 500; sleep 1.5; dump h3; Y2=$(T "PREVIEW RAIL" h3); } || Y2=NA
    say "H i=$i arm=$A card_before=$BEFORE horizontal_drag_Listen_to_Rest=$HD eyebrow_y_before=$Y0 after_drag=$Y1 after_vertical_swipe_from_rail=$Y2"
  done
done
echo done | tee -a "$OUT/summary.txt"
