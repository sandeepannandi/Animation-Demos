#!/usr/bin/env bash
# Light on Painting: does the header name run ahead of the composited artwork? Observes the composited screen (screencap),
# not JS scheduling. Reference frames A (before swipe) and B (settled after swipe) are taken; frames in between are
# classified for the header band (y 770-862) and the artwork (y 866-1466) by nearest reference. Diagnostics only.
set -u
OUT=smoke-out/lightpresent; mkdir -p "$OUT"
pip install --user -q pillow numpy >/dev/null 2>&1 || true
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///light" "$PKG" >/dev/null 2>&1; sleep 8
for round in 1 2 3 4; do
  adb exec-out screencap -p > "$OUT/r$round-A.png"
  adb shell input swipe 900 1150 200 1150 250
  T0=$(date +%s.%N); i=0
  while [ $i -lt 14 ]; do adb exec-out screencap -p > "$OUT/r$round-f$i.png"; awk -v a="$(date +%s.%N)" -v b="$T0" "BEGIN{printf \"%.2f f$i\\n\", a-b}" >> "$OUT/r$round-times.txt"; i=$((i+1)); done
  sleep 3; adb exec-out screencap -p > "$OUT/r$round-B.png"
done
adb logcat -d | grep -q "Fatal signal" && { adb logcat -d > "$OUT/crash.logcat.txt"; echo "lightpresent: APP CRASH (logcat saved)" | tee -a "$OUT/summary.txt"; }
python3 - "$OUT" <<'PY' | tee -a "$OUT/summary.txt"
import sys,os
from PIL import Image
import numpy as np
out=sys.argv[1]
def crop(p,y0,y1):
    return np.array(Image.open(p).convert('L').crop((0,y0,1080,y1)).resize((135,(y1-y0)//8)),dtype=float)
def dist(a,b): return float(np.abs(a-b).mean())
for r in (1,2,3,4):
    A=f'{out}/r{r}-A.png'; B=f'{out}/r{r}-B.png'
    hA,hB=crop(A,770,862),crop(B,770,862); aA,aB=crop(A,866,1466),crop(B,866,1466)
    sep_h=dist(hA,hB); sep_a=dist(aA,aB)
    print(f'round {r}: reference separation header={sep_h:.1f} art={sep_a:.1f} (a class is only trusted if separation > 3)')
    times={l.split()[1]:l.split()[0] for l in open(f'{out}/r{r}-times.txt')}
    for i in range(14):
        f=f'{out}/r{r}-f{i}.png'
        if not os.path.exists(f): continue
        h=crop(f,770,862); a=crop(f,866,1466)
        hc='B' if dist(h,hB)<dist(h,hA) else 'A'; ac='B' if dist(a,aB)<dist(a,aA) else 'A'
        flag=' <-- header and artwork disagree' if hc!=ac else ''
        print(f'  f{i} t={float(times[f"f{i}"]):.2f}s header={hc} art={ac}{flag}')
PY
