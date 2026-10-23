#!/usr/bin/env bash
set -euo pipefail
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
npx tsc packages/ui/src/components/timeline-trim/timelineMath.ts packages/ui/src/components/timeline-trim/timelineGesture.ts --outDir "$TMP" --target es2020 --module commonjs --skipLibCheck
sed "s|from './timelineMath.ts'|from '$TMP/timelineMath.js'|;s|from './timelineGesture.ts'|from '$TMP/timelineGesture.js'|" packages/ui/src/components/timeline-trim/timelineMath.test.mjs > "$TMP/test.mjs"
node --test "$TMP/test.mjs"
