#import "ImageProcessor.h"
#import <ImageIO/ImageIO.h>
#import <UIKit/UIKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <CoreImage/CoreImage.h>

@implementation ImageProcessorResult
@end

@implementation ImageProcessor

#pragma mark - Public API

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
        // 1. Load image
        NSURL *fileURL = [NSURL fileURLWithPath:path];
        CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)fileURL, NULL);

        if (!source) {
            result.error = [NSError errorWithDomain:@"ImageProcessor"
                                               code:1
                                           userInfo:@{NSLocalizedDescriptionKey: @"Failed to load image"}];
            return result;
        }

        CGImageRef originalImage = CGImageSourceCreateImageAtIndex(source, 0, NULL);
        CFRelease(source);

        if (!originalImage) {
            result.error = [NSError errorWithDomain:@"ImageProcessor"
                                               code:2
                                           userInfo:@{NSLocalizedDescriptionKey: @"Failed to decode image"}];
            return result;
        }

        // 2. Get EXIF orientation and rotate if needed
        CGImageRef rotatedImage = [self createRotatedImage:originalImage fromPath:path];
        CGImageRelease(originalImage);

        if (!rotatedImage) {
            result.error = [NSError errorWithDomain:@"ImageProcessor"
                                               code:5
                                           userInfo:@{NSLocalizedDescriptionKey: @"Failed to rotate image"}];
            return result;
        }

        // 3. Add watermark
        CGImageRef watermarkedImage = [self createWatermarkedImage:rotatedImage withText:timeStamp];
        CGImageRelease(rotatedImage);

        if (!watermarkedImage) {
            result.error = [NSError errorWithDomain:@"ImageProcessor"
                                               code:6
                                           userInfo:@{NSLocalizedDescriptionKey: @"Failed to add watermark"}];
            return result;
        }

        // 4. Output path - ALWAYS use original path (like Android)
        // This overwrites the original file with WebP/JPEG data
        // The path stays the same regardless of format change
        NSString *outputPath = path;
        result.outputPath = outputPath;

        // 5. Compress to target size (300-500KB)
        // Use WebP by default (better quality at smaller sizes), JPEG only if explicitly requested
        NSInteger minSizeKB = isForOnlyWatermark ? 400 : 300;
        NSInteger maxSizeKB = 500;

        NSError *compressError = nil;
        BOOL success = [self compressImage:watermarkedImage
                                    toPath:outputPath
                                 minSizeKB:minSizeKB
                                 maxSizeKB:maxSizeKB
                              compressJpeg:compressJpeg
                                     error:&compressError];

        CGImageRelease(watermarkedImage);

        result.success = success;
        result.error = compressError;

        return result;
    }
}

#pragma mark - Generate New Path

+ (NSString *)generateNewPath:(NSString *)originalPath compressJpeg:(BOOL)compressJpeg
{
    NSString *directory = [originalPath stringByDeletingLastPathComponent];
    NSString *filename = [originalPath lastPathComponent];
    NSString *nameWithoutExt = [filename stringByDeletingPathExtension];

    // Generate timestamp for unique filename
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    [formatter setDateFormat:@"yyyyMMdd_HHmmss"];
    NSString *timestamp = [formatter stringFromDate:[NSDate date]];

    // Determine extension based on format
    NSString *extension = compressJpeg ? @"jpg" : @"webp";

    // Check if WebP is supported, fallback to jpg
    if (!compressJpeg) {
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

        if (!webpSupported) {
            extension = @"jpg";
        }
    }

    // Create new filename: originalName_compressed_timestamp.ext
    NSString *newFilename = [NSString stringWithFormat:@"%@_compressed_%@.%@",
                             nameWithoutExt, timestamp, extension];

    return [directory stringByAppendingPathComponent:newFilename];
}

#pragma mark - Image Rotation (EXIF)

