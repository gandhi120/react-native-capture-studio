package com.capturestudio.ui.camera

import android.content.Context
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.capturestudio.data.CameraRepository

class CameraViewModel(
    private val cameraRepository: CameraRepository
) : ViewModel() {

    private val _uiState = MutableLiveData(CameraUiState())
    val uiState: LiveData<CameraUiState> = _uiState

    fun startCamera(
        context: Context,
        lifecycleOwner: LifecycleOwner,
        previewView: PreviewView
    ) {
        cameraRepository.startCamera(
            context = context,
            lifecycleOwner = lifecycleOwner,
            previewView = previewView
        )
    }

    override fun onCleared() {
        super.onCleared()
        cameraRepository.release()
    }
}
