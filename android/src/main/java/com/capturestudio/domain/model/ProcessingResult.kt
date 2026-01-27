package com.capturestudio.domain.model

/**
 * Represents the result of processing a single image.
 *
 * @property localPath The original path of the processed image
 * @property success Whether processing completed successfully
 * @property error Error message if processing failed, null otherwise
 */
data class ProcessingResult(
    val localPath: String,
    val success: Boolean,
    val error: String? = null
)
