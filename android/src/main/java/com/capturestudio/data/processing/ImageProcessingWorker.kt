package com.capturestudio.data.processing

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

/**
 * WorkManager worker that processes images in the background.
 * Handles multiple images sequentially with compression and watermarking.
 */
class ImageProcessingWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "ImageProcessingWorker"

        // Input/Output data keys
        const val KEY_IMAGES = "images"
        const val KEY_RESULTS = "results"
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val imagesJson = inputData.getString(KEY_IMAGES)

        if (imagesJson.isNullOrEmpty()) {
            Log.e(TAG, "No images provided")
            return@withContext Result.failure()
        }

        try {
            val results = processImages(imagesJson)

            val outputData = Data.Builder()
                .putString(KEY_RESULTS, results.toString())
                .build()

            Log.d(TAG, "Processing completed successfully")
            Result.success(outputData)
        } catch (e: Exception) {
            Log.e(TAG, "Processing failed", e)
            Result.failure()
        }
    }

    /**
     * Process all images from the JSON array.
     *
     * @param imagesJson JSON array string of image processing items
     * @return JSONArray of processing results
     */
    private fun processImages(imagesJson: String): JSONArray {
        val imageArray = JSONArray(imagesJson)
        val results = JSONArray()

        Log.d(TAG, "Processing ${imageArray.length()} images")

        for (i in 0 until imageArray.length()) {
            val imageObject = imageArray.getJSONObject(i)
            val result = processSingleImage(imageObject)
            results.put(result)
        }

        return results
    }

    /**
     * Process a single image and return the result.
     */
    private fun processSingleImage(imageObject: JSONObject): JSONObject {
        val originalPath = imageObject.optString("localPath", "")
        val localPath = originalPath.replace("file://", "")
        val timeStamp = imageObject.optString("timeStamp", "")
        val isForOnlyWatermark = imageObject.optBoolean("isForOnlyWatermark", false)
        val compressJpeg = imageObject.optBoolean("compressJpegImage", false)

        // Validate input
        if (localPath.isEmpty() || localPath == "undefined") {
            Log.w(TAG, "Skipping invalid path: $localPath")
            return createResultJson(originalPath, false, "Invalid path")
        }

        if (timeStamp.isEmpty() || timeStamp == "undefined") {
            Log.w(TAG, "Skipping invalid timestamp for: $localPath")
            return createResultJson(originalPath, false, "Invalid timestamp")
        }

        // Process the image
        val result = ImageProcessor.processImage(
            imagePath = localPath,
            timeStamp = timeStamp,
            isForOnlyWatermark = isForOnlyWatermark,
            compressJpeg = compressJpeg
        )

        return if (result.isSuccess) {
            createResultJson(originalPath, true, null)
        } else {
            val error = result.exceptionOrNull()?.message ?: "Unknown error"
            Log.e(TAG, "Failed to process $localPath: $error")
            createResultJson(originalPath, false, error)
        }
    }

    /**
     * Create a JSON result object.
     */
    private fun createResultJson(
        localPath: String,
        success: Boolean,
        error: String?
    ): JSONObject {
        return JSONObject().apply {
            put("localPath", localPath)
            put("success", success)
            put("error", error ?: JSONObject.NULL)
        }
    }
}
