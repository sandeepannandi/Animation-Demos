#!/usr/bin/env bash
set -euo pipefail
# Replace only the diagnostic APK engine and sign with the local Android debug key.
APK=$(find apps/showcase/android/app/build/outputs/apk/release -name '*.apk' | head -1)
TOOLS=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
mkdir -p /tmp/enginepatch/lib/x86_64
cp engine-out/libhermesvm.so /tmp/enginepatch/lib/x86_64/
cp "$APK" engine-out/stock.apk
cp "$APK" /tmp/unpatched.apk
(cd /tmp/enginepatch; zip /tmp/unpatched.apk lib/x86_64/libhermesvm.so)
zip -d /tmp/unpatched.apk 'META-INF/*' >/dev/null || true
"$TOOLS/zipalign" -f -p 4 /tmp/unpatched.apk /tmp/aligned.apk
"$TOOLS/apksigner" sign --ks apps/showcase/android/app/debug.keystore --ks-pass pass:android --key-pass pass:android --out engine-out/symbols.apk /tmp/aligned.apk
"$TOOLS/apksigner" verify engine-out/symbols.apk
unzip -p engine-out/symbols.apk lib/x86_64/libhermesvm.so > /tmp/packaged-libhermesvm.so
cmp engine-out/libhermesvm.so /tmp/packaged-libhermesvm.so
sha256sum /tmp/packaged-libhermesvm.so | tee -a engine-out/build.txt
