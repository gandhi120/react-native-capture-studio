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

            watermarkedBitmap.recycle()

            Log.d(TAG, "Successfully processed: $imagePath")
        }
    }

    /**
     * Rotate bitmap based on EXIF orientation.
     */
    private fun rotateBitmapIfNeeded(bitmap: Bitmap, orientation: Int): Bitmap {
        val rotationAngle = when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> 90f
            ExifInterface.ORIENTATION_ROTATE_180 -> 180f
            ExifInterface.ORIENTATION_ROTATE_270 -> 270f
            else -> return bitmap // No rotation needed
        }

        val matrix = Matrix().apply {
            postRotate(rotationAngle)
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
