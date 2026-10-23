#!/usr/bin/env bash
set -euo pipefail
TMP="$(mktemp -d)"
tsc packages/ui/src/components/seat-selection/seatMath.ts packages/ui/src/components/seat-selection/seatGesture.ts packages/ui/src/components/seat-selection/venueFixture.ts --outDir "$TMP" --target es2020 --module commonjs --skipLibCheck
sed "s|from './seatMath.ts'|from '$TMP/seatMath.js'|;s|from './seatGesture.ts'|from '$TMP/seatGesture.js'|;s|from './venueFixture.ts'|from '$TMP/venueFixture.js'|" packages/ui/src/components/seat-selection/seatMath.test.mjs > "$TMP/test.mjs"
node --test "$TMP/test.mjs"
