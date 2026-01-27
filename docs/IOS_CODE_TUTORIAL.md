# iOS Image Processing Module - Complete Tutorial

This tutorial explains every line of the iOS code for the image compression and watermarking module. Written for developers new to iOS and Objective-C.

---

## Quick Start - How to Use

### Installation

```bash
yarn add react-native-capture-studio
cd ios && pod install && cd ..
```

### Basic Usage

```typescript
import { processImages, fetchProcessingResult } from 'react-native-capture-studio';

// Compress an image
const compressImage = async (imagePath: string) => {
  // 1. Start processing (returns immediately, works in background)
  const operationId = await processImages([
    {
      localPath: imagePath,                    // File path
      timeStamp: new Date().toLocaleString(),  // Watermark text
      isForOnlyWatermark: false,               // false = 300-500KB target
      compressJpegImage: false,                // false = WebP (better quality)
      replaceOriginal: true,                   // Replace original file
    }
  ]);

  // 2. Poll for completion
  const poll = async () => {
    const result = JSON.parse(await fetchProcessingResult(operationId));

    if (result.status === 'completed') {
      console.log('Done!', result.processedImages);
      // Original file is now compressed with watermark
    } else {
      setTimeout(poll, 500); // Check again in 500ms
    }
  };
  poll();
};
```

### API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `localPath` | string | required | Image file path |
| `timeStamp` | string | required | Watermark text |
| `isForOnlyWatermark` | boolean | false | true = 400-500KB, false = 300-500KB |
| `compressJpegImage` | boolean | false | false = WebP (better), true = JPEG |
| `replaceOriginal` | boolean | true | Always true (replaces file in place) |

### Result Object

```typescript
{
  "status": "completed",
  "processedImages": [
    {
      "localPath": "file:///path/to/image.jpg",
      "outputPath": "file:///path/to/image.jpg",  // Same path
      "success": true,
      "error": null
    }
  ]
}
```

---

## Table of Contents

