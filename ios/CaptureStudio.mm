#import "CaptureStudio.h"
#import "ImageProcessor.h"
#import <ImageIO/ImageIO.h>
#import <CoreGraphics/CoreGraphics.h>
#import <UIKit/UIKit.h>

// Store active operations and results
static NSMutableDictionary<NSString *, NSOperationQueue *> *operationQueues;
static NSMutableDictionary<NSString *, NSDictionary *> *operationResults;

@implementation CaptureStudio

RCT_EXPORT_MODULE()

+ (void)initialize {
    if (self == [CaptureStudio class]) {
        operationQueues = [NSMutableDictionary new];
        operationResults = [NSMutableDictionary new];
    }
}

#pragma mark - openCaptureStudio

- (void)openCaptureStudio:(NSDictionary *)options
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    // TODO: Implement camera capture UI
    resolve(@{@"status": @"not_implemented"});
}

#pragma mark - processImages

- (void)processImages:(NSArray *)images
              resolve:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
    if (!images || images.count == 0) {
        reject(@"INVALID_INPUT", @"No images provided", nil);
        return;
    }

    NSString *operationId = [[NSUUID UUID] UUIDString];

    // Create operation queue for background processing
    NSOperationQueue *queue = [[NSOperationQueue alloc] init];
    queue.name = [NSString stringWithFormat:@"ImageProcessing-%@", operationId];
    queue.maxConcurrentOperationCount = 1; // Sequential processing
    queue.qualityOfService = NSQualityOfServiceUserInitiated;

    @synchronized (operationQueues) {
        operationQueues[operationId] = queue;
    }

    // Create operation for processing
    // Copy operationId for use in block
    NSString *opId = [operationId copy];

    NSBlockOperation *operation = [NSBlockOperation blockOperationWithBlock:^{
        NSMutableArray *results = [NSMutableArray new];

        for (NSDictionary *imageInfo in images) {
            @autoreleasepool {
                NSString *localPath = imageInfo[@"localPath"];
                NSString *timeStamp = imageInfo[@"timeStamp"];
                BOOL isForOnlyWatermark = [imageInfo[@"isForOnlyWatermark"] boolValue];
                BOOL compressJpeg = [imageInfo[@"compressJpegImage"] boolValue];
                // Default to YES (replace original) if not specified
                BOOL replaceOriginal = imageInfo[@"replaceOriginal"] != nil ?
                    [imageInfo[@"replaceOriginal"] boolValue] : YES;

                // Skip invalid entries
                if (!localPath || localPath.length == 0 ||
                    [localPath isEqualToString:@"undefined"]) {
                    continue;
                }

                // Remove file:// prefix if present
                NSString *cleanPath = [localPath stringByReplacingOccurrencesOfString:@"file://"
                                                                           withString:@""];

                // Check if file exists
                if (![[NSFileManager defaultManager] fileExistsAtPath:cleanPath]) {
                    [results addObject:@{
                        @"localPath": localPath,
                        @"outputPath": localPath,
                        @"success": @(NO),
                        @"error": @"File not found"
                    }];
                    continue;
                }

                ImageProcessorResult *processorResult = [ImageProcessor processImageAtPath:cleanPath
                                                                                 timeStamp:timeStamp ?: @""
                                                                        isForOnlyWatermark:isForOnlyWatermark
                                                                              compressJpeg:compressJpeg
                                                                           replaceOriginal:replaceOriginal];

                // Add file:// prefix back to output path for consistency
                NSString *outputPathWithPrefix = [NSString stringWithFormat:@"file://%@",
                                                  processorResult.outputPath];

                [results addObject:@{
                    @"localPath": localPath,
                    @"outputPath": outputPathWithPrefix,
                    @"success": @(processorResult.success),
                    @"error": processorResult.error ? processorResult.error.localizedDescription : [NSNull null]
                }];
            }
        }

        // Store results
        @synchronized (operationResults) {
            operationResults[opId] = @{
                @"status": @"completed",
                @"processedImages": results
            };
        }
    }];

    [queue addOperation:operation];

    // Return operation ID immediately
    resolve(operationId);
}

#pragma mark - fetchProcessingResult

- (void)fetchProcessingResult:(NSString *)operationId
                      resolve:(RCTPromiseResolveBlock)resolve
                       reject:(RCTPromiseRejectBlock)reject
{
    if (!operationId || operationId.length == 0) {
        reject(@"INVALID_INPUT", @"Operation ID is required", nil);
        return;
    }

    NSDictionary *result = nil;
    NSOperationQueue *queue = nil;

    @synchronized (operationResults) {
        result = operationResults[operationId];
    }

    if (result) {
        NSError *jsonError;
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:result
                                                           options:0
                                                             error:&jsonError];
        if (jsonData) {
            NSString *jsonString = [[NSString alloc] initWithData:jsonData
                                                         encoding:NSUTF8StringEncoding];
            // Cleanup
            @synchronized (operationQueues) {
                [operationQueues removeObjectForKey:operationId];
            }
            @synchronized (operationResults) {
                [operationResults removeObjectForKey:operationId];
            }
            resolve(jsonString);
        } else {
            reject(@"JSON_ERROR", @"Failed to serialize result", jsonError);
        }
    } else {
        // Check if operation is still running
        @synchronized (operationQueues) {
            queue = operationQueues[operationId];
        }

        if (queue && queue.operationCount > 0) {
            resolve(@"{\"status\":\"processing\"}");
        } else {
            reject(@"NOT_FOUND", @"Operation not found", nil);
        }
    }
}

#pragma mark - generateThumbnail

- (void)generateThumbnail:(NSDictionary *)item
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    NSString *localPath = item[@"localPath"];
    NSNumber *maxSizeNum = item[@"maxSize"];

    if (!localPath || localPath.length == 0) {
        reject(@"INVALID_INPUT", @"localPath is required", nil);
        return;
    }

    NSInteger maxSize = maxSizeNum ? [maxSizeNum integerValue] : 100;

    // Remove file:// prefix if present
    NSString *cleanPath = [localPath stringByReplacingOccurrencesOfString:@"file://"
                                                               withString:@""];

    // Run on background queue to avoid blocking JS thread
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        BOOL success = [ImageProcessor generateThumbnailAtPath:cleanPath maxSize:maxSize];

        if (success) {
            // Return the thumbnail path
            NSString *nameWithoutExt = [cleanPath stringByDeletingPathExtension];
            NSString *thumbPath = [NSString stringWithFormat:@"%@_thumb.jpg", nameWithoutExt];
            resolve(thumbPath);
        } else {
            reject(@"THUMBNAIL_FAILED", @"Failed to generate thumbnail", nil);
        }
    });
}

#pragma mark - TurboModule

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeCaptureStudioSpecJSI>(params);
}

@end
