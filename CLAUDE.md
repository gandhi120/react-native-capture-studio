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

# Build the library
yarn prepare

# Run example app
yarn example start      # Start Metro bundler
yarn example android    # Run on Android
yarn example ios        # Run on iOS

# Fix lint errors
yarn lint --fix

# Publish new version
yarn release
```

## Architecture

### Turbo Module Structure

- `src/NativeCaptureStudio.ts` - Turbo Module specification (TypeScript interface)
- `src/index.tsx` - Main export, wraps native module with `openCaptureStudio(options)`
- Codegen generates native bindings from the TypeScript spec

### Android (Kotlin - MVVM Pattern)

- `android/src/main/java/com/capturestudio/`
  - `CaptureStudioModule.kt` - Turbo Module bridge, implements `NativeCaptureStudioSpec`
  - `CaptureStudioPackage.kt` - React Native package registration
  - `domain/CaptureOptions.kt` - Configuration data class
  - `data/CameraRepository.kt` - CameraX integration logic
  - `ui/camera/` - MVVM components:
    - `CameraActivity.kt` - Main camera UI with permission handling
    - `CameraViewModel.kt` + `CameraUiState.kt` - State management
    - `activity_camera.xml` - Layout

Uses CameraX (camera-core, camera-camera2, camera-lifecycle, camera-view).

### iOS (Objective-C++)

- `ios/CaptureStudio.mm` - Turbo Module implementation with JSI integration
- `ios/CaptureStudio.h` - Header file

### Codegen Output

Generated bindings in `android/generated/` and `ios/generated/`. Configured in `package.json` under `codegenConfig`.

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
- Android SDK API 30+ (minSdk)
- Xcode (iOS/macOS)

## Commit Convention

Uses conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

Pre-commit hooks (lefthook) run ESLint and TypeScript checks automatically.
