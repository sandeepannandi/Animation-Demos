#!/usr/bin/env bash
set -euo pipefail
# Reuse exact engine, change ZIP storage/alignment only.
TOOLS=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
mkdir -p /tmp/enginepatch/lib/x86_64
cp engine-out/libhermesvm.so /tmp/enginepatch/lib/x86_64/
cp engine-out/stock.apk /tmp/diagnostic.apk
(cd /tmp/enginepatch; zip -0 /tmp/diagnostic.apk lib/x86_64/libhermesvm.so)
zip -d /tmp/diagnostic.apk 'META-INF/*' >/dev/null || true
"$TOOLS/zipalign" -f -P 16 4 /tmp/diagnostic.apk /tmp/diagnostic-aligned.apk
"$TOOLS/zipalign" -c -P 16 4 /tmp/diagnostic-aligned.apk
# Independent observation app's ephemeral debug signing identity, never shipped.
"$TOOLS/apksigner" sign --ks "$HOME/.android/debug.keystore" --ks-pass pass:android --key-pass pass:android --out engine-out/symbols.apk /tmp/diagnostic-aligned.apk
"$TOOLS/apksigner" verify engine-out/symbols.apk
unzip -p engine-out/symbols.apk lib/x86_64/libhermesvm.so > /tmp/packaged.so
cmp /tmp/packaged.so engine-out/libhermesvm.so
