#!/usr/bin/env bash
set -euo pipefail
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
npx tsc packages/ui/src/components/motion-path-editor/signatureMath.ts --outDir "$TMP" --target es2020 --module commonjs --skipLibCheck
sed "s|from './signatureMath.ts'|from '$TMP/signatureMath.js'|" packages/ui/src/components/motion-path-editor/signatureMath.test.mjs > "$TMP/test.mjs"
node --test "$TMP/test.mjs"
