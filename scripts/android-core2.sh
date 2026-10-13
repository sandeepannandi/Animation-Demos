#!/usr/bin/env bash
# Second pass: Genie left target / slow motion / target switch, Light next painting, Preview Rail, Drag to Sort Cancel attempt. 1080x2400.
set -u
OUT=smoke-out/core2; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
open() { adb shell am force-stop "$PKG"; adb logcat -c; adb shell am start -W -a android.intent.action.VIEW -d "$1" "$PKG" >/dev/null 2>&1; sleep 8; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
tap() { adb shell input tap "$1" "$2"; sleep "${3:-1.2}"; }
report() { A=$(md5sum < "$OUT/$2.png" | cut -c1-8); B=$(md5sum < "$OUT/$3.png" | cut -c1-8)
  CR=no; adb logcat -d | grep -E "Process: $PKG|Process $PKG .*has died|ANR in $PKG" | grep -q . && CR=yes
  echo "$1 crash=$CR changed=$([ "$A" != "$B" ] && echo yes || echo no)" | tee -a "$OUT/summary.txt"; }
open nativelet-showcase:///genie; shot genie-a
tap 706 1778; shot genie-target-left
tap 540 1646 0.5; shot genie-left-mid; sleep 3; shot genie-left-done
tap 540 1646 3; shot genie-left-restored
tap 403 1778; shot genie-slow-on
tap 540 1646 1.0; shot genie-slow-mid; sleep 5; shot genie-slow-done
report genie-left-target genie-a genie-left-done
report genie-slow genie-slow-on genie-slow-mid
open nativelet-showcase:///light; shot light-a
adb shell input swipe 900 1100 200 1100 300; sleep 1.5; shot light-next
adb shell input swipe 900 1100 200 1100 300; sleep 1.5; shot light-next2
report light-next light-a light-next2
open nativelet-showcase://; shot rail-a
adb shell input swipe 150 1640 150 2000 900; sleep 1; shot rail-b
adb shell input swipe 150 2000 150 1700 900; sleep 1; shot rail-c
report rail-drag rail-a rail-b
open nativelet-showcase:///sort; shot sort-a
adb shell input motionevent DOWN 900 824; sleep 0.5; adb shell input motionevent MOVE 900 900; sleep 0.3; adb shell input motionevent MOVE 900 1100; sleep 0.5; shot sort-held
adb shell input motionevent UP 900 1100; sleep 1.5; shot sort-released
report sort-motionevent sort-a sort-released
# Cancel: hold a drag, locate the Cancel reorder button from the accessibility tree, tap it with a second injected touch
open nativelet-showcase:///sort; shot cancel-a
adb shell input motionevent DOWN 900 824; sleep 0.5; adb shell input motionevent MOVE 900 1000; sleep 0.5; shot cancel-held
adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1; adb pull /sdcard/u.xml "$OUT/ui-held.xml" >/dev/null 2>&1
B=$(python3 - "$OUT/ui-held.xml" <<'PY'
import re,sys
x=open(sys.argv[1]).read()
for m in re.finditer(r'<node[^>]*>',x):
    n=m.group(0)
    if 'Cancel reorder' in n:
        b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n)
        if b:
            a=[int(v) for v in b.groups()]; print((a[0]+a[2])//2,(a[1]+a[3])//2); break
PY
)
echo "cancel button at: ${B:-not found}" | tee -a "$OUT/summary.txt"
[ -n "$B" ] && adb shell input tap $B; sleep 1; shot cancel-after-tap
adb shell input motionevent UP 900 1000; sleep 1.5; shot cancel-released
report sort-cancel-tap cancel-a cancel-released
# Drag to Sort commit check on the current layout (handle x=900, rows at y 824 / 1036): three input styles, each reported before the next open clears logcat
open nativelet-showcase:///sort; shot sortx-a
adb shell input draganddrop 900 824 900 1100 1500; sleep 4; shot sortx-draganddrop
report sortx-draganddrop sortx-a sortx-draganddrop
open nativelet-showcase:///sort
adb shell input motionevent DOWN 900 824; sleep 0.6; adb shell input motionevent MOVE 900 900; sleep 0.4; adb shell input motionevent MOVE 900 1100; sleep 1.0; adb shell input motionevent UP 900 1100; sleep 4; shot sortx-motion-noshot
report sortx-motion-noshot sortx-a sortx-motion-noshot
open nativelet-showcase:///sort
adb shell input swipe 900 824 900 1100 1200; sleep 4; shot sortx-swipe
report sortx-swipe sortx-a sortx-swipe
