# Timeline pinch verification

Separate AndroidX instrumentation app. Does not modify the showcase APK or component behavior. Build with Gradle8.9/JDK17, install app/debug and androidTest APKs, then `adb shell am instrument -w -r dev.nativelet.pinch.test/androidx.test.runner.AndroidJUnitRunner` while the showcase Timeline route is open.

Two explicit horizontal pointer trajectories begin50 source-canvas pixels apart, end210 apart, and hold x170/y130 fixed. Success requires native event injection plus independent zoom/range/ruler-anchor assertions in `assert-timeline-pinch.py`. The test output alone is not proof of zoom. No legacy framework runner/classpath shims are used.
