# React Native Capture Studio - Complete Code Walkthrough

A beginner-friendly guide that explains every line of code, every keyword, and every concept from scratch.

---

## Table of Contents

1. [Phase 1: Introduction & Prerequisites](#phase-1-introduction--prerequisites)
2. [Phase 2: TypeScript Side - The JavaScript Interface](#phase-2-typescript-side---the-javascript-interface)
3. [Phase 3: Kotlin Bridge Layer](#phase-3-kotlin-bridge-layer)
4. [Phase 4: MVVM Architecture](#phase-4-mvvm-architecture)
5. [Phase 5: Complete Data Flow](#phase-5-complete-data-flow)
6. [Phase 6: Glossary & Quick Reference](#phase-6-glossary--quick-reference)

---

# Phase 1: Introduction & Prerequisites

## What is React Native?

React Native is a framework that lets you build mobile apps (Android and iOS) using JavaScript. Instead of learning two different languages (Kotlin for Android, Swift for iOS), you write JavaScript code that runs on both platforms.

```
Your JavaScript Code
        |
        v
   React Native
        |
   +----+----+
   |         |
   v         v
Android    iOS
  App       App
```

## What is a Native Module?

Sometimes JavaScript isn't enough. You need to use features that only exist in native code, like:

- Camera access
- Fingerprint scanner
- Bluetooth
- File system

A **Native Module** is a bridge that connects your JavaScript code to native platform features.

```
JavaScript World          Native World
     |                        |
     |   Native Module        |
     +---------->-------------+
     |   (the bridge)         |
     |                        |
openCaptureStudio()  -->  CameraActivity.kt
```

## What is a Turbo Module?

A **Turbo Module** is the modern, faster version of Native Modules. The differences:

| Old Native Module             | Turbo Module |
|-------------------            |--------------|
| Slower communication          | Direct, fast communication |
| All modules loaded at startup | Loaded only when needed |
| Less type-safe                | Type-safe (TypeScript) |

This project uses **Turbo Modules**.

## What is Kotlin?

Kotlin is a modern programming language for Android development. It's:

- Created by JetBrains (makers of IntelliJ/Android Studio)
- Officially supported by Google for Android
- More concise and safer than Java
- Fully compatible with Java code

If you know Java, JavaScript, or Python, Kotlin will feel familiar.

## How JavaScript Talks to Native Code

Here's the complete picture:

```
+--------------------------------------------------+
|                   Your React App                  |
|                                                  |
|   openCaptureStudio({ multiple: true })          |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|              TypeScript Specification             |
|                                                  |
|   NativeCaptureStudio.ts (defines the contract)  |
|   index.tsx (exports the function)               |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|              React Native Bridge                  |
|                                                  |
|   TurboModuleRegistry finds "CaptureStudio"      |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|              Kotlin Native Module                 |
|                                                  |
|   CaptureStudioModule.kt (receives the call)     |
|   CaptureStudioPackage.kt (registers module)     |
+--------------------------------------------------+
                        |
                        v
+--------------------------------------------------+
|              Android Camera (MVVM)                |
|                                                  |
|   CameraActivity.kt (View)                       |
|   CameraViewModel.kt (ViewModel)                 |
|   CameraRepository.kt (Model)                    |
+--------------------------------------------------+
```

---

# Phase 2: TypeScript Side - The JavaScript Interface

## File 1: `src/NativeCaptureStudio.ts`

This file defines the **contract** between JavaScript and native code.

### Complete Code

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  openCaptureStudio(options: Object): Promise<Object>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CaptureStudio');
```

### Line-by-Line Breakdown

---

#### Line 1: `import type { TurboModule } from 'react-native';`

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `import` | Brings code from another file into this file |
| `type` | This import is ONLY for type checking, not actual code |
| `{ TurboModule }` | We're importing one specific thing called "TurboModule" |
| `from 'react-native'` | From the React Native library |

**What is `TurboModule`?**

`TurboModule` is a TypeScript interface (a blueprint) that all Turbo Modules must follow. It's like a contract saying "every Turbo Module must have these properties."

**Why `import type`?**

When TypeScript compiles to JavaScript, `import type` is completely removed. It's only used during development to check your types are correct.

```typescript
// This:
import type { TurboModule } from 'react-native';

// Becomes this in compiled JavaScript:
// (nothing - completely removed!)
```

---

#### Line 2: `import { TurboModuleRegistry } from 'react-native';`

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `import` | Brings code from another file |
| `{ TurboModuleRegistry }` | We're importing "TurboModuleRegistry" |
| `from 'react-native'` | From the React Native library |

**What is `TurboModuleRegistry`?**

It's React Native's system for finding and loading native modules. Think of it like a phone directory:

```
TurboModuleRegistry:
  - "CaptureStudio" -> CaptureStudioModule.kt
  - "Camera" -> CameraModule.kt
  - "Bluetooth" -> BluetoothModule.kt
```

When you ask for "CaptureStudio", it finds and returns the native module.

---

#### Line 4-6: Interface Definition

```typescript
export interface Spec extends TurboModule {
  openCaptureStudio(options: Object): Promise<Object>;
}
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `export` | Makes this available to other files |
| `interface` | Defines a shape/contract (what something looks like) |
| `Spec` | The name of our interface (short for "Specification") |
| `extends TurboModule` | This interface includes everything from TurboModule, plus more |
| `{ ... }` | The contents of the interface |

**What is an interface?**

An interface is like a job description. It says "anyone who claims to be this type MUST have these abilities."

```typescript
// This interface says:
// "Anyone claiming to be a Spec MUST have a function called
// openCaptureStudio that takes options and returns a Promise"

export interface Spec extends TurboModule {
  openCaptureStudio(options: Object): Promise<Object>;
}
```

**Inside the interface:**

```typescript
openCaptureStudio(options: Object): Promise<Object>;
```

| Part | Meaning |
|------|---------|
| `openCaptureStudio` | Function name |
| `(options: Object)` | Takes one parameter called "options" of type Object |
| `: Promise<Object>` | Returns a Promise that eventually gives an Object |

**What is a Promise?**

A Promise represents something that will happen in the future. Opening the camera takes time, so we use a Promise:

```typescript
// A Promise is like saying:
// "I promise to give you a result... eventually"

openCaptureStudio({ multiple: true })
  .then(result => {
    // This runs when the camera finishes
    console.log("Got photos:", result);
  })
  .catch(error => {
    // This runs if something goes wrong
    console.log("Error:", error);
  });
```

---

#### Line 8: Getting the Native Module

```typescript
export default TurboModuleRegistry.getEnforcing<Spec>('CaptureStudio');
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `export default` | This is the main thing this file exports |
| `TurboModuleRegistry` | The registry we imported earlier |
| `.getEnforcing` | "Get this module, and throw an error if it doesn't exist" |
| `<Spec>` | The type of module we expect (our Spec interface) |
| `('CaptureStudio')` | The name of the native module to find |

**What does this line do?**

1. Asks React Native: "Give me the native module named 'CaptureStudio'"
2. React Native searches for a registered module with that name
3. If found, returns it
4. If not found, throws an error (because of `getEnforcing`)

**Why `getEnforcing` vs `get`?**

```typescript
// getEnforcing - throws error if not found (strict)
TurboModuleRegistry.getEnforcing<Spec>('CaptureStudio');

// get - returns null if not found (lenient)
TurboModuleRegistry.get<Spec>('CaptureStudio');
```

We use `getEnforcing` because if the native module doesn't exist, something is seriously wrong and we want to know immediately.

---

## File 2: `src/index.tsx`

This is the main file developers import when using this library.

### Complete Code

```typescript
import CaptureStudio from './NativeCaptureStudio';

export type CaptureOptions = {
  multiple?: boolean;
  maxCount?: number;
  edit?: boolean;
  compress?: {
    quality?: number;
  };
};

export function openCaptureStudio(options: CaptureOptions = {}): Promise<any> {
  return CaptureStudio.openCaptureStudio(options);
}
```

### Line-by-Line Breakdown

---

#### Line 1: Importing the Native Module

```typescript
import CaptureStudio from './NativeCaptureStudio';
```

| Part | Meaning |
|------|---------|
| `import CaptureStudio` | Import the default export and call it "CaptureStudio" |
| `from './NativeCaptureStudio'` | From the file in the same folder |

**What do we get?**

`CaptureStudio` is now the native module object. It has the `openCaptureStudio()` function we can call.

---

#### Lines 3-10: Defining Options Type

```typescript
export type CaptureOptions = {
  multiple?: boolean;
  maxCount?: number;
  edit?: boolean;
  compress?: {
    quality?: number;
  };
};
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `export` | Makes this type available to other files |
| `type` | Defines a TypeScript type (similar to interface) |
| `CaptureOptions` | The name of our type |
| `= { ... }` | The shape of the type |

**What is `?` after property names?**

The `?` means "optional" - you don't have to provide this property.

```typescript
multiple?: boolean;
// This property is optional. Both of these are valid:
{ multiple: true }  // with multiple
{}                  // without multiple
```

**Understanding each property:**

```typescript
export type CaptureOptions = {
  multiple?: boolean;      // Can user select multiple photos?
  maxCount?: number;       // Maximum number of photos allowed
  edit?: boolean;          // Can user edit photos before saving?
  compress?: {             // Compression settings (nested object)
    quality?: number;      // Compression quality (0-100)
  };
};
```

**What is a nested type?**

`compress` is an object inside an object:

```typescript
// Using compress:
{
  compress: {
    quality: 80
  }
}

// Or without compress:
{}
```

---

#### Lines 12-14: The Main Function

```typescript
export function openCaptureStudio(options: CaptureOptions = {}): Promise<any> {
  return CaptureStudio.openCaptureStudio(options);
}
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `export` | Makes function available to other files |
| `function` | Declares a function |
| `openCaptureStudio` | Function name |
| `(options: CaptureOptions = {})` | Parameter with type and default value |
| `: Promise<any>` | Return type |
| `{ return ... }` | Function body |

**Understanding the parameter:**

```typescript
options: CaptureOptions = {}
```

| Part | Meaning |
|------|---------|
| `options` | Parameter name |
| `: CaptureOptions` | Parameter must match CaptureOptions type |
| `= {}` | Default value if nothing is passed |

**All of these work:**

```typescript
openCaptureStudio()                           // Uses default {}
openCaptureStudio({})                         // Same as above
openCaptureStudio({ multiple: true })         // With options
openCaptureStudio({ multiple: true, edit: true })  // Multiple options
```

**The function body:**

```typescript
return CaptureStudio.openCaptureStudio(options);
```

This simply passes the options to the native module and returns its Promise.

**Why wrap the native call?**

1. **Type safety**: Ensures developers use correct types
2. **Default values**: Provides sensible defaults
3. **Abstraction**: Hides the native module implementation
4. **Future flexibility**: Easy to add logic later

---

## How Developers Use This Library

```typescript
// In a React Native app:
import { openCaptureStudio } from 'react-native-capture-studio';

// Simple usage
const photos = await openCaptureStudio();

// With options
const photos = await openCaptureStudio({
  multiple: true,
  maxCount: 5,
  edit: true,
  compress: {
    quality: 80
  }
});
```

---

# Phase 3: Kotlin Bridge Layer

Now we enter the native Android code written in Kotlin.

## File 1: `CaptureStudioModule.kt`

This is the main bridge between JavaScript and Android.

### Complete Code

```kotlin
package com.capturestudio

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import android.content.Intent
import com.capturestudio.ui.camera.CameraActivity

@ReactModule(name = CaptureStudioModule.NAME)
class CaptureStudioModule(reactContext: ReactApplicationContext) :
  NativeCaptureStudioSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun openCaptureStudio(
    options: ReadableMap,
    promise: Promise
  ) {
    val intent = Intent(
        reactApplicationContext,
        CameraActivity::class.java
    )
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    reactApplicationContext.startActivity(intent)

    promise.resolve(null)
  }

  companion object {
    const val NAME = "CaptureStudio"
  }
}
```

### Line-by-Line Breakdown

---

#### Line 1: Package Declaration

```kotlin
package com.capturestudio
```

**What is a package?**

A package is like a folder address for your code. It:

- Organizes code into groups
- Prevents naming conflicts
- Follows reverse domain convention (com.companyname.appname)

```
com.capturestudio
    |
    +-- CaptureStudioModule.kt (this file)
    +-- CaptureStudioPackage.kt
    +-- ui/
    |   +-- camera/
    |       +-- CameraActivity.kt
    +-- data/
        +-- CameraRepository.kt
```

---

#### Lines 3-8: Import Statements

```kotlin
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import android.content.Intent
import com.capturestudio.ui.camera.CameraActivity
```

**What is `import`?**

`import` brings code from other places so you can use it. Without imports, you'd have to write the full path every time:

```kotlin
// Without import:
com.facebook.react.bridge.Promise

// With import:
Promise
```

**What each import does:**

| Import | Purpose |
|--------|---------|
| `ReactApplicationContext` | Access to the React Native app context |
| `ReactModule` | Annotation to mark this as a React Native module |
| `Promise` | JavaScript Promise object for async operations |
| `ReadableMap` | JavaScript object converted to Kotlin (read-only) |
| `Intent` | Android's way to start activities |
| `CameraActivity` | Our camera screen |

---

#### Lines 10-11: The Annotation

```kotlin
@ReactModule(name = CaptureStudioModule.NAME)
```

**What is an annotation?**

An annotation is metadata (extra information) attached to code. It starts with `@` and tells the framework something special about this code.

```kotlin
@ReactModule(name = CaptureStudioModule.NAME)
// This says: "This class is a React Native module named 'CaptureStudio'"
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `@ReactModule` | This is a React Native native module |
| `name = ...` | The name JavaScript uses to find this module |
| `CaptureStudioModule.NAME` | References the constant "CaptureStudio" |

---

#### Lines 12-13: Class Declaration

```kotlin
class CaptureStudioModule(reactContext: ReactApplicationContext) :
  NativeCaptureStudioSpec(reactContext) {
```

**Let's break this down piece by piece:**

**`class`**

Declares a new class. A class is a blueprint for creating objects.

```kotlin
class CaptureStudioModule  // Creates a new class called CaptureStudioModule
```

**`(reactContext: ReactApplicationContext)`**

This is the **constructor** - code that runs when creating a new instance.

```kotlin
// Constructor parameters:
(reactContext: ReactApplicationContext)

// Means: "When creating this class, you must provide a reactContext"
```

| Part | Meaning |
|------|---------|
| `reactContext` | Parameter name |
| `: ReactApplicationContext` | Parameter type |

**`: NativeCaptureStudioSpec(reactContext)`**

This is **inheritance**. The `:` symbol means "extends" or "inherits from".

```kotlin
class CaptureStudioModule : NativeCaptureStudioSpec
// Means: CaptureStudioModule IS-A NativeCaptureStudioSpec
```

**What is `NativeCaptureStudioSpec`?**

It's auto-generated by React Native's codegen from your TypeScript Spec. It contains:

- Abstract method `openCaptureStudio()` that you must implement
- Connection to the JavaScript interface

```
TypeScript Spec (NativeCaptureStudio.ts)
           |
           | codegen generates
           v
Kotlin Class (NativeCaptureStudioSpec)
           |
           | we extend
           v
Our Implementation (CaptureStudioModule)
```

---

#### Lines 15-17: getName() Method

```kotlin
override fun getName(): String {
  return NAME
}
```

**Breaking it down:**

| Part | Meaning |
|------|---------|
| `override` | We're replacing a method from the parent class |
| `fun` | Declares a function (short for "function") |
| `getName()` | Function name (no parameters) |
| `: String` | Returns a String |
| `return NAME` | Returns the value of NAME constant |

**What is `override`?**

The parent class (`NativeCaptureStudioSpec`) has a method called `getName()`. We're providing our own implementation:

```kotlin
// Parent class has:
abstract fun getName(): String  // "You must implement this"

// We provide:
override fun getName(): String {
  return NAME  // Returns "CaptureStudio"
}
```

**What is `fun`?**

`fun` is Kotlin's keyword for declaring functions:

```kotlin
// Kotlin
fun getName(): String { ... }

// JavaScript equivalent
function getName() { ... }
```

---

#### Lines 19-32: openCaptureStudio() Method

```kotlin
override fun openCaptureStudio(
  options: ReadableMap,
  promise: Promise
) {
  val intent = Intent(
      reactApplicationContext,
      CameraActivity::class.java
  )
  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  reactApplicationContext.startActivity(intent)

  promise.resolve(null)
}
```

**Function signature:**

```kotlin
override fun openCaptureStudio(
  options: ReadableMap,
  promise: Promise
)
```

| Part | Meaning |
|------|---------|
| `override` | Implementing parent's abstract method |
| `fun openCaptureStudio` | Function name |
| `options: ReadableMap` | JavaScript object (read-only in Kotlin) |
| `promise: Promise` | JavaScript Promise for returning results |

**What is `ReadableMap`?**

When JavaScript sends an object to Kotlin, it becomes a `ReadableMap`:

```javascript
// JavaScript sends:
{ multiple: true, maxCount: 5 }

// Kotlin receives as ReadableMap:
options.getBoolean("multiple")  // true
options.getInt("maxCount")      // 5
```

**Creating an Intent:**

```kotlin
val intent = Intent(
    reactApplicationContext,
    CameraActivity::class.java
)
```

| Part | Meaning |
|------|---------|
| `val` | Declares a variable that cannot be changed |
| `intent` | Variable name |
| `Intent(...)` | Creates a new Intent |
| `reactApplicationContext` | Where we're starting from (the app) |
| `CameraActivity::class.java` | Where we're going to (the camera screen) |

**What is `val`?**

Kotlin has two ways to declare variables:

```kotlin
val name = "John"   // Cannot be changed (immutable)
var age = 25        // Can be changed (mutable)

name = "Jane"  // ERROR! val cannot be changed
age = 26       // OK, var can be changed
```

**What is `::class.java`?**

This gets the Java class reference. Android's Intent system needs Java class references:

```kotlin
CameraActivity::class.java
// Means: "The Java class object for CameraActivity"
```

**Adding flags:**

```kotlin
intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
```

This flag tells Android: "Start this activity in a new task." Required when starting an activity from a non-activity context.

**Starting the activity:**

```kotlin
reactApplicationContext.startActivity(intent)
```

This actually launches the CameraActivity.

**Resolving the promise:**

```kotlin
promise.resolve(null)
```

This tells JavaScript: "The operation completed successfully." We pass `null` because we're not returning data yet.

```kotlin
promise.resolve(null)      // Success with no data
promise.resolve(someData)  // Success with data
promise.reject("ERROR", "Something went wrong")  // Failure
```

---

#### Lines 34-36: Companion Object

```kotlin
companion object {
  const val NAME = "CaptureStudio"
}
```

**What is `companion object`?**

A `companion object` is like a static container in Kotlin. Its contents belong to the class itself, not to instances of the class.

```kotlin
// Without companion object - each instance has its own copy
class Dog {
  val name = "Buddy"
}
val dog1 = Dog()
val dog2 = Dog()
// dog1.name and dog2.name are separate

// With companion object - shared by all instances
class Dog {
  companion object {
    const val SPECIES = "Canis familiaris"
  }
}
// Dog.SPECIES - accessed on the class, not instances
```

**What is `const val`?**

```kotlin
const val NAME = "CaptureStudio"
```

| Part | Meaning |
|------|---------|
| `const` | Compile-time constant (value known before running) |
| `val` | Cannot be changed |
| `NAME` | Constant name (UPPERCASE by convention) |
| `= "CaptureStudio"` | The value |

**Why use `const val` vs just `val`?**

```kotlin
const val NAME = "CaptureStudio"  // Resolved at compile time (faster)
val name = "CaptureStudio"        // Resolved at runtime
```

---

## File 2: `CaptureStudioPackage.kt`

This file registers our module with React Native.

### Complete Code

```kotlin
package com.capturestudio

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class CaptureStudioPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == CaptureStudioModule.NAME) {
      CaptureStudioModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[CaptureStudioModule.NAME] = ReactModuleInfo(
        CaptureStudioModule.NAME,
        CaptureStudioModule.NAME,
        false,  // canOverrideExistingModule
        false,  // needsEagerInit
        false,  // isCxxModule
        true    // isTurboModule
      )
      moduleInfos
    }
  }
}
```

### Line-by-Line Breakdown

---

#### Line 10: Class Declaration

```kotlin
class CaptureStudioPackage : BaseReactPackage() {
```

| Part | Meaning |
|------|---------|
| `class CaptureStudioPackage` | New class named CaptureStudioPackage |
| `: BaseReactPackage()` | Extends BaseReactPackage |
| `()` | Calls the parent's constructor |

**What is `BaseReactPackage`?**

It's React Native's base class for packages. A package groups related native modules together.

---

#### Lines 11-17: getModule() Method

```kotlin
override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
  return if (name == CaptureStudioModule.NAME) {
    CaptureStudioModule(reactContext)
  } else {
    null
  }
}
```

**Function signature:**

```kotlin
fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule?
```

| Part | Meaning |
|------|---------|
| `name: String` | The module name being requested |
| `reactContext` | The React Native app context |
| `: NativeModule?` | Returns a NativeModule, or null |

**What is `?` in the return type?**

The `?` means "nullable" - this function can return `null`:

```kotlin
NativeModule   // Must return a NativeModule
NativeModule?  // Can return a NativeModule OR null
```

**The if expression:**

```kotlin
return if (name == CaptureStudioModule.NAME) {
  CaptureStudioModule(reactContext)
} else {
  null
}
```

In Kotlin, `if` can be an expression that returns a value:

```kotlin
// Kotlin if-expression (returns a value)
val result = if (condition) { valueIfTrue } else { valueIfFalse }

// JavaScript equivalent
const result = condition ? valueIfTrue : valueIfFalse;
```

---

#### Lines 19-31: getReactModuleInfoProvider() Method

```kotlin
override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
  return ReactModuleInfoProvider {
    val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
    moduleInfos[CaptureStudioModule.NAME] = ReactModuleInfo(
      CaptureStudioModule.NAME,
      CaptureStudioModule.NAME,
      false,  // canOverrideExistingModule
      false,  // needsEagerInit
      false,  // isCxxModule
      true    // isTurboModule
    )
    moduleInfos
  }
}
```

**What is `ReactModuleInfoProvider { ... }`?**

This creates an anonymous object that implements ReactModuleInfoProvider. The `{ }` is a lambda expression.

```kotlin
ReactModuleInfoProvider {
  // Code here runs when React Native asks for module info
}
```

**Creating the map:**

```kotlin
val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
```

| Part | Meaning |
|------|---------|
| `MutableMap<String, ReactModuleInfo>` | A map with String keys and ReactModuleInfo values |
| `HashMap()` | Creates an empty HashMap |

**What is a Map?**

A Map is like a dictionary - it stores key-value pairs:

```kotlin
// Map structure:
{
  "CaptureStudio" -> ReactModuleInfo(...)
}
```

**Adding module info:**

```kotlin
moduleInfos[CaptureStudioModule.NAME] = ReactModuleInfo(
  CaptureStudioModule.NAME,  // name
  CaptureStudioModule.NAME,  // className
  false,  // canOverrideExistingModule
  false,  // needsEagerInit
  false,  // isCxxModule
  true    // isTurboModule
)
```

| Parameter | Value | Meaning |
|-----------|-------|---------|
| name | "CaptureStudio" | Module identifier |
| className | "CaptureStudio" | Class name for logging |
| canOverrideExistingModule | false | Don't replace other modules |
| needsEagerInit | false | Load when needed, not at startup |
| isCxxModule | false | Not a C++ module |
| isTurboModule | true | Yes, this is a Turbo Module |

---

# Phase 4: MVVM Architecture

## What is MVVM?

MVVM stands for **Model-View-ViewModel**. It's a way to organize code into three layers:

```
+------------------+
|      VIEW        |  <-- What user sees and touches
|  (CameraActivity)|
+------------------+
         |
         | observes state, calls functions
         v
+------------------+
|    VIEWMODEL     |  <-- Manages UI state and logic
| (CameraViewModel)|
+------------------+
         |
         | calls data functions
         v
+------------------+
|      MODEL       |  <-- Handles data and business logic
|(CameraRepository)|
+------------------+
```

## Restaurant Analogy

Think of a restaurant:

| MVVM Layer | Restaurant | Role |
|------------|------------|------|
| View | Customer | Sees the menu, places orders, receives food |
| ViewModel | Waiter | Takes orders, tracks status, communicates between customer and kitchen |
| Model | Kitchen | Actually prepares the food, handles the real work |

**The flow:**

1. Customer (View) tells Waiter (ViewModel): "I want a burger"
2. Waiter (ViewModel) tells Kitchen (Model): "Make a burger"
3. Kitchen (Model) makes the burger and tells Waiter
4. Waiter (ViewModel) updates the order status
5. Customer (View) automatically sees the status update

---

## File 1: `CameraUiState.kt`

This file defines the shape of our UI state.

### Complete Code

```kotlin
package com.capturestudio.ui.camera

data class CameraUiState(
    val isCameraReady: Boolean = false,
    val isCapturing: Boolean = false,
    val error: String? = null
)
```

### Line-by-Line Breakdown

---

#### Line 1: Package Declaration

```kotlin
package com.capturestudio.ui.camera
```

This file is in the `ui/camera` package - it's UI-related code for the camera feature.

---

#### Lines 3-7: Data Class

```kotlin
data class CameraUiState(
    val isCameraReady: Boolean = false,
    val isCapturing: Boolean = false,
    val error: String? = null
)
```

**What is `data class`?**

A `data class` is a special kind of class in Kotlin designed to hold data. Kotlin automatically generates useful methods for you:

```kotlin
// With data class, you automatically get:

// 1. toString() - convert to readable text
println(state)  // "CameraUiState(isCameraReady=false, isCapturing=false, error=null)"

// 2. equals() - compare two objects
state1 == state2  // Compares all properties

// 3. copy() - create a modified copy
val newState = state.copy(isCameraReady = true)

// 4. hashCode() - for use in collections
```

**Without `data class`:**

```kotlin
// You'd have to write all this yourself!
class CameraUiState(
    val isCameraReady: Boolean = false,
    val isCapturing: Boolean = false,
    val error: String? = null
) {
    override fun toString(): String {
        return "CameraUiState(isCameraReady=$isCameraReady, ...)"
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is CameraUiState) return false
        return isCameraReady == other.isCameraReady &&
               isCapturing == other.isCapturing &&
               error == other.error
    }

    override fun hashCode(): Int {
        // ... complex implementation
    }

    fun copy(...): CameraUiState {
        // ... implementation
    }
}
```

**Understanding each property:**

```kotlin
val isCameraReady: Boolean = false
```

| Part | Meaning |
|------|---------|
| `val` | Cannot be changed (immutable) |
| `isCameraReady` | Property name |
| `: Boolean` | Type (true or false) |
| `= false` | Default value |

```kotlin
val error: String? = null
```

The `?` means this can be `null` (no error) or have a value (error message).

**Why immutable state?**

Immutable state prevents bugs:

```kotlin
// Bad: Mutable state can be changed anywhere
var state = CameraUiState()
state.isCameraReady = true  // If this were allowed, hard to track changes

// Good: Immutable state - create new objects
val state = CameraUiState()
val newState = state.copy(isCameraReady = true)  // Clear where change happens
```

---

## File 2: `CameraRepository.kt`

This is the Model layer - handles camera operations.

### Complete Code

```kotlin
package com.capturestudio.data

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner

class CameraRepository {

    private var cameraProvider: ProcessCameraProvider? = null

    fun startCamera(
        context: Context,
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView
    ) {
        val providerFuture = ProcessCameraProvider.getInstance(context)

        providerFuture.addListener({
            cameraProvider = providerFuture.get()

            val preview = Preview.Builder().build()
            preview.setSurfaceProvider(previewView.surfaceProvider)

            val selector = CameraSelector.DEFAULT_BACK_CAMERA

            cameraProvider?.unbindAll()
            cameraProvider?.bindToLifecycle(
                lifecycleOwner,
                selector,
                preview
            )
        }, ContextCompat.getMainExecutor(context))
    }

    fun release() {
        cameraProvider?.unbindAll()
        cameraProvider = null
    }
}
```

### Line-by-Line Breakdown

---

#### Line 1: Package Declaration

```kotlin
package com.capturestudio.data
```

This is in the `data` package - it handles data/business logic.

---

#### Lines 3-9: Imports

```kotlin
import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
```

**What these imports do:**

| Import | Purpose |
|--------|---------|
| `Context` | Android's way to access app resources |
| `CameraSelector` | Choose which camera (front/back) |
| `Preview` | Displays camera feed |
| `ProcessCameraProvider` | Manages camera lifecycle |
| `PreviewView` | View that shows camera preview |
| `ContextCompat` | Compatibility utilities |
| `LifecycleOwner` | Knows when Activity is alive/dead |

---

#### Line 11: Class Declaration

```kotlin
class CameraRepository {
```

A plain class (not `data class`) because this has behavior, not just data.

---

#### Line 13: Private Property

```kotlin
private var cameraProvider: ProcessCameraProvider? = null
```

| Part | Meaning |
|------|---------|
| `private` | Only this class can access it |
| `var` | Can be changed (mutable) |
| `cameraProvider` | Property name |
| `: ProcessCameraProvider?` | Type, nullable (can be null) |
| `= null` | Initially null |

---

#### Lines 15-37: startCamera() Function

```kotlin
fun startCamera(
    context: Context,
    lifecycleOwner: LifecycleOwner,
    previewView: PreviewView
) {
```

**Parameters:**

| Parameter | Purpose |
|-----------|---------|
| `context` | Needed to access Android services |
| `lifecycleOwner` | Usually the Activity - knows when to start/stop |
| `previewView` | Where to display camera feed |

**Getting the camera provider:**

```kotlin
val providerFuture = ProcessCameraProvider.getInstance(context)
```

This asks Android for the camera. It returns a "Future" because getting the camera takes time.

**Adding a listener:**

```kotlin
providerFuture.addListener({
    // This code runs when camera is ready
}, ContextCompat.getMainExecutor(context))
```

| Part | Meaning |
|------|---------|
| `addListener({...}, ...)` | Run this code when camera is ready |
| `{ ... }` | Lambda (anonymous function) |
| `ContextCompat.getMainExecutor(context)` | Run on main thread |

**What is a Lambda?**

A lambda is code that can be passed around like data:

```kotlin
// Lambda syntax in Kotlin
{ parameter1, parameter2 ->
    // code
}

// Or with no parameters:
{
    // code
}
```

**Inside the listener:**

```kotlin
cameraProvider = providerFuture.get()
```

Gets the actual camera provider (now that it's ready).

```kotlin
val preview = Preview.Builder().build()
preview.setSurfaceProvider(previewView.surfaceProvider)
```

Creates a Preview and tells it where to display (the PreviewView).

```kotlin
val selector = CameraSelector.DEFAULT_BACK_CAMERA
```

Chooses the back camera (not selfie camera).

```kotlin
cameraProvider?.unbindAll()
cameraProvider?.bindToLifecycle(
    lifecycleOwner,
    selector,
    preview
)
```

| Part | Meaning |
|------|---------|
| `?.` | Safe call - only run if not null |
| `unbindAll()` | Disconnect any existing cameras |
| `bindToLifecycle()` | Connect camera to Activity's lifecycle |

**What is `?.` (safe call operator)?**

```kotlin
cameraProvider?.unbindAll()

// Same as:
if (cameraProvider != null) {
    cameraProvider.unbindAll()
}
```

---

#### Lines 39-42: release() Function

```kotlin
fun release() {
    cameraProvider?.unbindAll()
    cameraProvider = null
}
```

Cleans up camera resources when done.

---

## File 3: `CameraViewModel.kt`

The ViewModel - manages UI state and connects View to Model.

### Complete Code

```kotlin
package com.capturestudio.ui.camera

import android.content.Context
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.capturestudio.data.CameraRepository

class CameraViewModel(
    private val cameraRepository: CameraRepository
) : ViewModel() {

    private val _uiState = MutableLiveData(CameraUiState())
    val uiState: LiveData<CameraUiState> = _uiState

    fun startCamera(
        context: Context,
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView
    ) {
        cameraRepository.startCamera(
            context = context,
            lifecycleOwner = lifecycleOwner,
            previewView = previewView
        )
    }

    override fun onCleared() {
        super.onCleared()
        cameraRepository.release()
    }
}
```

### Line-by-Line Breakdown

---

#### Lines 11-13: Class Declaration

```kotlin
class CameraViewModel(
    private val cameraRepository: CameraRepository
) : ViewModel() {
```

**Constructor parameter:**

```kotlin
private val cameraRepository: CameraRepository
```

| Part | Meaning |
|------|---------|
| `private` | Only this class can access it |
| `val` | Cannot be reassigned |
| `cameraRepository` | The repository for camera operations |

This is **dependency injection** - the repository is given to us, not created by us.

**Inheritance:**

```kotlin
: ViewModel()
```

Extends Android's `ViewModel` class which:

- Survives screen rotation
- Has lifecycle awareness
- Gets `onCleared()` called when done

---

#### Lines 15-16: LiveData State

```kotlin
private val _uiState = MutableLiveData(CameraUiState())
val uiState: LiveData<CameraUiState> = _uiState
```

**What is LiveData?**

LiveData is an observable data holder. When the data changes, observers are automatically notified:

```kotlin
// In ViewModel:
_uiState.value = CameraUiState(isCameraReady = true)

// In Activity (observer):
viewModel.uiState.observe(this) { state ->
    // This runs automatically when state changes!
    if (state.isCameraReady) {
        showCamera()
    }
}
```

**Why two versions?**

```kotlin
private val _uiState = MutableLiveData(...)  // Private, can be modified
val uiState: LiveData<...> = _uiState        // Public, read-only
```

| Version | Access | Can Modify? |
|---------|--------|-------------|
| `_uiState` | Private (only ViewModel) | Yes |
| `uiState` | Public (Activity can see) | No |

**The underscore convention:**

The `_` prefix is a common convention meaning "private backing field":

```kotlin
private val _uiState = ...  // Internal, modifiable
val uiState = ...           // External, read-only
```

---

#### Lines 18-28: startCamera() Function

```kotlin
fun startCamera(
    context: Context,
    lifecycleOwner: LifecycleOwner,
    previewView: PreviewView
) {
    cameraRepository.startCamera(
        context = context,
        lifecycleOwner = lifecycleOwner,
        previewView = previewView
    )
}
```

This function delegates to the repository. The ViewModel doesn't directly handle camera logic.

**Named arguments:**

```kotlin
cameraRepository.startCamera(
    context = context,           // Named argument
    lifecycleOwner = lifecycleOwner,
    previewView = previewView
)
```

Named arguments make code more readable. You know exactly what each value is for.

---

#### Lines 30-33: onCleared() Lifecycle Method

```kotlin
override fun onCleared() {
    super.onCleared()
    cameraRepository.release()
}
```

| Part | Meaning |
|------|---------|
| `override` | Implementing parent's method |
| `onCleared()` | Called when ViewModel is being destroyed |
| `super.onCleared()` | Call parent's implementation first |
| `cameraRepository.release()` | Clean up camera resources |

**When is `onCleared()` called?**

When the Activity is permanently destroyed (not just rotated):

- User presses back button
- Activity is finished
- System needs memory

---

## File 4: `CameraViewModelFactory.kt`

Factory that creates ViewModels with dependencies.

### Complete Code

```kotlin
package com.capturestudio.ui.camera

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.capturestudio.data.CameraRepository

class CameraViewModelFactory : ViewModelProvider.Factory {

    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CameraViewModel::class.java)) {
            return CameraViewModel(
                cameraRepository = CameraRepository()
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
```

### Line-by-Line Breakdown

---

#### Line 7: Class Declaration

```kotlin
class CameraViewModelFactory : ViewModelProvider.Factory {
```

Implements `ViewModelProvider.Factory` - the interface Android uses to create ViewModels.

---

#### Lines 9-16: create() Method

```kotlin
override fun <T : ViewModel> create(modelClass: Class<T>): T {
```

**What is `<T : ViewModel>`?**

This is a **generic type parameter**:

| Part | Meaning |
|------|---------|
| `<T>` | T is a placeholder for any type |
| `: ViewModel` | T must be a ViewModel or subclass |

```kotlin
// T could be:
CameraViewModel
MediaViewModel
SettingsViewModel
// etc.
```

**The method body:**

```kotlin
if (modelClass.isAssignableFrom(CameraViewModel::class.java)) {
    return CameraViewModel(
        cameraRepository = CameraRepository()
    ) as T
}
throw IllegalArgumentException("Unknown ViewModel class")
```

| Part | Meaning |
|------|---------|
| `isAssignableFrom` | Checks if requested class is CameraViewModel |
| `CameraRepository()` | Creates a new repository |
| `as T` | Casts to type T |
| `throw` | Throws an error if unknown class |

**What is `as T`?**

Type casting - telling Kotlin "trust me, this is type T":

```kotlin
CameraViewModel(...) as T
// "Treat this CameraViewModel as type T"
```

---

## File 5: `CameraActivity.kt`

The View layer - displays UI and handles user interaction.

### Complete Code

```kotlin
package com.capturestudio.ui.camera

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.capturestudio.R

class CameraActivity : AppCompatActivity() {

    private val viewModel: CameraViewModel by viewModels {
        CameraViewModelFactory()
    }

    private lateinit var previewView: PreviewView

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) {
                startCamera()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_camera)

        previewView = findViewById(R.id.previewView)

        if (hasCameraPermission()) {
            startCamera()
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startCamera() {
        viewModel.startCamera(
            context = this,
            lifecycleOwner = this,
            previewView = previewView
        )
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }
}
```

### Line-by-Line Breakdown

---

#### Line 13: Class Declaration

```kotlin
class CameraActivity : AppCompatActivity() {
```

`AppCompatActivity` is Android's base Activity class with backward compatibility features.

---

#### Lines 15-17: ViewModel with Delegation

```kotlin
private val viewModel: CameraViewModel by viewModels {
    CameraViewModelFactory()
}
```

**What is `by viewModels`?**

This is **property delegation** - a Kotlin feature:

```kotlin
by viewModels { ... }
// "Get this property using the viewModels helper"
```

**How it works:**

1. First time `viewModel` is accessed, `viewModels { }` runs
2. Creates `CameraViewModelFactory()`
3. Factory creates `CameraViewModel`
4. ViewModel is stored and reused

**Why use delegation?**

The ViewModel survives screen rotation:

```kotlin
// Without proper ViewModel handling:
// Screen rotates -> Activity destroyed -> ViewModel lost -> State lost!

// With viewModels delegation:
// Screen rotates -> Activity destroyed -> ViewModel survives -> State preserved!
```

---

#### Line 19: lateinit Property

```kotlin
private lateinit var previewView: PreviewView
```

**What is `lateinit`?**

`lateinit` means "I'll initialize this later":

```kotlin
lateinit var previewView: PreviewView  // Promise to set it later

// Later in onCreate:
previewView = findViewById(R.id.previewView)  // Now it's initialized
```

**Why use `lateinit`?**

Views can't be found until after `setContentView()` is called, but we want to declare the property at the class level.

**Rules for `lateinit`:**

- Only for `var` (not `val`)
- Only for non-nullable types
- Only for non-primitive types (not Int, Boolean, etc.)
- Must initialize before using (or get an error)

---

#### Lines 21-26: Permission Launcher

```kotlin
private val permissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            startCamera()
        }
    }
```

**What is this?**

This is the modern way to request permissions in Android:

1. `registerForActivityResult` - prepares a permission request
2. `ActivityResultContracts.RequestPermission()` - for requesting one permission
3. `{ granted -> ... }` - callback when user responds

**The flow:**

```
permissionLauncher.launch(permission)
          |
          v
    Android shows dialog
    "Allow camera access?"
          |
    +-----+-----+
    |           |
    v           v
  Allow       Deny
    |           |
    v           v
granted=true  granted=false
    |           |
    v           |
startCamera()   |
```

---

#### Lines 28-39: onCreate() Method

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_camera)

    previewView = findViewById(R.id.previewView)

    if (hasCameraPermission()) {
        startCamera()
    } else {
        permissionLauncher.launch(Manifest.permission.CAMERA)
    }
}
```

**What is `onCreate`?**

The first lifecycle method called when Activity is created. This is where you:

- Set up the UI
- Initialize variables
- Start services

**Breaking it down:**

```kotlin
super.onCreate(savedInstanceState)
```

Call parent's onCreate first (required).

```kotlin
setContentView(R.layout.activity_camera)
```

Load the XML layout file. `R.layout.activity_camera` refers to `activity_camera.xml`.

```kotlin
previewView = findViewById(R.id.previewView)
```

Find the PreviewView by its ID and store it.

```kotlin
if (hasCameraPermission()) {
    startCamera()
} else {
    permissionLauncher.launch(Manifest.permission.CAMERA)
}
```

Check permission. If granted, start camera. If not, ask for permission.

---

#### Lines 41-47: startCamera() Method

```kotlin
private fun startCamera() {
    viewModel.startCamera(
        context = this,
        lifecycleOwner = this,
        previewView = previewView
    )
}
```

**What is `this`?**

`this` refers to the current Activity instance. CameraActivity is both:

- A `Context` (has access to app resources)
- A `LifecycleOwner` (knows when it's alive/dead)

---

#### Lines 49-54: hasCameraPermission() Method

```kotlin
private fun hasCameraPermission(): Boolean {
    return ContextCompat.checkSelfPermission(
        this,
        Manifest.permission.CAMERA
    ) == PackageManager.PERMISSION_GRANTED
}
```

Checks if camera permission is already granted.

---

## File 6: `activity_camera.xml`

The XML layout file that defines what the screen looks like.

### Complete Code

```xml
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000">

    <androidx.camera.view.PreviewView
        android:id="@+id/previewView"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
</FrameLayout>
```

### Line-by-Line Breakdown

---

#### Lines 1-4: FrameLayout Container

```xml
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="#000">
```

| Part | Meaning |
|------|---------|
| `<FrameLayout>` | Container that stacks children on top of each other |
| `xmlns:android="..."` | Declares the Android namespace |
| `layout_width="match_parent"` | Fill parent's width |
| `layout_height="match_parent"` | Fill parent's height |
| `background="#000"` | Black background |

---

#### Lines 6-8: PreviewView

```xml
<androidx.camera.view.PreviewView
    android:id="@+id/previewView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

| Part | Meaning |
|------|---------|
| `<androidx.camera.view.PreviewView>` | CameraX's view for camera preview |
| `android:id="@+id/previewView"` | Gives this view an ID |
| `@+id/` | Creates a new ID (the `+` means "create") |
| `previewView` | The ID name (used in `findViewById`) |

---

# Phase 5: Complete Data Flow

Here's exactly what happens when a user calls `openCaptureStudio()`:

```
Step 1: JavaScript Call
========================
Developer writes:
  openCaptureStudio({ multiple: true })
    |
    v

Step 2: TypeScript Wrapper (src/index.tsx)
==========================================
export function openCaptureStudio(options = {}) {
  return CaptureStudio.openCaptureStudio(options);
}
    |
    v

Step 3: Turbo Module Registry (src/NativeCaptureStudio.ts)
==========================================================
TurboModuleRegistry.getEnforcing<Spec>('CaptureStudio')
  -> Finds native module named "CaptureStudio"
    |
    v

Step 4: Package Registration (CaptureStudioPackage.kt)
======================================================
getModule("CaptureStudio") is called
  -> Returns CaptureStudioModule instance
    |
    v

Step 5: Native Module (CaptureStudioModule.kt)
==============================================
openCaptureStudio(options, promise) is called
  -> Creates Intent for CameraActivity
  -> Starts CameraActivity
  -> Calls promise.resolve(null)
    |
    v

Step 6: Activity Created (CameraActivity.kt)
============================================
onCreate() is called
  -> Sets content view (activity_camera.xml)
  -> Gets ViewModel via viewModels { }
  -> Checks camera permission
  -> If granted: calls startCamera()
  -> If not: requests permission
    |
    v

Step 7: ViewModel (CameraViewModel.kt)
======================================
startCamera() is called
  -> Delegates to CameraRepository
    |
    v

Step 8: Repository (CameraRepository.kt)
========================================
startCamera() is called
  -> Gets ProcessCameraProvider
  -> Creates Preview
  -> Binds to lifecycle
  -> Camera starts showing in PreviewView
    |
    v

Step 9: User Sees Camera!
=========================
Camera preview is visible on screen
```

---

# Phase 6: Glossary & Quick Reference

## Kotlin Keywords

| Keyword | Meaning | Example |
|---------|---------|---------|
| `class` | Defines a class | `class MyClass { }` |
| `data class` | Class for holding data (auto-generates methods) | `data class User(val name: String)` |
| `fun` | Defines a function | `fun greet() { }` |
| `val` | Immutable variable (cannot change) | `val name = "John"` |
| `var` | Mutable variable (can change) | `var age = 25` |
| `private` | Only accessible within this class | `private val secret = 123` |
| `override` | Replacing a parent's method | `override fun onCreate()` |
| `package` | Declares the package/namespace | `package com.example` |
| `import` | Brings in external code | `import android.os.Bundle` |
| `return` | Returns a value from function | `return 42` |
| `if` | Conditional | `if (x > 0) { }` |
| `else` | Alternative branch | `if (x > 0) { } else { }` |
| `companion object` | Static-like container | `companion object { const val X = 1 }` |
| `const` | Compile-time constant | `const val NAME = "App"` |
| `lateinit` | Initialize later | `lateinit var view: View` |
| `null` | No value | `val x: String? = null` |
| `this` | Current instance | `this.name` |
| `super` | Parent class | `super.onCreate()` |
| `throw` | Throw an exception | `throw Exception("Error")` |
| `as` | Type cast | `x as String` |

## Kotlin Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `?` | Nullable type | `String?` can be null |
| `?.` | Safe call | `x?.method()` only if x not null |
| `?:` | Elvis (null coalescing) | `x ?: "default"` |
| `::` | Reference | `MyClass::class.java` |
| `==` | Equals (value) | `a == b` |
| `===` | Same instance | `a === b` |

## Annotations

| Annotation | Purpose | Used On |
|------------|---------|---------|
| `@ReactModule` | Marks as React Native module | Class |
| `@Override` | (Java) Replaces parent method | Method |

## Android/CameraX Concepts

| Concept | Meaning |
|---------|---------|
| `Activity` | A screen in Android |
| `Context` | Access to app resources and services |
| `Intent` | Message to start an Activity or Service |
| `Bundle` | Key-value data container |
| `LifecycleOwner` | Knows Activity lifecycle state |
| `ProcessCameraProvider` | Manages camera access |
| `Preview` | Camera feed display use case |
| `CameraSelector` | Chooses front or back camera |
| `PreviewView` | View that displays camera feed |

## MVVM Concepts

| Concept | Meaning |
|---------|---------|
| `ViewModel` | Holds UI state, survives rotation |
| `LiveData` | Observable data holder |
| `MutableLiveData` | Writable version of LiveData |
| `Repository` | Single source of data/logic |
| `Factory` | Creates ViewModel with dependencies |

## React Native Concepts

| Concept | Meaning |
|---------|---------|
| `TurboModule` | Fast native module |
| `TurboModuleRegistry` | Finds native modules by name |
| `Promise` | Async result container |
| `ReadableMap` | JavaScript object in native code |
| `ReactApplicationContext` | React Native app context |
| `BaseReactPackage` | Groups native modules together |

---

## Quick Comparison: Kotlin vs JavaScript

| Concept | Kotlin | JavaScript |
|---------|--------|------------|
| Variable (mutable) | `var x = 1` | `let x = 1` |
| Variable (immutable) | `val x = 1` | `const x = 1` |
| Function | `fun greet() { }` | `function greet() { }` |
| Class | `class Dog { }` | `class Dog { }` |
| Nullable | `String?` | Just use null |
| Lambda | `{ x -> x * 2 }` | `(x) => x * 2` |
| String template | `"Hello $name"` | `` `Hello ${name}` `` |
| Type annotation | `val x: Int = 1` | `// TypeScript: let x: number = 1` |

---

## Common Patterns in This Codebase

### Pattern 1: Delegation with `by`

```kotlin
private val viewModel: CameraViewModel by viewModels {
    CameraViewModelFactory()
}
```

### Pattern 2: Private + Public State

```kotlin
private val _uiState = MutableLiveData(...)  // Private, writable
val uiState: LiveData<...> = _uiState        // Public, read-only
```

### Pattern 3: Safe Calls Chain

```kotlin
cameraProvider?.unbindAll()  // Only runs if not null
```

### Pattern 4: Factory Creation

```kotlin
class MyFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return MyViewModel(...) as T
    }
}
```

### Pattern 5: Lambda Listeners

```kotlin
providerFuture.addListener({
    // Code runs when ready
}, executor)
```

---

This completes the code walkthrough. You should now understand every line of code in this React Native Turbo Module library!
