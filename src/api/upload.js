import request from '@/utils/request'

export const uploadApi = {
  uploadImage(file, onProgress) {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
  },

  uploadImages(files, onProgress) {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    return request.post('/upload/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
  },
}
