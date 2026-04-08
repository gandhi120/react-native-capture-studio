#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>

NS_ASSUME_NONNULL_BEGIN

@interface ImageProcessorResult : NSObject
@property (nonatomic, strong) NSString *outputPath;
@property (nonatomic, assign) BOOL success;
@property (nonatomic, strong, nullable) NSError *error;
@end

@interface ImageProcessor : NSObject

+ (ImageProcessorResult *)processImageAtPath:(NSString *)path
                                   timeStamp:(NSString *)timeStamp
                          isForOnlyWatermark:(BOOL)isForOnlyWatermark
                                compressJpeg:(BOOL)compressJpeg
                             replaceOriginal:(BOOL)replaceOriginal;

+ (BOOL)generateThumbnailAtPath:(NSString *)path
                        maxSize:(NSInteger)maxSize;

@end

NS_ASSUME_NONNULL_END
