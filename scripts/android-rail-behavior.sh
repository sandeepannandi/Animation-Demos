#!/usr/bin/env bash
# Preview Rail behaviour checks beyond the drag stress. Each check logs its own outcome; nothing is retried or hidden.
#  tap      : ordinary taps on Move then Create change the card (onStartShouldSet must stay false)
#  scrollout: a vertical page swipe outside the rail (x=800) still scrolls the page (rail top moves)
#  railscroll: a deliberate rail drag - does the parent page also scroll? (observation, logged either way)
#  horizontal: switch to Horizontal, check the rail is wider than tall, drag it sideways, check the card
set -u
OUT=smoke-out/railbehavior; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
box() { python3 - "$1" "$OUT/ui-$2.xml" <<'PY'
import re,sys
t,f=sys.argv[1],sys.argv[2]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if b and d and d.group(1)==t:
        print(*b.groups()); break
PY
}
card() { grep -o 'text="\(Focus\|Listen\|Move\|Rest\|Create\)"' "$OUT/ui-$1.xml" | head -1; }
launch() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase://" "$PKG" >/dev/null 2>&1; sleep 6; }
crashed() { adb logcat -d | grep -q "Fatal signal" && { adb logcat -d > "$OUT/crash-$1.logcat.txt"; say "$1: APP CRASH (logcat saved)"; return 0; }; return 1; }
mid() { set -- $1; echo $(( ($1+$3)/2 )) $(( ($2+$4)/2 )); }

# tap
launch; dump t0; B=($(box Move t0)); [ -z "${B[1]:-}" ] && say "tap UNRESOLVED (no Move node)" || {
  C=($(mid "${B[*]}")); adb shell input tap "${C[0]}" "${C[1]}"; sleep 1.5; dump t1; a=$(card t1)
  B=($(box Create t1)); C=($(mid "${B[*]}")); adb shell input tap "${C[0]}" "${C[1]}"; sleep 1.5; dump t2; b=$(card t2)
  [ "$a" = 'text="Move"' ] && [ "$b" = 'text="Create"' ] && say "tap: PASS (Move -> $a, Create -> $b)" || say "tap: FAIL (after Move: $a, after Create: $b)"; }
crashed tap

# page scroll outside the rail
launch; dump s0; R0=($(box "Preview rail" s0))
adb shell input swipe 800 1700 800 1000 600; sleep 1.5; dump s1; R1=($(box "Preview rail" s1))
say "scrollout: rail top before=${R0[1]:-?} after=${R1[1]:-?} -> $([ -n "${R0[1]:-}" ] && [ "${R0[1]}" != "${R1[1]:-}" ] && echo 'page scrolled (PASS)' || echo 'page did not move (FAIL or no scroll range)')"
crashed scrollout

# deliberate rail drag: does the parent page move?
launch; dump d0; R0=($(box "Preview rail" d0)); L=($(box Listen d0)); E=($(box Rest d0))
if [ -z "${L[1]:-}" ] || [ -z "${E[1]:-}" ]; then say "railscroll UNRESOLVED (no nodes)"; else
  A=($(mid "${L[*]}")); Z=($(mid "${E[*]}")); adb shell input swipe "${A[0]}" "${A[1]}" "${Z[0]}" "${Z[1]}" 1200; sleep 1.5; dump d1; R1=($(box "Preview rail" d1))
  say "railscroll: card=$(card d1) rail top before=${R0[1]} after=${R1[1]:-?} (parent page $([ "${R0[1]}" = "${R1[1]:-}" ] && echo 'did not scroll' || echo 'scrolled'))"; fi
crashed railscroll

# horizontal
launch; dump h0; H=($(box Horizontal h0))
if [ -z "${H[1]:-}" ]; then say "horizontal UNRESOLVED (no Horizontal pill)"; else
  C=($(mid "${H[*]}")); adb shell input tap "${C[0]}" "${C[1]}"; sleep 2
  # the horizontal rail can sit below the fold: scroll the page (outside the rail) until its nodes exist
  dump h1; [ -z "$(box 'Preview rail' h1)" ] && { adb shell input swipe 800 1900 800 700 600; sleep 1.5; dump h1; }
  RB=($(box "Preview rail" h1)); W=$(( ${RB[2]:-0} - ${RB[0]:-0} )); Ht=$(( ${RB[3]:-0} - ${RB[1]:-0} ))
  L=($(box Listen h1)); E=($(box Rest h1))
  say "horizontal: rail ${W}x${Ht} (wider than tall: $([ $W -gt $Ht ] && echo yes || echo no)); card before drag: $(card h1)"
  if [ -n "${L[1]:-}" ] && [ -n "${E[1]:-}" ]; then
    A=($(mid "${L[*]}")); Z=($(mid "${E[*]}")); adb shell input swipe "${A[0]}" "${A[1]}" "${Z[0]}" "${Z[1]}" 1200; sleep 1.5; dump h2
    c=$(card h2); [ "$c" = 'text="Rest"' ] && say "horizontal drag Listen -> Rest: PASS (card $c)" || say "horizontal drag Listen -> Rest: FAIL (card $c)"
  else say "horizontal drag UNRESOLVED (no Listen/Rest nodes)"; fi; fi
crashed horizontal
adb exec-out screencap -p > "$OUT/final.png"
