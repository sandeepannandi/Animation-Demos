#!/usr/bin/env bash
set -u
OUT=smoke-out/caps4; mkdir -p "$OUT"
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
adb install -r apk/*.apk >/dev/null 2>&1 || { echo app install failed; exit 1; }
adb install -r -t verifyapp/app/build/outputs/apk/debug/app-debug.apk 2>&1 | tail -1
sleep 30; adb shell input keyevent KEYCODE_HOME; sleep 5
adb shell settings get secure tts_default_synth | sed 's/^/tts_default_synth: /' | tee -a "$OUT/summary.txt"
adb shell pm list packages | grep -iE 'tts|speech' | tee -a "$OUT/summary.txt"
TB=com.google.android.marvin.talkback
for p in $(adb shell dumpsys package $TB | grep -oE 'android\.permission\.[A-Z_]+' | sort -u); do adb shell pm grant $TB $p >/dev/null 2>&1; done
adb logcat -c
say "== pinch test =="
adb shell am instrument -w -e class com.nativelet.verify.VerifyTest#pinch com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner 2>&1 | tee "$OUT/instr-pinch.txt" | tail -8
adb logcat -d -s NLV:I | tee "$OUT/nlv-pinch.txt" >> "$OUT/summary.txt"
adb logcat -c
say "== talkback test =="
adb shell settings put secure enabled_accessibility_services $TB/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
sleep 12
adb shell dumpsys accessibility | grep -c 'Bound services.*TalkBack' | sed 's/^/talkback bound: /' | tee -a "$OUT/summary.txt"
adb shell dumpsys activity activities | grep -m3 -iE 'mResumedActivity|topResumed' | tee -a "$OUT/summary.txt"
adb shell am instrument -w -e class com.nativelet.verify.VerifyTest#talkback com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner 2>&1 | tee "$OUT/instr-tb.txt" | tail -8
adb logcat -d -s NLV:I | tee "$OUT/nlv-tb.txt" >> "$OUT/summary.txt"
adb logcat -d -b all | grep -iE 'marvin|talkback' | grep -iE 'tts|speak|utterance|permission|focus' | head -60 | cut -c1-300 > "$OUT/tb-log.txt"
adb pull /sdcard/Download "$OUT/shots" >/dev/null 2>&1
adb exec-out screencap -p > "$OUT/final.png"
