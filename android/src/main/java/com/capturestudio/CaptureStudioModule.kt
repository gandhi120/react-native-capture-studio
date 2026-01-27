package com.capturestudio

import android.content.Intent
import android.util.Log
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.capturestudio.data.processing.ImageProcessingWorker
import com.capturestudio.ui.camera.CameraActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ExecutionException

@ReactModule(name = CaptureStudioModule.NAME)
class CaptureStudioModule(reactContext: ReactApplicationContext) :
    NativeCaptureStudioSpec(reactContext) {

    companion object {
        const val NAME = "CaptureStudio"
        private const val TAG = "CaptureStudioModule"
    }

    override fun getName(): String = NAME

    /**
     * Open the native camera capture UI.
     */
    override fun openCaptureStudio(options: ReadableMap, promise: Promise) {
        val intent = Intent(reactApplicationContext, CameraActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
        promise.resolve(null)
    }

    /**
     * Process images with compression and watermarking.
     * Returns immediately with an operation ID to poll for results.
     *
     * @param images Array of image processing items
     * @param promise Resolves with operation ID (UUID string)
     */
    override fun processImages(images: ReadableArray, promise: Promise) {
        try {
            // Convert ReadableArray to JSON string
            val imagesJson = convertArrayToJson(images)
            Log.d(TAG, "Processing ${images.size()} images")

            // Create input data for worker
            val inputData = Data.Builder()
                .putString(ImageProcessingWorker.KEY_IMAGES, imagesJson)
                .build()

            // Create and enqueue work request
            val workRequest = OneTimeWorkRequestBuilder<ImageProcessingWorker>()
                .setInputData(inputData)
                .build()

            WorkManager.getInstance(reactApplicationContext)
                .enqueue(workRequest)

            // Return the work ID for polling
            val operationId = workRequest.id.toString()
            Log.d(TAG, "Enqueued work with ID: $operationId")
            promise.resolve(operationId)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to enqueue image processing", e)
            promise.reject("PROCESS_ERROR", e.message, e)
        }
    }

    /**
     * Fetch the result of an image processing operation.
     *
     * @param operationId The operation ID returned by processImages
     * @param promise Resolves with JSON string containing status and results
     */
    override fun fetchProcessingResult(operationId: String, promise: Promise) {
        try {
            val workId = UUID.fromString(operationId)
            val workManager = WorkManager.getInstance(reactApplicationContext)

            // Get work info synchronously
            val workInfo = workManager.getWorkInfoById(workId).get()

            if (workInfo == null) {
                promise.reject("NOT_FOUND", "Operation not found: $operationId")
                return
            }

            when (workInfo.state) {
                WorkInfo.State.SUCCEEDED -> {
                    val results = workInfo.outputData.getString(ImageProcessingWorker.KEY_RESULTS)
                    val response = JSONObject().apply {
                        put("status", "completed")
                        put("processedImages", JSONArray(results ?: "[]"))
                    }
                    Log.d(TAG, "Operation $operationId completed successfully")

                    // Clean up completed work
                    workManager.cancelWorkById(workId)

                    promise.resolve(response.toString())
                }

                WorkInfo.State.FAILED -> {
                    Log.e(TAG, "Operation $operationId failed")
                    promise.reject("PROCESSING_FAILED", "Image processing failed")
                }

                WorkInfo.State.CANCELLED -> {
                    Log.w(TAG, "Operation $operationId was cancelled")
                    promise.reject("CANCELLED", "Operation was cancelled")
                }

                WorkInfo.State.RUNNING,
                WorkInfo.State.ENQUEUED -> {
                    val response = JSONObject().apply {
                        put("status", "processing")
                    }
                    promise.resolve(response.toString())
                }

                WorkInfo.State.BLOCKED -> {
                    val response = JSONObject().apply {
                        put("status", "blocked")
                    }
                    promise.resolve(response.toString())
                }
            }

        } catch (e: IllegalArgumentException) {
            Log.e(TAG, "Invalid operation ID: $operationId", e)
            promise.reject("INVALID_ID", "Invalid operation ID: $operationId", e)
        } catch (e: ExecutionException) {
            Log.e(TAG, "Error fetching work info", e)
            promise.reject("FETCH_ERROR", e.message, e)
        } catch (e: InterruptedException) {
            Log.e(TAG, "Interrupted while fetching work info", e)
            promise.reject("INTERRUPTED", e.message, e)
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error", e)
            promise.reject("ERROR", e.message, e)
        }
    }

    /**
     * Convert a ReadableArray to a JSON string.
     */
    private fun convertArrayToJson(array: ReadableArray): String {
        val jsonArray = JSONArray()

        for (i in 0 until array.size()) {
            val map = array.getMap(i)
            val jsonObject = JSONObject()

            map?.let {
                jsonObject.put("localPath", it.getString("localPath") ?: "")
                jsonObject.put("timeStamp", it.getString("timeStamp") ?: "")
                jsonObject.put("isForOnlyWatermark", it.getBoolean("isForOnlyWatermark"))
                jsonObject.put("compressJpegImage", it.getBoolean("compressJpegImage"))
                jsonObject.put("replaceOriginal", it.getBoolean("replaceOriginal"))
            }

            jsonArray.put(jsonObject)
        }

        return jsonArray.toString()
    }
}
