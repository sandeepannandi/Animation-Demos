#!/usr/bin/env bash
# Repeated cold starts per screen to measure how often the intermittent native crash (SIGSEGV in libhermesvm,
# seen once on curl and once on ripple) happens, and on which screens. No allocator or crash detection is
# disabled. Every crash keeps its full logcat. Counts of launches are logged so a crash rate is comparable.
set -u
OUT=smoke-out/coldstart; mkdir -p "$OUT"
PKG=$(adb shell pm list packages | grep -i nativelet | sed 's/package://' | head -1 | tr -d '\r')
N=${COLDSTART_N:-40}
SCREENS=${COLDSTART_SCREENS:-"curl ripple index swipe"}
echo "package=$PKG rounds=$N screens=$SCREENS" | tee "$OUT/summary.txt"
for s in $SCREENS; do
  U="nativelet-showcase:///$s"; [ "$s" = index ] && U="nativelet-showcase://"
  crashes=0; launches=0
  for i in $(seq 1 "$N"); do
    adb shell am force-stop "$PKG"; adb logcat -c
    adb shell am start -W -a android.intent.action.VIEW -d "$U" "$PKG" >/dev/null 2>&1
    sleep 5; launches=$((launches+1))
    LOG=$(adb logcat -d)
    if echo "$LOG" | grep -qE "Process: $PKG|Process $PKG .*has died|ANR in $PKG|Fatal signal [0-9]+ .*(tiveletshowcase|$PKG)"; then
      crashes=$((crashes+1)); echo "$LOG" > "$OUT/crash-$s-$i.logcat.txt"
      adb exec-out screencap -p > "$OUT/crash-$s-$i.png"
    fi
  done
  echo "$s launches=$launches crashes=$crashes" | tee -a "$OUT/summary.txt"
done