1. [Understanding Objective-C Basics](#1-understanding-objective-c-basics)
2. [File Structure Overview](#2-file-structure-overview)
3. [ImageProcessor.h - Header File Explained](#3-imageprocessorh---header-file-explained)
4. [ImageProcessor.mm - Implementation Explained](#4-imageprocessormm---implementation-explained)
5. [CaptureStudio.mm - React Native Bridge Explained](#5-capturestudiomm---react-native-bridge-explained)
6. [Key iOS Concepts](#6-key-ios-concepts)
7. [Memory Management](#7-memory-management)
8. [Threading and Background Processing](#8-threading-and-background-processing)

---

## 1. Understanding Objective-C Basics

### Why Objective-C and not Swift?

React Native Turbo Modules use **Objective-C++** (`.mm` files) because:
- They need to interface with C++ code (React Native's JSI - JavaScript Interface)
- The React Native bridge is written in Objective-C
- `.mm` files can mix Objective-C, C++, and C code

### Objective-C Syntax Quick Reference

```objc
// This is a comment

/* This is a
   multi-line comment */

// Method call: [object methodName]
// In other languages: object.methodName()

// Method with parameter: [object methodName:parameter]
// In other languages: object.methodName(parameter)

// Method with multiple parameters: [object method:param1 secondParam:param2]
// In other languages: object.method(param1, param2)

// Creating objects: [[ClassName alloc] init]
// In other languages: new ClassName()

// String literal: @"Hello"
// In other languages: "Hello"

// Array literal: @[@"item1", @"item2"]
// Dictionary literal: @{@"key": @"value"}
// Number literal: @(42) or @42
// Boolean: @(YES) or @(NO)
```

---

## 2. File Structure Overview

```
ios/
├── CaptureStudio.h        # Header - declares the React Native module
├── CaptureStudio.mm       # Implementation - React Native bridge code
├── ImageProcessor.h       # Header - declares image processing class
└── ImageProcessor.mm      # Implementation - actual image processing logic
```

### Why separate Header (.h) and Implementation (.mm)?

In Objective-C/C++:
- **Header files (.h)**: Declare what a class CAN do (its interface)
- **Implementation files (.m or .mm)**: Define HOW it does it

This is like a restaurant menu (header) vs the kitchen (implementation):
- Menu tells you what dishes are available
- Kitchen actually makes the food

---

## 3. ImageProcessor.h - Header File Explained

```objc
#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>
```

**Line-by-line explanation:**

| Line | What it does |
|------|--------------|
| `#import <Foundation/Foundation.h>` | Imports Apple's Foundation framework. Gives us basic classes like `NSString`, `NSArray`, `NSError`, etc. Think of it as importing Python's standard library. |
| `#import <CoreGraphics/CoreGraphics.h>` | Imports CoreGraphics framework for low-level 2D drawing. We use this for image manipulation. |

```objc
NS_ASSUME_NONNULL_BEGIN
```

| Line | What it does |
|------|--------------|
| `NS_ASSUME_NONNULL_BEGIN` | Tells the compiler "all pointers in this section are non-null by default". Helps catch bugs where you accidentally pass `nil`. |

### ImageProcessorResult Class

```objc
@interface ImageProcessorResult : NSObject
@property (nonatomic, strong) NSString *outputPath;
@property (nonatomic, assign) BOOL success;
@property (nonatomic, strong, nullable) NSError *error;
@end
```

| Part | Meaning |
|------|---------|
| `@interface ImageProcessorResult : NSObject` | Declares a result class to hold processing output |
| `@property` | Declares a property (like a field with automatic getter/setter) |
| `(nonatomic, strong)` | Property attributes: `nonatomic` = not thread-safe (faster), `strong` = retain the object |
| `(nonatomic, assign)` | `assign` = simple value copy (used for primitives like BOOL) |
| `nullable` | This property can be nil |
| `outputPath` | Path where the processed image was saved (same as input - file replaced in place) |
| `success` | Whether processing succeeded |
| `error` | Error details if processing failed |

### ImageProcessor Class

```objc
@interface ImageProcessor : NSObject
```

| Line | What it does |
|------|--------------|
| `@interface` | Starts a class declaration (like `class` in Java/Python) |
| `ImageProcessor` | Our class name |
| `: NSObject` | Inherits from `NSObject` (the base class for all Objective-C objects, like `Object` in Java) |

```objc
+ (ImageProcessorResult *)processImageAtPath:(NSString *)path
                                   timeStamp:(NSString *)timeStamp
                          isForOnlyWatermark:(BOOL)isForOnlyWatermark
                                compressJpeg:(BOOL)compressJpeg
                             replaceOriginal:(BOOL)replaceOriginal;
```

**Method signature breakdown:**

| Part | Meaning |
|------|---------|
| `+` | This is a **class method** (like `static` in Java). Called on the class itself: `[ImageProcessor processImageAtPath:...]` |
| `-` | Would be an **instance method**. Called on an object: `[myProcessor doSomething]` |
| `(ImageProcessorResult *)` | Return type. Returns a result object containing success status, output path, and error |
| `processImageAtPath:` | First part of method name + first parameter label |
| `(NSString *)path` | First parameter: a string pointer named `path` |
| `timeStamp:(NSString *)timeStamp` | Second parameter with label `timeStamp` |
| `isForOnlyWatermark:(BOOL)isForOnlyWatermark` | Third parameter: affects compression target (400-500KB vs 300-500KB) |
| `compressJpeg:(BOOL)compressJpeg` | Fourth parameter: `NO` = WebP (default, better quality), `YES` = JPEG |
| `replaceOriginal:(BOOL)replaceOriginal` | Fifth parameter: always YES to match Android behavior (replace file in place) |

### Why Return a Result Object Instead of BOOL + Error Pointer?

The new pattern is cleaner and provides more information:

```objc
// Old pattern (error pointer):
NSError *error = nil;
BOOL success = [ImageProcessor processImageAtPath:@"/path" ... error:&error];

// New pattern (result object):
ImageProcessorResult *result = [ImageProcessor processImageAtPath:@"/path" ...];
if (result.success) {
    NSLog(@"Saved to: %@", result.outputPath);
} else {
    NSLog(@"Error: %@", result.error.localizedDescription);
}
```

The result object can carry additional information like the output path.

```objc
@end

NS_ASSUME_NONNULL_END
```

| Line | What it does |
|------|--------------|
| `@end` | Ends the class declaration |
| `NS_ASSUME_NONNULL_END` | Ends the non-null assumption section |

---

## 4. ImageProcessor.mm - Implementation Explained

### Imports Section

```objc
#import "ImageProcessor.h"
#import <ImageIO/ImageIO.h>
#import <UIKit/UIKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <CoreImage/CoreImage.h>
```

| Import | Purpose |
|--------|---------|
| `"ImageProcessor.h"` | Our own header file (quotes = local file) |
| `<ImageIO/ImageIO.h>` | Framework for reading/writing image files (JPEG, PNG, WebP, etc.) |
| `<UIKit/UIKit.h>` | iOS UI framework. We use it for `UIFont`, `UIColor`, `UIGraphics` |
| `<UniformTypeIdentifiers/UniformTypeIdentifiers.h>` | Modern way to specify file types (JPEG, WebP, etc.) |
| `<CoreImage/CoreImage.h>` | High-level image processing (we use it for EXIF rotation) |

### Implementation Start

```objc
@implementation ImageProcessor
```

| Line | What it does |
|------|--------------|
| `@implementation ImageProcessor` | Starts the implementation of the `ImageProcessor` class declared in the header |

### Pragma Marks

```objc
#pragma mark - Public API
```

| Line | What it does |
|------|--------------|
| `#pragma mark - Public API` | Creates a section header in Xcode's navigation. The `-` adds a separator line. This is just for code organization. |

### Main Processing Method

```objc
+ (ImageProcessorResult *)processImageAtPath:(NSString *)path
                                   timeStamp:(NSString *)timeStamp
                          isForOnlyWatermark:(BOOL)isForOnlyWatermark
                                compressJpeg:(BOOL)compressJpeg
                             replaceOriginal:(BOOL)replaceOriginal
{
    ImageProcessorResult *result = [[ImageProcessorResult alloc] init];
    result.success = NO;
    result.outputPath = path; // Always return original path (like Android)

    @autoreleasepool {
```

| Line | What it does |
|------|--------------|
| `ImageProcessorResult *result = [[ImageProcessorResult alloc] init]` | Create result object to return |
| `result.success = NO` | Default to failure, set to YES only on success |
| `result.outputPath = path` | Output path is always the same as input (file replaced in place, like Android) |
| `@autoreleasepool { ... }` | Creates a memory management scope. Objects created inside are automatically released when the block ends. **Critical for processing large images** to prevent memory buildup. |

### Step 1: Load Image

```objc
        // 1. Load image
        NSURL *fileURL = [NSURL fileURLWithPath:path];
```

| Line | What it does |
|------|--------------|
| `NSURL *fileURL` | Declares a variable `fileURL` of type `NSURL` (pointer to URL object) |
| `[NSURL fileURLWithPath:path]` | Creates a file URL from a string path. Example: `/tmp/image.jpg` → `file:///tmp/image.jpg` |

```objc
        CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)fileURL, NULL);
```

| Part | What it does |
|------|--------------|
| `CGImageSourceRef` | A reference (pointer) to an image source. `Ref` suffix = Core Foundation reference type. |
| `CGImageSourceCreateWithURL` | Core Foundation function to create an image source from a URL |
| `(__bridge CFURLRef)fileURL` | **Bridge cast**: Converts `NSURL*` (Objective-C) to `CFURLRef` (Core Foundation). The `__bridge` means "don't transfer ownership". |
| `NULL` | No options dictionary needed |

**Why Core Foundation?**

CoreGraphics uses **Core Foundation** (C-based API), not Objective-C. Core Foundation types have `Ref` suffix:
- `NSURL` (Obj-C) ↔ `CFURLRef` (CF)
- `NSString` (Obj-C) ↔ `CFStringRef` (CF)
- `NSDictionary` (Obj-C) ↔ `CFDictionaryRef` (CF)

```objc
        if (!source) {
            if (error) {
                *error = [NSError errorWithDomain:@"ImageProcessor"
                                             code:1
                                         userInfo:@{NSLocalizedDescriptionKey: @"Failed to load image"}];
            }
            return NO;
        }
```

| Part | What it does |
|------|--------------|
| `if (!source)` | Check if image source creation failed (returns NULL on failure) |
| `if (error)` | Check if caller wants error info (they might pass NULL if they don't care) |
| `*error = ...` | Dereference the double pointer and assign the error object |
| `[NSError errorWithDomain:code:userInfo:]` | Creates an error object with domain (category), error code, and details dictionary |
| `@{NSLocalizedDescriptionKey: @"..."}` | Dictionary literal. `NSLocalizedDescriptionKey` is a standard key for human-readable error messages. |
| `return NO;` | Return failure (NO = false in Objective-C) |

```objc
        CGImageRef originalImage = CGImageSourceCreateImageAtIndex(source, 0, NULL);
        CFRelease(source);
```

| Part | What it does |
|------|--------------|
| `CGImageRef` | Reference to a CoreGraphics image (the actual pixel data) |
| `CGImageSourceCreateImageAtIndex(source, 0, NULL)` | Create image from source at index 0 (first image). Some formats like GIF have multiple images. |
| `CFRelease(source)` | **Manual memory management**: Release the source object we created. Core Foundation objects must be manually released! |

### Step 2: EXIF Rotation

```objc
        // 2. Get EXIF orientation and rotate if needed
        CGImageRef rotatedImage = [self createRotatedImage:originalImage fromPath:path];
        CGImageRelease(originalImage);
```

| Part | What it does |
|------|--------------|
| `[self createRotatedImage:fromPath:]` | Call our own method. `self` = current class (since this is a class method) |
| `CGImageRelease(originalImage)` | Release the original image since we have a new rotated copy |

### The Rotation Method Explained

```objc
+ (CGImageRef)createRotatedImage:(CGImageRef)image fromPath:(NSString *)path
{
    // Read EXIF orientation
    NSURL *fileURL = [NSURL fileURLWithPath:path];
    CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)fileURL, NULL);

    if (!source) {
        CGImageRetain(image);
        return image;
    }
```

| Part | What it does |
|------|--------------|
| `CGImageRetain(image)` | **Increase reference count**. Since we're returning the same image (not a new one), we must retain it so caller can release it without double-freeing. |

```objc
    NSDictionary *properties = (__bridge_transfer NSDictionary *)
        CGImageSourceCopyPropertiesAtIndex(source, 0, NULL);
    CFRelease(source);
```

| Part | What it does |
|------|--------------|
| `CGImageSourceCopyPropertiesAtIndex` | Get image metadata (EXIF data) as a dictionary |
| `(__bridge_transfer NSDictionary *)` | Bridge cast that **transfers ownership** to Objective-C. The object will be auto-released by ARC. |
| `CFRelease(source)` | Release the source |

```objc
    NSNumber *orientationValue = properties[(__bridge NSString *)kCGImagePropertyOrientation];
```

| Part | What it does |
|------|--------------|
| `properties[key]` | Dictionary subscript access (like `dict["key"]` in Python) |
| `kCGImagePropertyOrientation` | Constant key for EXIF orientation value |
| `(__bridge NSString *)` | Cast Core Foundation constant to NSString |

```objc
    CGImagePropertyOrientation orientation = orientationValue ?
        (CGImagePropertyOrientation)[orientationValue intValue] :
        kCGImagePropertyOrientationUp;
```

| Part | What it does |
|------|--------------|
| `orientationValue ? ... : ...` | Ternary operator (like `value if condition else default` in Python) |
| `[orientationValue intValue]` | Convert NSNumber to integer |
| `(CGImagePropertyOrientation)` | Cast to enum type |
| `kCGImagePropertyOrientationUp` | Default orientation (no rotation needed) |

```objc
    if (orientation == kCGImagePropertyOrientationUp) {
        CGImageRetain(image);
        return image;
    }
```

| Part | What it does |
|------|--------------|
| If orientation is already "up", return the original image (retained) |

```objc
    // Create rotated image using CIImage (handles all EXIF orientations)
    CIImage *ciImage = [CIImage imageWithCGImage:image];
    ciImage = [ciImage imageByApplyingOrientation:orientation];

    CIContext *context = [CIContext contextWithOptions:nil];
    CGImageRef rotated = [context createCGImage:ciImage fromRect:ciImage.extent];

    return rotated;
}
```

| Part | What it does |
|------|--------------|
| `CIImage` | Core Image representation (high-level, can apply filters) |
| `[CIImage imageWithCGImage:image]` | Create CIImage from CGImage |
| `[ciImage imageByApplyingOrientation:orientation]` | Apply EXIF rotation |
| `CIContext` | Core Image rendering context |
| `[context createCGImage:ciImage fromRect:ciImage.extent]` | Render CIImage back to CGImage |
| `ciImage.extent` | The bounds rectangle of the image |

### Step 3: Watermark

```objc
        // 3. Add watermark
        CGImageRef watermarkedImage = [self createWatermarkedImage:rotatedImage withText:timeStamp];
        CGImageRelease(rotatedImage);
```

### The Watermark Method Explained

```objc
+ (CGImageRef)createWatermarkedImage:(CGImageRef)image withText:(NSString *)text
{
    if (!text || text.length == 0) {
        CGImageRetain(image);
        return image;
    }

    size_t width = CGImageGetWidth(image);
    size_t height = CGImageGetHeight(image);
```

| Part | What it does |
|------|--------------|
| `size_t` | C type for sizes (unsigned integer) |
| `CGImageGetWidth/Height` | Get image dimensions in pixels |

```objc
    // Create bitmap context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, width, height, 8,
                                                  width * 4, colorSpace,
                                                  kCGImageAlphaPremultipliedLast);
    CGColorSpaceRelease(colorSpace);
```

| Part | What it does |
|------|--------------|
| `CGColorSpaceRef` | Reference to a color space (RGB, CMYK, etc.) |
| `CGColorSpaceCreateDeviceRGB()` | Create standard RGB color space |
| `CGBitmapContextCreate` | Create a drawing context (like a canvas) |
| Parameters: | |
| `NULL` | Let system allocate memory for pixel data |
| `width, height` | Dimensions |
| `8` | Bits per component (8 bits = 0-255 per channel) |
| `width * 4` | Bytes per row (4 bytes per pixel: RGBA) |
| `colorSpace` | The color space |
| `kCGImageAlphaPremultipliedLast` | Alpha channel format (RGBA with premultiplied alpha) |

```objc
    // Draw original image
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), image);
```

| Part | What it does |
|------|--------------|
| `CGContextDrawImage` | Draw an image into the context |
| `CGRectMake(0, 0, width, height)` | Rectangle at origin (0,0) with full size |

```objc
    // Calculate sizes relative to image (matching Android)
    CGFloat textSize = width / 40.0;
    CGFloat padding = width / 50.0;
```

| Part | What it does |
|------|--------------|
| `CGFloat` | Floating point type for graphics (like `float` or `double`) |
| `width / 40.0` | Make text size proportional to image width (larger images = larger text) |

```objc
    // Create attributed string for measurement
    UIFont *font = [UIFont systemFontOfSize:textSize weight:UIFontWeightRegular];
    NSDictionary *attributes = @{
        NSFontAttributeName: font,
        NSForegroundColorAttributeName: [UIColor yellowColor]
    };

    CGSize textSizeRect = [text sizeWithAttributes:attributes];
```

| Part | What it does |
|------|--------------|
| `UIFont` | iOS font object |
| `[UIFont systemFontOfSize:weight:]` | Get system font with specific size and weight |
| `attributes` | Dictionary defining text appearance |
| `NSFontAttributeName` | Key for font attribute |
| `NSForegroundColorAttributeName` | Key for text color |
| `[text sizeWithAttributes:]` | Calculate how much space the text will need |

```objc
    // Calculate position (bottom-right, matching Android)
    CGFloat bgWidth = textSizeRect.width + 2 * padding;
    CGFloat bgHeight = textSizeRect.height + 2 * padding;
    CGFloat x = width - bgWidth - padding;
    CGFloat y = padding;  // CoreGraphics origin is bottom-left
```

| Part | What it does |
|------|--------------|
| Position calculation | Put watermark at bottom-right corner |
| `y = padding` | **Important**: CoreGraphics has origin at bottom-left, not top-left like UIKit! |

```objc
    // Draw black background rectangle
    CGContextSetFillColorWithColor(context, [UIColor blackColor].CGColor);
    CGContextFillRect(context, CGRectMake(x, y, bgWidth, bgHeight));
```

| Part | What it does |
|------|--------------|
| `CGContextSetFillColorWithColor` | Set the fill color for subsequent drawing |
| `[UIColor blackColor].CGColor` | Get CoreGraphics color from UIColor |
| `CGContextFillRect` | Draw a filled rectangle |

```objc
    // Draw text using UIGraphics (push context)
    UIGraphicsPushContext(context);

    // Flip coordinate system for text
    CGContextTranslateCTM(context, 0, height);
    CGContextScaleCTM(context, 1.0, -1.0);
```

| Part | What it does |
|------|--------------|
| `UIGraphicsPushContext` | Make our context the "current" context for UIKit drawing |
| `CGContextTranslateCTM` | Move the origin (CTM = Current Transform Matrix) |
| `CGContextScaleCTM(1.0, -1.0)` | Flip vertically (scale Y by -1). This converts from CoreGraphics coords (bottom-left origin) to UIKit coords (top-left origin). |

```objc
    // Recalculate Y for flipped coordinates
    CGFloat textY = height - y - bgHeight + padding;

    [text drawAtPoint:CGPointMake(x + padding, textY) withAttributes:attributes];

    UIGraphicsPopContext();
```

| Part | What it does |
|------|--------------|
| `textY = ...` | Recalculate Y position for flipped coordinate system |
| `[text drawAtPoint:withAttributes:]` | Draw the text string at specified point |
| `CGPointMake(x, y)` | Create a point structure |
| `UIGraphicsPopContext` | Restore the previous graphics context |

```objc
    // Create final image
    CGImageRef result = CGBitmapContextCreateImage(context);
    CGContextRelease(context);

    return result;
}
```

| Part | What it does |
|------|--------------|
| `CGBitmapContextCreateImage` | Create a CGImage from the context's pixel data |
| `CGContextRelease` | Release the context (we're done drawing) |

### Step 4: Compression

The compression uses **WebP by default** (better quality at smaller file sizes) and only falls back to JPEG if explicitly requested. This matches Android behavior.

```objc
+ (BOOL)compressImage:(CGImageRef)image
               toPath:(NSString *)path
            minSizeKB:(NSInteger)minSizeKB
            maxSizeKB:(NSInteger)maxSizeKB
         compressJpeg:(BOOL)compressJpeg
                error:(NSError **)error
{
    // Use UTType for iOS 14+
    CFStringRef imageType;

    if (compressJpeg) {
        imageType = (__bridge CFStringRef)UTTypeJPEG.identifier;
    } else {
        // Default: WebP (better quality/size ratio)
```

| Part | What it does |
|------|--------------|
| `CFStringRef imageType` | String identifying the output format |
| `UTTypeJPEG.identifier` | "public.jpeg" - the Uniform Type Identifier for JPEG |
| `compressJpeg = NO` | **Default**: Use WebP for better quality at smaller sizes |

### Why WebP Over JPEG?

| Format | Quality | File Size | Use Case |
|--------|---------|-----------|----------|
| **WebP** | Better | Smaller | Default - best quality/size ratio |
| JPEG | Good | Larger | Legacy compatibility only |

WebP provides ~25-35% smaller files at the same visual quality as JPEG.

```objc
        // Check if WebP is supported
        CFArrayRef supportedTypes = CGImageDestinationCopyTypeIdentifiers();
        BOOL webpSupported = NO;
        CFStringRef webpType = (__bridge CFStringRef)UTTypeWebP.identifier;

        for (CFIndex i = 0; i < CFArrayGetCount(supportedTypes); i++) {
            CFStringRef type = (CFStringRef)CFArrayGetValueAtIndex(supportedTypes, i);
            if (CFStringCompare(type, webpType, 0) == kCFCompareEqualTo) {
                webpSupported = YES;
                break;
            }
        }
        CFRelease(supportedTypes);
```

| Part | What it does |
|------|--------------|
| `CGImageDestinationCopyTypeIdentifiers` | Get list of all supported output formats |
| `CFArrayGetCount` | Get array length |
| `CFArrayGetValueAtIndex` | Get item at index |
| `CFStringCompare` | Compare two strings (returns `kCFCompareEqualTo` if equal) |
| WebP check | iOS 14+ supports WebP natively; we check just to be safe |

### Binary Search for Optimal Quality

The algorithm finds the **highest quality** that keeps file size within 300-500KB range.

```objc
    // Binary search for optimal quality (matching Android algorithm)
    NSInteger low = 0;
    NSInteger high = 100;
    NSInteger bestQuality = 100;
    NSData *bestData = nil;
    NSData *highestQualityValidData = nil;  // Track highest quality within range
    NSInteger highestQualityFound = 0;

    while (low <= high) {
        NSInteger quality = (low + high) / 2;
        CGFloat qualityFloat = quality / 100.0;
```

| Part | What it does |
|------|--------------|
| Binary search | Find optimal compression quality for target file size (300-500KB) |
| `quality / 100.0` | Convert 0-100 to 0.0-1.0 range |
| `highestQualityValidData` | **Key improvement**: Track the highest quality that fits in range |
| Goal | Maximize quality while staying within 300-500KB |

```objc
        NSMutableData *imageData = [NSMutableData data];
        CGImageDestinationRef destination = CGImageDestinationCreateWithData(
            (__bridge CFMutableDataRef)imageData,
            imageType,
            1,
            NULL
        );
```

| Part | What it does |
|------|--------------|
| `NSMutableData` | Mutable byte buffer to hold compressed image |
| `CGImageDestinationCreateWithData` | Create image writer that writes to memory (not file) |
| Parameters: `data, type, count, options` | Output buffer, format, number of images, options |

```objc
        NSDictionary *options = @{
            (__bridge NSString *)kCGImageDestinationLossyCompressionQuality: @(qualityFloat)
        };

        CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)options);
        BOOL finalized = CGImageDestinationFinalize(destination);
        CFRelease(destination);
```

| Part | What it does |
|------|--------------|
| `kCGImageDestinationLossyCompressionQuality` | Key for JPEG/WebP quality (0.0-1.0) |
| `@(qualityFloat)` | Box the float in an NSNumber |
| `CGImageDestinationAddImage` | Add our image with compression options |
| `CGImageDestinationFinalize` | Actually perform the compression |

```objc
        NSInteger fileSizeKB = imageData.length / 1024;

        if (fileSizeKB < minSizeKB) {
            low = quality + 1;  // Too small, increase quality
        } else if (fileSizeKB > maxSizeKB) {
            high = quality - 1;  // Too big, decrease quality
        } else {
            bestData = imageData;
            break;  // Found good size!
        }

        bestData = imageData;  // Keep last valid data
    }
```

| Part | What it does |
|------|--------------|
| Binary search logic | Adjust quality based on resulting file size |

```objc
    // Write to file
    NSError *writeError = nil;
    BOOL success = [bestData writeToFile:path options:NSDataWritingAtomic error:&writeError];
```

| Part | What it does |
|------|--------------|
| `[bestData writeToFile:options:error:]` | Write data to file |
| `NSDataWritingAtomic` | Write to temp file first, then rename. Prevents corruption if interrupted. |

---

## 5. CaptureStudio.mm - React Native Bridge Explained

### Static Variables

```objc
// Store active operations and results
static NSMutableDictionary<NSString *, NSOperationQueue *> *operationQueues;
static NSMutableDictionary<NSString *, NSDictionary *> *operationResults;
```

| Part | What it does |
|------|--------------|
| `static` | Variable persists across method calls (like class variable) |
| `NSMutableDictionary<KeyType, ValueType *>` | Typed mutable dictionary (like `Dict[str, OperationQueue]` in Python) |
| `operationQueues` | Maps operation ID → queue (to track running operations) |
| `operationResults` | Maps operation ID → result (to store completed results) |

### Module Registration

```objc
@implementation CaptureStudio

RCT_EXPORT_MODULE()
```

| Part | What it does |
|------|--------------|
| `RCT_EXPORT_MODULE()` | **React Native macro** that registers this class as a native module. The module name defaults to the class name ("CaptureStudio"). |

### Initialization

```objc
+ (void)initialize {
    if (self == [CaptureStudio class]) {
        operationQueues = [NSMutableDictionary new];
        operationResults = [NSMutableDictionary new];
    }
}
```

| Part | What it does |
|------|--------------|
| `+ (void)initialize` | Special class method called once before class is first used |
| `if (self == [CaptureStudio class])` | Ensure we only initialize once (subclasses would also trigger this) |
| `[NSMutableDictionary new]` | Shorthand for `[[NSMutableDictionary alloc] init]` |

### processImages Method

```objc
- (void)processImages:(NSArray *)images
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
```

| Part | What it does |
|------|--------------|
| `-` | Instance method (called on module instance) |
| `(NSArray *)images` | Array of image info dictionaries from JavaScript |
| `RCTPromiseResolveBlock` | Callback to resolve the JavaScript Promise |
| `RCTPromiseRejectBlock` | Callback to reject the JavaScript Promise |

```objc
    NSString *operationId = [[NSUUID UUID] UUIDString];
```

| Part | What it does |
|------|--------------|
| `NSUUID` | UUID generator class |
| `[[NSUUID UUID] UUIDString]` | Generate a random UUID string like "A1B2C3D4-..." |

### Creating the Operation Queue

```objc
    // Create operation queue for background processing
    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
    queue.name = [NSString stringWithFormat:@"ImageProcessing-%@", operationId];
    queue.maxConcurrentOperationCount = 1; // Sequential processing
    queue.qualityOfService = NSQualityOfServiceUserInitiated;
```

| Part | What it does |
|------|--------------|
| `NSOperationQueue` | Manages a queue of operations to run in background |
| `queue.name` | Human-readable name (for debugging) |
| `maxConcurrentOperationCount = 1` | Process one image at a time (prevents memory issues) |
| `qualityOfService` | Priority level. `UserInitiated` = high priority, user is waiting |

### Thread Synchronization

```objc
    @synchronized (operationQueues) {
        operationQueues[operationId] = queue;
    }
```

| Part | What it does |
|------|--------------|
| `@synchronized (object)` | Lock on `object` to prevent race conditions. Only one thread can be inside this block at a time for this object. |

### Creating the Block Operation

```objc
    __weak typeof(self) weakSelf = self;
    NSBlockOperation *operation = [NSBlockOperation blockOperationWithBlock:^{
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) return;
```

| Part | What it does |
|------|--------------|
| `__weak typeof(self) weakSelf` | Create a weak reference to `self`. Prevents **retain cycle** (memory leak). |
| `^{ ... }` | **Block syntax** (like lambda/closure in other languages) |
| `__strong typeof(weakSelf) strongSelf` | Convert weak reference back to strong inside block |
| `if (!strongSelf) return` | Exit if object was deallocated |

**Why weak/strong dance?**

If the block captures `self` strongly, and `self` holds the queue, and the queue holds the block... → **retain cycle** → memory leak!

```
self → queue → operation → block → self (cycle!)
```

Using weak reference breaks the cycle.

### Processing Each Image

```objc
        for (NSDictionary *imageInfo in images) {
            @autoreleasepool {
                NSString *localPath = imageInfo[@"localPath"];
                NSString *timeStamp = imageInfo[@"timeStamp"];
                BOOL isForOnlyWatermark = [imageInfo[@"isForOnlyWatermark"] boolValue];
                BOOL compressJpeg = [imageInfo[@"compressJpegImage"] boolValue];
                // Default to YES (replace original) if not specified
                BOOL replaceOriginal = imageInfo[@"replaceOriginal"] != nil ?
                    [imageInfo[@"replaceOriginal"] boolValue] : YES;
```

| Part | What it does |
|------|--------------|
| `for (Type *item in collection)` | Fast enumeration (like `for item in list` in Python) |
| `@autoreleasepool` | Release memory after each image to prevent buildup |
| `imageInfo[@"localPath"]` | Get value for key from dictionary |
| `[imageInfo[@"key"] boolValue]` | Convert NSNumber to BOOL |
| `replaceOriginal` default to YES | Match Android behavior - always replace original |

```objc
                ImageProcessorResult *processorResult = [ImageProcessor processImageAtPath:cleanPath
                                                                                 timeStamp:timeStamp ?: @""
                                                                        isForOnlyWatermark:isForOnlyWatermark
                                                                              compressJpeg:compressJpeg
                                                                           replaceOriginal:replaceOriginal];

                [results addObject:@{
                    @"localPath": localPath,
                    @"outputPath": outputPathWithPrefix,
                    @"success": @(processorResult.success),
                    @"error": processorResult.error ? processorResult.error.localizedDescription : [NSNull null]
                }];
```

| Part | What it does |
|------|--------------|
| `ImageProcessorResult *` | Result object containing success, outputPath, and error |
| `timeStamp ?: @""` | Use empty string if timeStamp is nil (null-coalescing) |
| `@(processorResult.success)` | Box BOOL as NSNumber for dictionary |
| `[NSNull null]` | Represents JSON null in Objective-C dictionaries |

### Returning Results

```objc
    resolve(operationId);
}
```

| Part | What it does |
|------|--------------|
| `resolve(operationId)` | Resolve the JavaScript Promise with the operation ID. This returns **immediately** while processing continues in background. |

### fetchProcessingResult Method

```objc
- (void)fetchProcessingResult:(NSString *)operationId
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
    // ... get result from operationResults dictionary ...

    if (result) {
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result options:0 error:&jsonError];
        NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
        resolve(jsonString);
    }
```

| Part | What it does |
|------|--------------|
| `NSJSONSerialization` | Convert between JSON and Objective-C objects |
| `dataWithJSONObject:options:error:` | Convert dictionary to JSON data |
| `[[NSString alloc] initWithData:encoding:]` | Convert data to string |
| `NSUTF8StringEncoding` | UTF-8 text encoding |

### TurboModule Setup

```objc
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeCaptureStudioSpecJSI>(params);
}
```

| Part | What it does |
|------|--------------|
| `std::shared_ptr` | C++ smart pointer (auto memory management) |
| `facebook::react::TurboModule` | C++ base class for TurboModules |
| `NativeCaptureStudioSpecJSI` | Auto-generated C++ class that bridges JS ↔ Objective-C |
| This method | Tells React Native how to create the JavaScript interface for this module |

---

## 6. Key iOS Concepts

### Frameworks Used

| Framework | Purpose |
|-----------|---------|
| **Foundation** | Basic objects (NSString, NSArray, NSDictionary, NSError, etc.) |
| **CoreGraphics** | Low-level 2D drawing (CGImage, CGContext, CGRect) |
| **ImageIO** | Reading/writing image files |
| **CoreImage** | High-level image processing and filters |
| **UIKit** | iOS UI components (UIFont, UIColor) |
| **UniformTypeIdentifiers** | File type identification (JPEG, WebP, PNG) |

### Naming Conventions

| Prefix | Meaning |
|--------|---------|
| `NS` | NeXTSTEP (historical) - Foundation framework |
| `CG` | CoreGraphics |
| `CF` | CoreFoundation |
| `CI` | CoreImage |
| `UI` | UIKit |
| `RCT` | React (React Native) |
| `k` | Constant (e.g., `kCGImagePropertyOrientation`) |

---

## 7. Memory Management

### ARC vs Manual

**ARC (Automatic Reference Counting)** manages Objective-C objects automatically:
```objc
NSString *str = @"Hello";  // ARC manages this
// No need to release
```

**CoreFoundation** objects need manual management:
```objc
CGImageRef image = CGImageSourceCreateImageAtIndex(source, 0, NULL);
// ... use image ...
CGImageRelease(image);  // YOU must release!
```

### The Rule

| Type | Memory Management |
|------|------------------|
| `NSObject` subclasses | ARC (automatic) |
| `CF*Ref` types | Manual (`CFRelease`) |
| `CG*Ref` types | Manual (`CGImageRelease`, `CGContextRelease`, etc.) |

### Bridge Casts

| Cast | When to Use |
|------|-------------|
| `__bridge` | No ownership transfer. Just cast the pointer. |
| `__bridge_transfer` | Transfer ownership TO Objective-C. ARC will release it. |
| `__bridge_retained` | Transfer ownership FROM Objective-C. You must CFRelease it. |

---

## 8. Threading and Background Processing

### Why Background Thread?

| Thread | Use For |
|--------|---------|
| **Main Thread** | UI updates only! Never do heavy work here. |
| **Background Thread** | File I/O, image processing, network calls |

If you do heavy work on main thread → **UI freezes** → bad user experience!

### NSOperationQueue

```objc
NSOperationQueue *queue = [[NSOperationQueue alloc] init];
queue.qualityOfService = NSQualityOfServiceUserInitiated;

NSBlockOperation *op = [NSBlockOperation blockOperationWithBlock:^{
    // This code runs in BACKGROUND
}];

[queue addOperation:op];  // Returns immediately, work happens in background
```

### Quality of Service Levels

| Level | Priority | Use Case |
|-------|----------|----------|
| `UserInteractive` | Highest | Immediate UI feedback |
| `UserInitiated` | High | User is waiting for result |
| `Utility` | Medium | Long tasks user can wait for |
| `Background` | Low | User doesn't care when it finishes |

---

## Quick Reference Card

### Common Patterns

```objc
// Create object
NSString *str = [[NSString alloc] initWithFormat:@"Hello %@", name];
// Or shorter:
NSString *str = [NSString stringWithFormat:@"Hello %@", name];

// Check for nil
if (object == nil) { }  // or: if (!object) { }

// Dictionary access
id value = dictionary[@"key"];
dictionary[@"key"] = newValue;

// Array access
id item = array[0];

// String formatting
NSString *s = [NSString stringWithFormat:@"Name: %@, Age: %ld", name, (long)age];

// Error handling
NSError *error = nil;
BOOL success = [obj doSomething:&error];
if (!success) {
    NSLog(@"Error: %@", error.localizedDescription);
}

// Block (closure)
void (^myBlock)(NSString *) = ^(NSString *param) {
    NSLog(@"Got: %@", param);
};
myBlock(@"Hello");
```

---

## Summary

The iOS image processing module:

1. **Receives** array of image paths from JavaScript
2. **Creates** a background operation queue
3. **Returns** operation ID immediately (non-blocking)
4. **Processes** each image in background:
   - Loads with ImageIO
   - Rotates based on EXIF orientation
   - Adds yellow-on-black watermark with CoreGraphics
   - Compresses to **WebP** format (better quality than JPEG)
   - Uses binary search to find **highest quality** within 300-500KB
   - **Overwrites original file** at same path (like Android)
5. **Stores** results for later retrieval
6. **JavaScript polls** for completion using operation ID

All heavy work happens off the main thread, keeping UI responsive!

### Key Design Decisions (Matching Android)

| Feature | Implementation |
|---------|----------------|
| **Default format** | WebP (better quality/size ratio than JPEG) |
| **Target size** | 300-500KB (400-500KB for watermark-only) |
| **Quality priority** | Highest quality that fits in target range |
| **File handling** | Always replaces original file at same path |
| **Path behavior** | Input path = output path (no extension change) |
| **Threading** | Background OperationQueue, never blocks UI |
