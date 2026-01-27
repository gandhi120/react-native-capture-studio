package com.capturestudio.ui.camera

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.capturestudio.data.CameraRepository

class CameraViewModelFactory : ViewModelProvider.Factory {

    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CameraViewModel::class.java)) {
            return CameraViewModel(
                cameraRepository = CameraRepository()
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
