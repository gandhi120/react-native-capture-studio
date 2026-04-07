# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

React Native Turbo Module library for cross-platform native image capture, editing, and compression. Uses the new React Native architecture with Turbo Modules and Fabric.

## Commands

```bash
# Install dependencies (must use Yarn, not npm)
yarn

# Run linting and type checking
yarn lint
yarn typecheck

# Run tests
yarn test

# Run a single test file
yarn test -- path/to/test.tsx

# Build the library
yarn prepare

# Run example app
yarn example start      # Start Metro bundler
yarn example android    # Run on Android
yarn example ios        # Run on iOS

# Fix lint errors
yarn lint --fix

# Clean build artifacts
yarn clean

# Publish new version
yarn release
```

## Architecture

### JS -> Native Bridge Flow

The Turbo Module spec (`src/NativeCaptureStudio.ts`) defines three methods: `openCaptureStudio`, `processImages`, and `fetchProcessingResult`. Codegen generates native bindings from this spec into `android/generated/` and `ios/generated/` (configured via `codegenConfig` in `package.json`).

`src/index.tsx` is the public API. It re-exports the native methods and defines TypeScript types (`CaptureOptions`, `ImageProcessingItem`).

### Async Processing Pattern (Both Platforms)

Image processing uses a fire-and-poll pattern:
1. `processImages()` enqueues work and immediately returns an operation ID (UUID)
2. JS polls `fetchProcessingResult(operationId)` which returns JSON with `status: "processing" | "completed"` or rejects on failure
3. On completion, results include per-image `success`, `outputPath`, and `error` fields

### Android (Kotlin)

- `CaptureStudioModule.kt` - Turbo Module bridge, extends generated `NativeCaptureStudioSpec`. Uses WorkManager to enqueue `ImageProcessingWorker` for background processing.
- `data/processing/ImageProcessingWorker.kt` - `CoroutineWorker` that deserializes JSON images and delegates to `ImageProcessor`
- `data/processing/ImageProcessor.kt` - Stateless singleton. Pipeline: load bitmap -> EXIF rotation -> watermark (yellow text on black bg, bottom-right) -> binary-search compression to 300-500KB target
- `data/CameraRepository.kt` - CameraX integration
- `ui/camera/` - MVVM: `CameraActivity` (permissions + UI) -> `CameraViewModel` -> `CameraUiState`

Key Android dependencies: CameraX 1.3.4, WorkManager 2.9.0, ExifInterface 1.3.7.

### iOS (Objective-C++)

- `CaptureStudio.mm` - Turbo Module bridge. Uses `NSOperationQueue` for background processing and static dictionaries (`operationQueues`, `operationResults`) to track operations. `openCaptureStudio` is stubbed (TODO).
- `ImageProcessor.mm` - Pipeline mirrors Android: CGImageSource load -> CIImage EXIF rotation -> CoreGraphics watermark -> binary-search compression via `CGImageDestination`. Prefers WebP with JPEG fallback (checks `CGImageDestinationCopyTypeIdentifiers` for WebP support).

### Platform Parity Notes

Both platforms use the same compression algorithm (binary search for quality between 0-100 targeting 300-500KB). Watermark rendering uses identical proportions (textSize = width/40, padding = width/50). Both strip `file://` prefix before processing and overwrite the original file in-place.

## Monorepo Structure

Root workspace contains the library. `example/` workspace contains a demo app that links to the local library.

Native code changes require rebuilding the example app. JavaScript changes reflect immediately via Metro.

To edit native code:
- Android: Open `example/android` in Android Studio
- iOS: Open `example/ios/CaptureStudioExample.xcworkspace` in Xcode (source under `Pods > Development Pods > react-native-capture-studio`)

## Requirements

- Node v18 (see `.nvmrc`)
- Yarn 3.6.1
- Java 17+ (Android)
- Android SDK: minSdk 29, compileSdk configured via root project
- Xcode (iOS/macOS), iOS 15.1+

## Commit Convention

Uses conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

Pre-commit hooks (lefthook) run ESLint and TypeScript checks. Commit messages are validated by commitlint.
