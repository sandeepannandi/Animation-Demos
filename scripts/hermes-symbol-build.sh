#!/usr/bin/env bash
# Diagnostic only. Same pinned engine, symbols retained. Not a release fix.
set -euo pipefail
ROOT=$PWD
RN="$ROOT/apps/showcase/node_modules/react-native"
TAG=$(cat "$RN/sdks/.hermesv1version")
[ "$TAG" = hermes-v250829098.0.17 ]
mkdir -p engine-out
printf 'tag=%s\n' "$TAG" | tee engine-out/build.txt
curl -fL --retry 2 "https://api.github.com/repos/facebook/hermes/tarball/$TAG" -o /tmp/hermes-src.tgz
sha256sum /tmp/hermes-src.tgz | tee -a engine-out/build.txt
mkdir -p /tmp/hermes-source; tar -xzf /tmp/hermes-src.tgz -C /tmp/hermes-source --strip-components=1
JSI="$RN/ReactCommon/jsi"
cmake -S /tmp/hermes-source -B /tmp/hermes-host -G Ninja -DCMAKE_BUILD_TYPE=Release -DJSI_DIR="$JSI" -DHERMESVM_HEAP_HV_MODE=HEAP_HV_PREFER32 -DHERMES_ENABLE_TEST_SUITE=OFF
cmake --build /tmp/hermes-host --target hermesc -j 4
sdkmanager "ndk;27.1.12297006" >/dev/null
NDK="$ANDROID_HOME/ndk/27.1.12297006"
printf 'ndk=%s\n' "$NDK" | tee -a engine-out/build.txt
# RN pins fbjni 0.7.0. Supply the same Prefab import normally provided by AGP.
curl -fL --retry 2 https://repo.maven.apache.org/maven2/com/facebook/fbjni/fbjni/0.7.0/fbjni-0.7.0.aar -o /tmp/fbjni.aar
mkdir -p /tmp/fbjni; unzip -q /tmp/fbjni.aar -d /tmp/fbjni
cat > /tmp/fbjni/fbjniConfig.cmake <<'CMAKE'
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
 IMPORTED_LOCATION /tmp/fbjni/prefab/modules/fbjni/libs/android.x86_64/libfbjni.so
 INTERFACE_INCLUDE_DIRECTORIES /tmp/fbjni/prefab/modules/fbjni/include)
CMAKE
sha256sum /tmp/fbjni.aar | tee -a engine-out/build.txt
cmake -S /tmp/hermes-source -B /tmp/hermes-android -G Ninja -Dfbjni_DIR=/tmp/fbjni \
 -DCMAKE_TOOLCHAIN_FILE="$NDK/build/cmake/android.toolchain.cmake" \
 -DANDROID_ABI=x86_64 -DANDROID_PLATFORM=android-24 -DANDROID_STL=c++_shared \
 -DANDROID_PIE=True -DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON \
 -DHERMES_IS_ANDROID=True -DIMPORT_HOST_COMPILERS=/tmp/hermes-host/ImportHostCompilers.cmake \
 -DJSI_DIR="$JSI" -DHERMES_BUILD_SHARED_JSI=True \
 -DHERMES_RELEASE_VERSION='for RN 0.86.3' -DCMAKE_INTERPROCEDURAL_OPTIMIZATION=True \
 -DHERMES_ENABLE_INTL=True -DHERMESVM_HEAP_HV_MODE=HEAP_HV_PREFER32 \
 -DHERMES_ENABLE_DEBUGGER=False -DCMAKE_BUILD_TYPE=MinSizeRel \
 -DCMAKE_CXX_FLAGS_MINSIZEREL='-Os -DNDEBUG -g' -DCMAKE_C_FLAGS_MINSIZEREL='-Os -DNDEBUG -g' \
 -DHERMES_ENABLE_TEST_SUITE=OFF
cmake --build /tmp/hermes-android --target hermesvm -j 4
SO=$(find /tmp/hermes-android -name libhermesvm.so | head -1)
[ -s "$SO" ]; cp "$SO" engine-out/libhermesvm.so
LLVM="$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin"
"$LLVM/llvm-readelf" -n "$SO" | tee -a engine-out/build.txt
"$LLVM/llvm-readelf" -S "$SO" | grep -E 'debug_info|debug_line' | tee -a engine-out/build.txt
sha256sum "$SO" | tee -a engine-out/build.txt
# Keep a copy of source provenance/configuration for the exact new runtime.
cp /tmp/hermes-android/CMakeCache.txt engine-out/
cp /tmp/hermes-source/external/boost/boost_1_86_0/libs/context/src/asm/make_x86_64_sysv_elf_gas.S engine-out/
cp "$LLVM/llvm-addr2line" engine-out/
