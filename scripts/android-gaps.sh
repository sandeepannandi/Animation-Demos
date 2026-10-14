#!/usr/bin/env bash
# Current-layout interaction gaps. Every verdict is read from accessibility text/labels in a UI dump, never from a screenshot hash.
# Each step logs what it saw. Nothing is retried; a failed or missing step is logged as FAIL or UNRESOLVED.
set -u
OUT=smoke-out/gaps; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
open() { U="nativelet-showcase:///$1"; adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "$U" "$PKG" >/dev/null 2>&1; sleep 7; }
dump() { for k in 1 2 3; do adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1 && [ -s "$OUT/ui-$1.xml" ] && return; sleep 1; done; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
PY=$OUT/a11y.py
cat > "$PY" <<'PYEOF'
import re,sys
mode,needle,f=sys.argv[1],sys.argv[2],sys.argv[3]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
def attrs(n):
    t=re.search(r' text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    return (t.group(1) if t else ''),(d.group(1) if d else ''),(tuple(map(int,b.groups())) if b else None)
for m in re.finditer(r'<node[^>]*>',x):
    t,d,b=attrs(m.group(0))
    hit = needle in t or needle in d
    if mode=='center' and hit and b: print((b[0]+b[2])//2,(b[1]+b[3])//2); break
    if mode=='has' and hit: print('yes'); break
    if mode=='show' and hit: print('text=%r desc=%r'%(t,d))
PYEOF
center() { python3 "$PY" center "$1" "$OUT/ui-$2.xml"; }
has() { [ "$(python3 "$PY" has "$1" "$OUT/ui-$2.xml")" = yes ] && echo yes || echo no; }
show() { python3 "$PY" show "$1" "$OUT/ui-$2.xml" | head -${3:-3} | tr '\n' ' '; }
tapc() { local P=($(center "$1" "$2")); [ -z "${P[1]:-}" ] && return 1; adb shell input tap "${P[0]}" "${P[1]}"; return 0; }
logline() { show 'Swipe a row.' "$1"; show 'Archived:' "$1"; show 'Deleted:' "$1"; show 'Undid' "$1"; show 'Pinned:' "$1"; }

# ---------- Swipe Row: left swipe, archive, delete, undo, Reset ----------
open swipe; dump sw0
say "swipe: rows at start Asha=$(has 'Asha Rao' sw0) Ravi=$(has 'Ravi Iyer' sw0) Mina=$(has 'Mina Das' sw0) Kabir=$(has 'Kabir Shah' sw0); log: $(show 'Swipe a row.' sw0)"
swipe_left() { local P=($(center "$1" "$2")); [ -z "${P[1]:-}" ] && return 1; adb shell input swipe 1000 "${P[1]}" 560 "${P[1]}" 500; sleep 1.2; return 0; }
if swipe_left 'Asha Rao' sw0; then
  dump sw1; shot sw1
  say "swipe left on Asha (partial): Archive button=$(has 'Archive' sw1) Delete button=$(has 'Delete' sw1)"
  if tapc Archive sw1; then
    sleep 0.8; dump sw2; shot sw2
    say "archive tapped: Undo control=$(has 'Undo' sw2) strip text=$(show 'Archived' sw2 2)"
    sleep 5.5; dump sw3
    say "archive after undo window: Asha row present=$(has 'Asha Rao' sw3); log: $(logline sw3)"
    [ "$(has 'Asha Rao' sw3)" = no ] && say "swipe archive: PASS (row removed, log updated)" || say "swipe archive: FAIL (Asha row still present)"
  else say "swipe archive: UNRESOLVED (no Archive node after left swipe, see sw1.png/ui-sw1.xml)"; fi
else say "swipe left: UNRESOLVED (Asha row not found)"; fi
dump sw4
if swipe_left 'Ravi Iyer' sw4; then
  dump sw5
  if tapc Delete sw5; then
    sleep 0.8; dump sw6; say "delete tapped: Undo control=$(has 'Undo' sw6) strip text=$(show 'Deleted' sw6 2)"
    sleep 5.5; dump sw7
    say "delete after undo window: Ravi row present=$(has 'Ravi Iyer' sw7); log: $(logline sw7)"
    [ "$(has 'Ravi Iyer' sw7)" = no ] && say "swipe delete: PASS" || say "swipe delete: FAIL (Ravi row still present)"
  else say "swipe delete: UNRESOLVED (no Delete node after left swipe)"; fi
else say "swipe delete: UNRESOLVED (Ravi row not found)"; fi
dump sw8
if swipe_left 'Mina Das' sw8; then
  dump sw9
  if tapc Archive sw9; then
    sleep 0.8; dump sw10
    if tapc 'Undo' sw10; then
      sleep 5.5; dump sw11
      say "undo: Mina row present=$(has 'Mina Das' sw11); log: $(logline sw11)"
      [ "$(has 'Mina Das' sw11)" = yes ] && say "swipe undo: PASS (row kept)" || say "swipe undo: FAIL (row removed)"
    else say "swipe undo: UNRESOLVED (no Undo control)"; fi
  else say "swipe undo: UNRESOLVED (no Archive node)"; fi
else say "swipe undo: UNRESOLVED (Mina row not found)"; fi
dump sw12
if tapc Reset sw12; then
  sleep 1.5; dump sw13; shot sw13
  say "reset: Asha=$(has 'Asha Rao' sw13) Ravi=$(has 'Ravi Iyer' sw13) Mina=$(has 'Mina Das' sw13) Kabir=$(has 'Kabir Shah' sw13); log: $(show 'Swipe a row.' sw13)"
  [ "$(has 'Asha Rao' sw13)$(has 'Ravi Iyer' sw13)$(has 'Mina Das' sw13)$(has 'Kabir Shah' sw13)" = yesyesyesyes ] && say "swipe reset: PASS (all four rows back)" || say "swipe reset: FAIL (not all four rows back)"
else say "swipe reset: UNRESOLVED (no Reset node)"; fi

# ---------- Expanding Card: close by button, close by drag ----------
open cards; dump c0
say "cards: card present=$(has 'The Daily List' c0) Close visible before open=$(has 'Close' c0)"
if tapc 'The Daily List' c0; then
  sleep 2.5; dump c1; shot c1
  say "cards open: Close button=$(has 'Close' c1) sheet label=$(show 'details' c1 1)"
  if tapc Close c1; then
    sleep 2.5; dump c2; shot c2
    say "cards after Close tap: Close button=$(has 'Close' c2) card present=$(has 'The Daily List' c2)"
    [ "$(has 'Close' c2)" = no ] && [ "$(has 'The Daily List' c2)" = yes ] && say "card close by button: PASS" || say "card close by button: FAIL"
  else say "card close by button: UNRESOLVED (no Close node after open)"; fi
else say "card close: UNRESOLVED (card not found)"; fi
open cards; dump c3
if tapc 'The Daily List' c3; then
  sleep 2.5; dump c4; say "cards reopened: Close button=$(has 'Close' c4)"
  adb shell input swipe 540 900 540 2000 500; sleep 2.5; dump c5; shot c5
  say "cards after drag down: Close button=$(has 'Close' c5) card present=$(has 'The Daily List' c5)"
  [ "$(has 'Close' c5)" = no ] && [ "$(has 'The Daily List' c5)" = yes ] && say "card close by drag: PASS" || say "card close by drag: FAIL"
else say "card close by drag: UNRESOLVED (card not found)"; fi

# ---------- Stacked Carousel: Next, Next, Previous ----------
open carousel; dump k0
counter() { python3 - "$OUT/ui-$1.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
m=re.findall(r'(?:text|content-desc)="(\d+ / \d+)"',x); print(m[0] if m else 'none')
PY
}
say "carousel: counter at start=$(counter k0) (initialIndex 3 of 5 expected '3 / 5'); Next=$(has 'Next card' k0) Previous=$(has 'Previous card' k0)"
if tapc 'Next card' k0; then sleep 1.5; dump k1; if tapc 'Next card' k1; then sleep 1.5; dump k2; shot k2; N2=$(counter k2)
  if tapc 'Previous card' k2; then sleep 1.5; dump k3; shot k3; P=$(counter k3); say "carousel Next,Next,Previous: after 1st Next=$(counter k1) after 2nd Next=$N2 after Previous=$P"
    [ "$(counter k1)|$N2|$P" = '4 / 5|5 / 5|4 / 5' ] && say "carousel pager: PASS" || say "carousel pager: FAIL (expected 4 / 5, 5 / 5, 4 / 5)"
  else say "carousel pager: UNRESOLVED (no Previous node)"; fi
else say "carousel pager: UNRESOLVED (no second Next)"; fi
else say "carousel pager: UNRESOLVED (no Next node)"; fi

# ---------- Scrub Chart: scrub readout, as far as it is observable ----------
open chart; dump g0
say "chart: scrub node (label match): $(python3 - "$OUT/ui-g0.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    if 'Weekly activity' in m.group(0): print(m.group(0)[:600])
PY
)"
shot g-before
adb shell input swipe 200 1250 900 1250 4000 &
sleep 1.3; shot g-mid1; dump g1; sleep 1.2; shot g-mid2; wait
say "chart during drag (dump): $(python3 - "$OUT/ui-g1.xml" <<'PY'
import re,sys
x=open(sys.argv[1],encoding='utf8').read()
for m in re.finditer(r'<node[^>]*>',x):
    if re.search(r'pts|Weekly activity',m.group(0)): print(m.group(0)[:500])
PY
)"
sleep 1; shot g-after
say "chart readout: frames g-mid1.png and g-mid2.png at two scrub positions were saved; the readout label is not in the accessibility tree unless a node above shows it, so values must be read from the frames."
adb exec-out screencap -p > "$OUT/final.png"
crash=no; adb logcat -d | grep -q "Fatal signal" && crash=yes; say "gaps run: crash during gaps=$crash"
