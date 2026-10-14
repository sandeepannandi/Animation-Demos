#!/usr/bin/env bash
set -u
OUT=smoke-out/caps7; mkdir -p "$OUT"
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
adb install -r -t verifyapp/app/build/outputs/apk/debug/app-debug.apk 2>&1 | tail -1
for M in base cand; do
  adb uninstall com.anonymous.nativeletshowcase >/dev/null 2>&1
  adb install -r apk-$M/*.apk >/dev/null 2>&1 || { say "install $M failed"; continue; }
  sleep 20; adb shell input keyevent KEYCODE_HOME; sleep 4
  adb logcat -c
  say "===== MODE $M ====="
  for TST in scrollcheck shapes; do adb shell am instrument -w -e class com.nativelet.verify.VerifyTest#$TST com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner 2>&1 | tee "$OUT/instr-$M-$TST.txt" | tail -3; done
  adb logcat -d | grep -E ' NLV |NLVRN' | cut -c1-240 | tee "$OUT/$M.txt" | grep -E 'SHAPE|SC |CONTROL|endPinch|touchCancel' >> "$OUT/summary.txt"
done
