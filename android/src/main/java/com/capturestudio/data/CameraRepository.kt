package com.capturestudio.data

import android.content.Context
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner

class CameraRepository {

    private var cameraProvider: ProcessCameraProvider? = null

    fun startCamera(
        context: Context,
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView
    ) {
        val providerFuture = ProcessCameraProvider.getInstance(context)

        providerFuture.addListener({
            cameraProvider = providerFuture.get()

            val preview = Preview.Builder().build()
            preview.setSurfaceProvider(previewView.surfaceProvider)

            val selector = CameraSelector.DEFAULT_BACK_CAMERA

            cameraProvider?.unbindAll()
            cameraProvider?.bindToLifecycle(
                lifecycleOwner,
                selector,
                preview
            )
        }, ContextCompat.getMainExecutor(context))
    }

    fun release() {
        cameraProvider?.unbindAll()
        cameraProvider = null
    }
}
