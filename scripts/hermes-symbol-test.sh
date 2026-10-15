#!/usr/bin/env bash
set -euo pipefail
mkdir -p smoke-out/symbols
adb shell wm size > smoke-out/symbols/device.txt
adb shell wm density >> smoke-out/symbols/device.txt
adb install -r engine-out/symbols.apk
PKG=dev.nativelet.showcase
# Resolve the exact package name rather than assume the Expo slug.
PKG=$(adb shell pm list packages | tr -d '\r' | sed -n 's/package:\(.*nativelet.*\)/\1/p' | head -1)
[ -n "$PKG" ]
echo "package=$PKG" > smoke-out/symbols/summary.txt
# A successful source build/boot does not prove a crash is cured.
for route in curl ripple; do
  crashes=0
  for i in $(seq 1 40); do
    adb shell am force-stop "$PKG"; adb logcat -c
    adb shell am start -W -a android.intent.action.VIEW -d "nativelet-showcase:///$route" "$PKG" > smoke-out/symbols/start.txt 2>&1
    sleep 5
    adb logcat -d > /tmp/current.log
    if grep -qE "Process: $PKG|Process $PKG .*has died|ANR in $PKG|Fatal signal [0-9]+ .*(tiveletshowcase|$PKG)" /tmp/current.log; then
      crashes=$((crashes+1)); cp /tmp/current.log "smoke-out/symbols/crash-$route-$i.txt"
    fi
    if [ "$i" -eq 1 ]; then
      if grep -qE "UnsatisfiedLinkError|dlopen failed|cannot locate symbol|bytecode version mismatch" /tmp/current.log; then
        cp /tmp/current.log smoke-out/symbols/compatibility-error.log
        echo "runtime compatibility failure, not a valid crash reproduction" | tee -a smoke-out/symbols/summary.txt
        exit 1
      fi
      adb exec-out screencap -p > "smoke-out/symbols/first-$route.png"
      adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true
      adb pull /sdcard/ui.xml "smoke-out/symbols/first-$route.xml" >/dev/null 2>&1 || true
      cp /tmp/current.log "smoke-out/symbols/first-$route.log"
    fi
  done
  echo "$route launches=40 crashes=$crashes" | tee -a smoke-out/symbols/summary.txt
 done
cp engine-out/build.txt smoke-out/symbols/
