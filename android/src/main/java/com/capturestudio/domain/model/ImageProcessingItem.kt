package com.capturestudio.domain.model

/**
 * Represents an image to be processed with compression and watermarking.
 *
 * @property localPath The file path to the image (may include "file://" prefix)
 * @property timeStamp The timestamp text to overlay as watermark
 * @property isForOnlyWatermark If true, uses higher minimum size (400KB vs 300KB)
 * @property compressJpegImage If true, uses JPEG format; otherwise uses WebP
 * @property replaceOriginal If true, overwrites the original file
 */
data class ImageProcessingItem(
    val localPath: String,
    val timeStamp: String,
    val isForOnlyWatermark: Boolean = false,
    val compressJpegImage: Boolean = false,
    val replaceOriginal: Boolean = true
)
