# Changelog

## 0.3.0

Compatibility release. The package now builds against whatever React Native version
the consuming app uses, instead of being pinned to the version it was published with.

**Requires React Native 0.82+ and React 19+.**

### Breaking

- **React Native 0.82+ / React 19+ required.** `peerDependencies` previously said `"*"`,
  which was never accurate. The library is New Architecture only, so RN 0.81 and below
  are no longer supported and npm now warns at install time instead of failing later.
- **`openCaptureStudio()` resolves `{ status: "not_implemented" }`** on both platforms.
  It previously launched an Activity on Android — an activity that only showed a camera
  preview, had no shutter, and resolved `null` without returning an image. iOS was
  already a stub. Use a camera library such as `react-native-vision-camera` to capture,
  then pass the paths to `processImages()`.

### Fixed

- **Works across React Native versions.** Codegen output (the JS↔native glue) was
  committed and shipped via `includesGeneratedCode`, pinning it to the RN version the
  library was built with. Apps on a different version compiled that glue against
  mismatched ReactCommon headers. Codegen now runs in the consuming app.
- **No longer depends on the `newArchEnabled` Gradle property.** RN 0.82+ is New
  Architecture only and tells apps to delete that property; doing so silently disabled
  codegen for this library and broke the build
  ([react-native#54430](https://github.com/react/react-native/issues/54430)).
- **Android manifest is applied correctly.** The build switched to an empty
  `AndroidManifestNew.xml` on AGP 7.3+ (i.e. always), so nothing the library declared
  ever reached the merged manifest. Consolidated to a single manifest.
- **Stale build output no longer ships.** The published tarball contained generated
  files from `android/app/build/` with an outdated package name, plus app-level codegen
  artifacts (`RCTModuleProviders`, `ReactAppDependencyProvider`) that belonged to the
  example app, not the library.

### Removed

- **Unused Android camera implementation** — `CameraActivity`, `CameraViewModel`,
  `CameraRepository`, and the layout, along with 7 dependencies: 4 CameraX artifacts
  (~1.3 MB), `activity-ktx`, and 2 lifecycle libraries. The code was unreachable and
  React Native's default `enableProguardInReleaseBuilds = false` meant it was not
  stripped from release builds.
- `react-native.config.js` — its `cmakeListsPath` override pointed at the removed
  committed codegen. Autolinking resolves the correct path by convention.

### Changed

- Android compiles against **Java 17** with an explicit Kotlin `jvmTarget`, rather than
  Java 8 with an inferred target.
- The library no longer pins an Android Gradle Plugin version; the consuming app owns
  its build toolchain.
- `README` documents `generateThumbnail()`, which shipped in 0.2.0 undocumented.

### Upgrading

The library no longer ships codegen, so cached autolinking paths point at a folder that
no longer exists. Clear them once:

```bash
rm -rf android/build/generated/autolinking android/app/.cxx
cd ios && rm -rf Pods build && pod install
```

Without this the first Android build fails with:

```
add_subdirectory given source ".../android/generated/jni/" which is not an existing directory
```

No JavaScript API changes. `processImages`, `fetchProcessingResult`, and
`generateThumbnail` are unchanged.

### Known issues

- On Android, `processImages` rejects with `PROCESS_ERROR` if `isForOnlyWatermark`,
  `compressJpegImage`, or `replaceOriginal` are omitted, despite being typed as
  optional. Pass all three.
- `replaceOriginal` is not honoured on either platform — the original file is always
  overwritten.
- Android results omit `outputPath`, which iOS returns.
- Large batches can exceed WorkManager's ~10 KB input limit on Android.

## 0.2.0

- Added `generateThumbnail()`
- Fixed selfie image rotation

## 0.1.1

- Initial release
