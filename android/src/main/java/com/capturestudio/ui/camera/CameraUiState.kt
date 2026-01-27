package com.capturestudio.ui.camera

data class CameraUiState(
    val isCameraReady: Boolean = false,
    val isCapturing: Boolean = false,
    val error: String? = null
)