+ (CGImageRef)createRotatedImage:(CGImageRef)image fromPath:(NSString *)path
{
    // Read EXIF orientation
    NSURL *fileURL = [NSURL fileURLWithPath:path];
    CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)fileURL, NULL);

    if (!source) {
        CGImageRetain(image);
        return image;
    }

    NSDictionary *properties = (__bridge_transfer NSDictionary *)
        CGImageSourceCopyPropertiesAtIndex(source, 0, NULL);
    CFRelease(source);

    NSNumber *orientationValue = properties[(__bridge NSString *)kCGImagePropertyOrientation];
    CGImagePropertyOrientation orientation = orientationValue ?
        (CGImagePropertyOrientation)[orientationValue intValue] :
        kCGImagePropertyOrientationUp;

    if (orientation == kCGImagePropertyOrientationUp) {
        CGImageRetain(image);
        return image;
    }

    // Create rotated image using CIImage (handles all EXIF orientations)
    CIImage *ciImage = [CIImage imageWithCGImage:image];
    ciImage = [ciImage imageByApplyingOrientation:orientation];

    CIContext *context = [CIContext contextWithOptions:nil];
    CGImageRef rotated = [context createCGImage:ciImage fromRect:ciImage.extent];

    return rotated;
}

#pragma mark - Watermark

+ (CGImageRef)createWatermarkedImage:(CGImageRef)image withText:(NSString *)text
{
    if (!text || text.length == 0) {
        CGImageRetain(image);
        return image;
    }

    size_t width = CGImageGetWidth(image);
    size_t height = CGImageGetHeight(image);

    // Create bitmap context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    CGContextRef context = CGBitmapContextCreate(NULL, width, height, 8,
                                                  width * 4, colorSpace,
                                                  kCGImageAlphaPremultipliedLast);
    CGColorSpaceRelease(colorSpace);

    if (!context) {
        CGImageRetain(image);
        return image;
    }

    // Draw original image
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), image);

    // Calculate sizes relative to image (matching Android)
    CGFloat textSize = width / 40.0;
    CGFloat padding = width / 50.0;

    // Create attributed string for measurement
    UIFont *font = [UIFont systemFontOfSize:textSize weight:UIFontWeightRegular];
    NSDictionary *attributes = @{
        NSFontAttributeName: font,
        NSForegroundColorAttributeName: [UIColor yellowColor]
    };

    CGSize textSizeRect = [text sizeWithAttributes:attributes];

    // Calculate position (bottom-right, matching Android)
    CGFloat bgWidth = textSizeRect.width + 2 * padding;
    CGFloat bgHeight = textSizeRect.height + 2 * padding;
    CGFloat x = width - bgWidth - padding;
    CGFloat y = padding;  // CoreGraphics origin is bottom-left

    // Draw black background rectangle
    CGContextSetFillColorWithColor(context, [UIColor blackColor].CGColor);
    CGContextFillRect(context, CGRectMake(x, y, bgWidth, bgHeight));

    // Draw text using UIGraphics (push context)
    UIGraphicsPushContext(context);

    // Flip coordinate system for text
    CGContextTranslateCTM(context, 0, height);
    CGContextScaleCTM(context, 1.0, -1.0);

    // Recalculate Y for flipped coordinates
    CGFloat textY = height - y - bgHeight + padding;

    [text drawAtPoint:CGPointMake(x + padding, textY) withAttributes:attributes];

    UIGraphicsPopContext();

    // Create final image
    CGImageRef result = CGBitmapContextCreateImage(context);
    CGContextRelease(context);

    return result;
}

