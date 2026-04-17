<template>
  <div
    class="file-drop-zone"
    :class="{ 'is-dragging': isDragging, 'is-disabled': disabled }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @click="triggerFileInput"
  >
    <input
      ref="fileInputRef"
      type="file"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      class="file-input-hidden"
      @change="onFileInputChange"
    />

    <div v-if="isDragging" class="drop-overlay">
      <el-icon :size="48" color="var(--color-primary)"><UploadFilled /></el-icon>
      <p class="drop-text">{{ dropText }}</p>
    </div>

    <div v-else class="drop-content">
      <slot>
        <el-icon :size="32" color="var(--text-placeholder)"><UploadFilled /></el-icon>
        <p class="drop-hint">{{ hintText }}</p>
        <p class="drop-sub-hint">{{ subHintText }}</p>
      </slot>
    </div>

    <div v-if="uploadingFiles.length > 0" class="upload-progress">
      <div v-for="file in uploadingFiles" :key="file.name" class="progress-item">
        <span class="file-name">{{ file.name }}</span>
        <el-progress :percentage="file.progress" :status="file.status" :stroke-width="4" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  accept: { type: String, default: 'image/*' },
  multiple: { type: Boolean, default: false },
  maxSize: { type: Number, default: 10 * 1024 * 1024 },
  disabled: { type: Boolean, default: false },
  hintText: { type: String, default: '拖拽文件到此处，或点击选择' },
  subHintText: { type: String, default: '' },
  dropText: { type: String, default: '释放以上传文件' },
  autoUpload: { type: Boolean, default: true },
})

const emit = defineEmits(['upload', 'error', 'select'])

const fileInputRef = ref(null)
const isDragging = ref(false)
const dragCounter = ref(0)
const uploadingFiles = ref([])

function onDragEnter() {
  if (props.disabled) return
  dragCounter.value++
  isDragging.value = true
}

function onDragOver(e) {
  if (props.disabled) return
  e.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function onDrop(e) {
  if (props.disabled) return
  isDragging.value = false
  dragCounter.value = 0

  const files = Array.from(e.dataTransfer.files)
  processFiles(files)
}

function triggerFileInput() {
  if (props.disabled) return
  fileInputRef.value?.click()
}

function onFileInputChange(e) {
  const files = Array.from(e.target.files || [])
  processFiles(files)
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function processFiles(files) {
  if (files.length === 0) return

  if (!props.multiple && files.length > 1) {
    ElMessage.warning('只能选择一个文件')
    return
  }

  const validFiles = files.filter((file) => {
    if (file.size > props.maxSize) {
      ElMessage.error(`${file.name} 超过大小限制 (${formatSize(props.maxSize)})`)
      return false
    }
    if (props.accept && props.accept !== '*') {
      const acceptList = props.accept.split(',').map((a) => a.trim())
      const fileType = file.type
      const fileExt = '.' + file.name.split('.').pop().toLowerCase()
      const matched = acceptList.some((pattern) => {
        if (pattern.startsWith('.')) return fileExt === pattern.toLowerCase()
        if (pattern.endsWith('/*')) return fileType.startsWith(pattern.replace('/*', '/'))
        return fileType === pattern
      })
      if (!matched) {
        ElMessage.error(`${file.name} 格式不支持`)
        return false
      }
    }
    return true
  })

  if (validFiles.length === 0) return

  emit('select', validFiles)

  if (props.autoUpload) {
    uploadFiles(validFiles)
  }
}

async function uploadFiles(files) {
  for (const file of files) {
    const fileState = ref({ name: file.name, progress: 0, status: '' })
    uploadingFiles.value.push(fileState.value)

    try {
      await emitUpload(file, (progress) => {
        fileState.value.progress = progress
      })
      fileState.value.progress = 100
      fileState.value.status = 'success'
    } catch (error) {
      fileState.value.status = 'exception'
      emit('error', error)
    }

    setTimeout(() => {
      const idx = uploadingFiles.value.findIndex((f) => f.name === file.name)
      if (idx >= 0) uploadingFiles.value.splice(idx, 1)
    }, 2000)
  }
}

function emitUpload(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]
      emit('upload', { file, base64, onProgress }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
      onProgress(100)
      resolve({ file, base64 })
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 80))
      }
    }
    reader.readAsDataURL(file)
  })
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style lang="scss" scoped>
.file-drop-zone {
  position: relative;
  border: 2px dashed var(--border-light, #dcdfe6);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: var(--fill-lighter, #fafafa);

  &:hover {
    border-color: var(--color-primary, #409eff);
    background: var(--color-primary-light-9, #ecf5ff);
  }

  &.is-dragging {
    border-color: var(--color-primary, #409eff);
    background: var(--color-primary-light-8, #d9ecff);
    transform: scale(1.01);

    .drop-overlay {
      display: flex;
    }
  }

  &.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
}

.file-input-hidden {
  display: none;
}

.drop-overlay {
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 100px;

  .drop-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--color-primary, #409eff);
    margin: 0;
  }
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .drop-hint {
    font-size: 14px;
    color: var(--text-regular, #606266);
    margin: 0;
  }

  .drop-sub-hint {
    font-size: 12px;
    color: var(--text-placeholder, #c0c4cc);
    margin: 0;
  }
}

.upload-progress {
  margin-top: 16px;
  text-align: left;

  .progress-item {
    margin-bottom: 8px;

    .file-name {
      font-size: 12px;
      color: var(--text-secondary, #909399);
      display: block;
      margin-bottom: 4px;
    }
  }
}
</style>
