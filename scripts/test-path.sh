#!/usr/bin/env bash
set -euo pipefail
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
npx tsc packages/ui/src/components/motion-path-editor/pathMath.ts packages/ui/src/components/motion-path-editor/pathScene.ts --outDir "$TMP" --target es2020 --module commonjs --skipLibCheck
sed "s|from './pathMath.ts'|from '$TMP/pathMath.js'|" packages/ui/src/components/motion-path-editor/pathMath.test.mjs > "$TMP/test.mjs"
node --test "$TMP/test.mjs"
