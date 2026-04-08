package com.capturestudio.data.processing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.util.Log
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Handles image processing operations including:
 * - EXIF orientation correction
 * - Watermark overlay
 * - Compression to target file size (300-500KB)
 */
object ImageProcessor {

    private const val TAG = "ImageProcessor"

    // Target file size range in KB
    private const val MIN_SIZE_KB_DEFAULT = 300
    private const val MIN_SIZE_KB_WATERMARK_ONLY = 400
    private const val MAX_SIZE_KB = 500

    /**
     * Process a single image: rotate based on EXIF, add watermark, compress.
     *
     * @param imagePath Path to the image file
     * @param timeStamp Watermark text to overlay
     * @param isForOnlyWatermark Use higher minimum size if true
     * @param compressJpeg Use JPEG format if true, WebP otherwise
     * @return Result indicating success or failure with error message
     */
    fun processImage(
        imagePath: String,
        timeStamp: String,
        isForOnlyWatermark: Boolean,
        compressJpeg: Boolean
    ): Result<Unit> {
        return runCatching {
            val file = File(imagePath)
            if (!file.exists()) {
                throw IllegalArgumentException("File not found: $imagePath")
            }

            Log.d(TAG, "Processing image: $imagePath")

            // 1. Load bitmap
            val originalBitmap = BitmapFactory.decodeFile(file.absolutePath)
                ?: throw IllegalStateException("Failed to decode image: $imagePath")

            // 2. Get EXIF orientation and rotate if needed
            val exif = ExifInterface(file.absolutePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            val rotatedBitmap = rotateBitmapIfNeeded(originalBitmap, orientation)

            // Recycle original if we created a new bitmap
            if (rotatedBitmap !== originalBitmap) {
                originalBitmap.recycle()
            }

            // 3. Add watermark
            val watermarkedBitmap = if (timeStamp.isNotEmpty()) {
                addWatermark(rotatedBitmap, timeStamp).also {
                    if (it !== rotatedBitmap) rotatedBitmap.recycle()
                }
            } else {
                rotatedBitmap
            }

            // 4. Compress to target size
            val minSizeKB = if (isForOnlyWatermark) MIN_SIZE_KB_WATERMARK_ONLY else MIN_SIZE_KB_DEFAULT
            compressToTargetSize(
                bitmap = watermarkedBitmap,
                outputPath = imagePath,
                minKB = minSizeKB,
                maxKB = MAX_SIZE_KB,
                useJpeg = compressJpeg
            )

            // 5. Reset EXIF orientation since pixels are already rotated
            if (orientation != ExifInterface.ORIENTATION_NORMAL &&
                orientation != ExifInterface.ORIENTATION_UNDEFINED) {
                val newExif = ExifInterface(imagePath)
                newExif.setAttribute(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL.toString()
                )
                newExif.saveAttributes()
            }

            watermarkedBitmap.recycle()

            Log.d(TAG, "Successfully processed: $imagePath")
        }
    }

    /**
     * Generate a small thumbnail from an image file.
     * Uses BitmapFactory.Options.inSampleSize for memory-efficient downsampling.
     * Does NOT load the full bitmap into memory.
     *
     * @param imagePath Path to the source image
     * @param maxSize Max pixel dimension for the thumbnail (e.g. 200)
     * @return Result with thumbnail path on success
     */
    fun generateThumbnail(imagePath: String, maxSize: Int): Result<String> {
        return runCatching {
            val file = File(imagePath)
            if (!file.exists()) {
                throw IllegalArgumentException("File not found: $imagePath")
            }

            // Step 1: Decode only bounds (no memory allocation for pixels)
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeFile(imagePath, options)

            val imageWidth = options.outWidth
            val imageHeight = options.outHeight

            // Step 2: Calculate inSampleSize for memory-efficient downsampling
            var inSampleSize = 1
            if (imageWidth > maxSize || imageHeight > maxSize) {
                val halfWidth = imageWidth / 2
                val halfHeight = imageHeight / 2
                while ((halfWidth / inSampleSize) >= maxSize && (halfHeight / inSampleSize) >= maxSize) {
                    inSampleSize *= 2
                }
            }

            // Step 3: Decode with inSampleSize (loads only ~thumbnail-sized bitmap)
            val decodeOptions = BitmapFactory.Options().apply {
                this.inSampleSize = inSampleSize
            }
            val sampledBitmap = BitmapFactory.decodeFile(imagePath, decodeOptions)
                ?: throw IllegalStateException("Failed to decode image: $imagePath")

            // Step 4: Scale to exact max size
            val scale = maxSize.toFloat() / maxOf(sampledBitmap.width, sampledBitmap.height)
            val targetWidth = (sampledBitmap.width * scale).toInt()
            val targetHeight = (sampledBitmap.height * scale).toInt()
            val thumbnail = Bitmap.createScaledBitmap(sampledBitmap, targetWidth, targetHeight, true)

            if (thumbnail !== sampledBitmap) {
                sampledBitmap.recycle()
            }

            // Step 5: Handle EXIF rotation
            val exif = ExifInterface(imagePath)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            val rotatedThumbnail = rotateBitmapIfNeeded(thumbnail, orientation)
            if (rotatedThumbnail !== thumbnail) {
                thumbnail.recycle()
            }

            // Step 6: Save as JPEG
            val nameWithoutExt = imagePath.substringBeforeLast(".")
            val thumbPath = "${nameWithoutExt}_thumb.jpg"

            FileOutputStream(thumbPath).use { fos ->
                rotatedThumbnail.compress(Bitmap.CompressFormat.JPEG, 60, fos)
            }

            rotatedThumbnail.recycle()

            Log.d(TAG, "Generated thumbnail: $thumbPath")
            thumbPath
        }
    }

    /**
     * Rotate and/or flip bitmap based on EXIF orientation.
     * Handles all 8 EXIF orientation cases including mirrored variants
     * produced by front-facing (selfie) cameras.
     */
    private fun rotateBitmapIfNeeded(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()

        when (orientation) {
            ExifInterface.ORIENTATION_NORMAL -> return bitmap
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.postRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.postRotate(-90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
            else -> return bitmap
        }

        return Bitmap.createBitmap(
            bitmap,
            0,
            0,
            bitmap.width,
            bitmap.height,
            matrix,
            true
        )
    }

    /**
     * Add a watermark to the bottom-right corner of the image.
     * Yellow text on black background, matching iOS implementation.
     */
    private fun addWatermark(bitmap: Bitmap, text: String): Bitmap {
        val mutableBitmap = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        val canvas = Canvas(mutableBitmap)

        val imageWidth = mutableBitmap.width
        val imageHeight = mutableBitmap.height

        // Calculate sizes relative to image dimensions (matching iOS)
        val textSize = imageWidth / 40f
        val padding = imageWidth / 50f

        // Text paint
        val textPaint = Paint().apply {
            color = Color.YELLOW
            this.textSize = textSize
            isAntiAlias = true
        }

        // Background paint
        val bgPaint = Paint().apply {
            color = Color.BLACK
            style = Paint.Style.FILL
        }

        // Measure text
        val textBounds = Rect()
        textPaint.getTextBounds(text, 0, text.length, textBounds)

        // Calculate background dimensions
        val bgWidth = textBounds.width() + 2 * padding
        val bgHeight = textBounds.height() + 2 * padding

        // Position at bottom-right
        val x = imageWidth - bgWidth - padding
        val y = imageHeight - bgHeight - padding

        // Draw black background rectangle
        canvas.drawRect(x, y, x + bgWidth, y + bgHeight, bgPaint)

        // Draw text
        canvas.drawText(
            text,
            x + padding,
            y + textBounds.height() + padding,
            textPaint
        )

        return mutableBitmap
    }

    /**
     * Compress bitmap to target file size using binary search.
     * Tries to achieve file size between minKB and maxKB.
     */
    private fun compressToTargetSize(
        bitmap: Bitmap,
        outputPath: String,
        minKB: Int,
        maxKB: Int,
        useJpeg: Boolean
    ) {
        val format = getCompressFormat(useJpeg)
        Log.d(TAG, "Using compression format: $format (useJpeg=$useJpeg)")

        var low = 0
        var high = 100
        var bestData: ByteArray? = null
        var bestQuality = 100

        // Binary search for optimal quality
        while (low <= high) {
            val quality = (low + high) / 2
            val stream = ByteArrayOutputStream()

            bitmap.compress(format, quality, stream)
            val data = stream.toByteArray()
            val sizeKB = data.size / 1024

            bestData = data
            bestQuality = quality

            when {
                sizeKB < minKB -> {
                    // Size too small, increase quality
                    low = quality + 1
                }
                sizeKB > maxKB -> {
                    // Size too large, decrease quality
                    high = quality - 1
                }
                else -> {
                    // Within range, done
                    Log.d(TAG, "Found optimal quality: $quality, size: ${sizeKB}KB")
                    break
                }
            }
        }

        // Write to file
        bestData?.let { data ->
            FileOutputStream(outputPath).use { fos ->
                fos.write(data)
            }
            Log.d(TAG, "Wrote ${data.size / 1024}KB at quality $bestQuality to $outputPath")
        }
    }

    /**
     * Get the appropriate compression format based on preference.
     */
    private fun getCompressFormat(useJpeg: Boolean): Bitmap.CompressFormat {
        return if (useJpeg) {
            Bitmap.CompressFormat.JPEG
        } else {
            @Suppress("DEPRECATION")
            Bitmap.CompressFormat.WEBP
        }
    }
}
