#!/usr/bin/env bash
set -u
OUT=smoke-out/caps5; mkdir -p "$OUT"
say() { echo "$*" | tee -a "$OUT/summary.txt"; }
adb install -r apk/*.apk >/dev/null 2>&1 || { echo app install failed; exit 1; }
adb install -r -t verifyapp/app/build/outputs/apk/debug/app-debug.apk 2>&1 | tail -1
sleep 30; adb shell input keyevent KEYCODE_HOME; sleep 5
TB=com.google.android.marvin.talkback
for p in $(adb shell dumpsys package $TB | grep -oE 'android\.permission\.[A-Z_]+' | sort -u); do adb shell pm grant $TB $p >/dev/null 2>&1; done
adb shell settings put secure tts_default_synth com.google.android.tts
say "tts_default_synth now: $(adb shell settings get secure tts_default_synth | tr -d '\r')"
RUN() { adb shell am instrument -w -e class "com.nativelet.verify.VerifyTest#$1" com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner 2>&1 | tee "$OUT/instr-$1.txt" | tail -4; }
adb logcat -c
say "== native control =="; RUN control
adb logcat -d -s NLV:I NLVNATIVE:I | tee "$OUT/control.txt" >> "$OUT/summary.txt"; adb logcat -c
say "== pinch (RN touch logs under ReactNativeJS) =="; RUN pinch
adb logcat -d | grep -E ' NLV |NLVRN|NLVNATIVE' | cut -c1-260 | tee "$OUT/pinch.txt" >> "$OUT/summary.txt"; adb logcat -c
say "== tts =="; RUN tts
adb logcat -d -s NLV:I | tee "$OUT/tts.txt" >> "$OUT/summary.txt"
adb shell dumpsys texttospeech 2>&1 | head -40 > "$OUT/dumpsys-tts.txt"
adb shell pm list packages | grep -iE 'tts|speech' >> "$OUT/dumpsys-tts.txt"
adb logcat -c
adb shell settings put secure enabled_accessibility_services $TB/com.google.android.marvin.talkback.TalkBackService
adb shell settings put secure accessibility_enabled 1
sleep 15
say "talkback bound: $(adb shell dumpsys accessibility | grep -c 'Bound services.*TalkBack')"
say "== tb chart + key nav =="; RUN tbChart
adb logcat -d -s NLV:I | tee "$OUT/tbchart.txt" >> "$OUT/summary.txt"
say "== tb actions =="; RUN tbActions
adb logcat -d -s NLV:I | tee "$OUT/tbactions.txt" >> "$OUT/summary.txt"
adb logcat -d -b all | grep -iE 'marvin|talkback' | grep -iE 'tts|speak|utterance|speech' | head -80 | cut -c1-300 > "$OUT/tb-speech-log.txt"
adb pull /sdcard/Download "$OUT/shots" >/dev/null 2>&1
