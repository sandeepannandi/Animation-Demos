#!/usr/bin/env bash
set -euo pipefail
OUT=smoke-out/pixel-focus; mkdir -p "$OUT"
trap 'adb pull /sdcard/Android/data/com.nativelet.verify/files "$OUT/shots" >/dev/null 2>&1 || true; adb logcat -d > "$OUT/final-logcat.txt"' EXIT
adb uninstall com.anonymous.nativeletshowcase >/dev/null 2>&1 || true
adb install --no-incremental -r apk/*.apk
adb install -r -t verifyapp/app/build/outputs/apk/debug/app-debug.apk
# Four times fewer physical pixels, same logical layout. This is a changed capture method,
# not evidence of phone FPS or proof that a one-frame lag is absent.
adb shell wm size 540x1200
adb shell wm density 210
adb shell wm size > "$OUT/device.txt"; adb shell wm density >> "$OUT/device.txt"
adb shell settings delete secure enabled_accessibility_services
adb shell settings put secure accessibility_enabled 0
run_test(){
 adb shell am instrument -w -e class "com.nativelet.verify.VerifyTest#$1" com.nativelet.verify/androidx.test.runner.AndroidJUnitRunner | tee "$OUT/$1.txt"
 if grep -qE 'FAILURES!!!|INSTRUMENTATION_FAILED|Process crashed' "$OUT/$1.txt"; then echo "CHECK_INVALID $1"; return 1; fi
}
for test in captureLight captureGenie captureGooey; do
  adb logcat -c
  adb shell screenrecord --size 540x1200 --bit-rate 4000000 --time-limit 24 "/sdcard/$test.mp4" >"$OUT/record-$test.txt" 2>&1 &
  recorder=$!
  run_test "$test"
  wait "$recorder" || true
  adb pull "/sdcard/$test.mp4" "$OUT/" >/dev/null
  adb logcat -d > "$OUT/$test.log"
done
TB=com.google.android.marvin.talkback
adb shell settings put secure tts_default_synth com.google.android.tts
adb shell settings put secure enabled_accessibility_services "$TB/com.google.android.marvin.talkback.TalkBackService"
adb shell settings put secure accessibility_enabled 1
sleep 25
adb shell dumpsys accessibility > "$OUT/accessibility-before.txt"
adb logcat -c
run_test touchFocus
adb logcat -d > "$OUT/touchFocus.log"
adb shell dumpsys accessibility > "$OUT/accessibility-after.txt"
adb pull /sdcard/Android/data/com.nativelet.verify/files "$OUT/shots" >/dev/null 2>&1 || true