#pragma mark - Compression (Binary Search for Target Size)

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

        if (webpSupported) {
            imageType = webpType;
        } else {
            // Fallback to JPEG
            imageType = (__bridge CFStringRef)UTTypeJPEG.identifier;
        }
    }

    // Binary search for optimal quality (matching Android algorithm)
    // Start with quality=100 and find optimal quality for 300-500KB range
    NSInteger low = 0;
    NSInteger high = 100;
    NSInteger bestQuality = 100;
    NSData *bestData = nil;
    NSData *highestQualityValidData = nil;  // Highest quality within range
    NSInteger highestQualityFound = 0;

    while (low <= high) {
        NSInteger quality = (low + high) / 2;
        CGFloat qualityFloat = quality / 100.0;

        NSMutableData *imageData = [NSMutableData data];
        CGImageDestinationRef destination = CGImageDestinationCreateWithData(
            (__bridge CFMutableDataRef)imageData,
            imageType,
            1,
            NULL
        );

        if (!destination) {
            if (error) {
                *error = [NSError errorWithDomain:@"ImageProcessor"
                                             code:3
                                         userInfo:@{NSLocalizedDescriptionKey: @"Failed to create image destination"}];
            }
            return NO;
        }

        NSDictionary *options = @{
            (__bridge NSString *)kCGImageDestinationLossyCompressionQuality: @(qualityFloat)
        };

        CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)options);
        BOOL finalized = CGImageDestinationFinalize(destination);
        CFRelease(destination);

        if (!finalized) {
            if (error) {
                *error = [NSError errorWithDomain:@"ImageProcessor"
                                             code:7
                                         userInfo:@{NSLocalizedDescriptionKey: @"Failed to finalize image"}];
            }
            return NO;
        }

        NSInteger fileSizeKB = imageData.length / 1024;

        if (fileSizeKB < minSizeKB) {
            // Size too small, increase quality
            low = quality + 1;
            bestData = imageData;
            bestQuality = quality;
        } else if (fileSizeKB > maxSizeKB) {
            // Size too large, decrease quality
            high = quality - 1;
            bestData = imageData;
            bestQuality = quality;
        } else {
            // Within range - keep track of highest quality within range
            if (quality > highestQualityFound) {
                highestQualityFound = quality;
                highestQualityValidData = imageData;
            }
            // Try to find higher quality within range
            low = quality + 1;
            bestData = imageData;
            bestQuality = quality;
        }
    }

    // Prefer highest quality data that was within the valid range
    if (highestQualityValidData) {
        bestData = highestQualityValidData;
    }

    if (!bestData) {
        if (error) {
            *error = [NSError errorWithDomain:@"ImageProcessor"
                                         code:8
                                     userInfo:@{NSLocalizedDescriptionKey: @"Failed to compress image"}];
        }
        return NO;
    }

    // Write to file
    NSError *writeError = nil;
    BOOL success = [bestData writeToFile:path options:NSDataWritingAtomic error:&writeError];

    if (!success && error) {
        *error = writeError ?: [NSError errorWithDomain:@"ImageProcessor"
                                                   code:4
                                               userInfo:@{NSLocalizedDescriptionKey: @"Failed to write image"}];
    }

    return success;
}

#pragma mark - Thumbnail Generation

+ (BOOL)generateThumbnailAtPath:(NSString *)path
                        maxSize:(NSInteger)maxSize
{
    @autoreleasepool {
        NSURL *fileURL = [NSURL fileURLWithPath:path];
        CGImageSourceRef source = CGImageSourceCreateWithURL((__bridge CFURLRef)fileURL, NULL);

        if (!source) {
            return NO;
        }

        // Request a thumbnail at max dimension, downsampling during decode
        // This is MEMORY EFFICIENT — does NOT load the full image into memory
        NSDictionary *options = @{
            (NSString *)kCGImageSourceThumbnailMaxPixelSize: @(maxSize),
            (NSString *)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
            (NSString *)kCGImageSourceCreateThumbnailWithTransform: @YES,
        };

        CGImageRef thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, (__bridge CFDictionaryRef)options);
        CFRelease(source);

        if (!thumbnail) {
            return NO;
        }

        // Build thumbnail output path: /path/to/IMG_123.jpg -> /path/to/IMG_123_thumb.jpg
        NSString *nameWithoutExt = [path stringByDeletingPathExtension];
        NSString *thumbPath = [NSString stringWithFormat:@"%@_thumb.jpg", nameWithoutExt];

        // Write as JPEG with quality 60%
        NSURL *thumbURL = [NSURL fileURLWithPath:thumbPath];
        CGImageDestinationRef destination = CGImageDestinationCreateWithURL(
            (__bridge CFURLRef)thumbURL,
            (__bridge CFStringRef)UTTypeJPEG.identifier,
            1,
            NULL
        );

        if (!destination) {
            CGImageRelease(thumbnail);
            return NO;
        }

        NSDictionary *destOptions = @{
            (__bridge NSString *)kCGImageDestinationLossyCompressionQuality: @(0.6)
        };

        CGImageDestinationAddImage(destination, thumbnail, (__bridge CFDictionaryRef)destOptions);
        BOOL success = CGImageDestinationFinalize(destination);

        CFRelease(destination);
        CGImageRelease(thumbnail);

        return success;
    }
}

@end
