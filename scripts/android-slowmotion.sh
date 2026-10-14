#!/usr/bin/env bash
# Slow motion check for Orbit QR and Blossom QR: press the transition with Slow motion off, then on, and take frames at fixed
# delays (adb screenshot delay adds ~0.3-0.6 s each). Judge the saved frames: with slow on the transition must still be
# in progress at delays where the default one has finished. Durations are not measured precisely.
set -u
OUT=smoke-out/slowmotion; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$1" "$PKG" >/dev/null 2>&1; sleep 4; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml "$OUT/ui-$1.xml" >/dev/null 2>&1; }
center() { python3 - "$1" "$OUT/ui-$2.xml" <<'PY'
import re,sys
t,f=sys.argv[1],sys.argv[2]
try: x=open(f,encoding='utf8').read()
except Exception: sys.exit()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0); a=re.search(r'text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n); b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
    if b and t in ((a.group(1) if a else '')+' '+(d.group(1) if d else '')):
        x1,y1,x2,y2=map(int,b.groups()); print((x1+x2)//2,(y1+y2)//2); break
PY
}
run() { # screen, label, slow(0/1), button text
  open "$1"; dump "$1-$2"
  if [ "$3" = 1 ]; then S=($(center 'Slow motion' "$1-$2")); [ -z "${S[1]:-}" ] && { echo "$1-$2 UNRESOLVED slow switch" | tee -a "$OUT/summary.txt"; return; }; adb shell input tap "${S[0]}" "${S[1]}"; sleep 1; fi
  dump "$1-$2"; B=($(center "$4" "$1-$2")); [ -z "${B[1]:-}" ] && { echo "$1-$2 UNRESOLVED button" | tee -a "$OUT/summary.txt"; return; }
  shot "$1-$2-t0"; adb shell input tap "${B[0]}" "${B[1]}"
  for t in 1 2 3 4 6 9; do sleep 1; shot "$1-$2-after$t"; done
  echo "$1-$2 slow=$3 tapped ${B[*]}; frames after1..after9 saved" | tee -a "$OUT/summary.txt"
}
run orbit default 0 'Turn into QR'
run orbit slow 1 'Turn into QR'
run blossom default 0 'Turn into QR'
run blossom slow 1 'Turn into QR'

# Light on Painting: the header must show the painting name and update after swipes (UI dump text check).
name() { dump "$1"; grep -o 'text="\(Night Window\|Still Life\)"' "$OUT/ui-$1.xml" | head -1; }
open light; sleep 1
echo "light header before: $(name light-0)" | tee -a "$OUT/summary.txt"; shot light-n0
for i in 1 2 3; do adb shell input swipe 900 1150 200 1150 250; sleep 1.5; echo "light header after swipe $i: $(name light-$i)" | tee -a "$OUT/summary.txt"; shot light-n$i; done
