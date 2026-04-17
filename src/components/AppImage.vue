<template>
  <div class="app-image" :style="wrapperStyle" :class="{ 'is-loading': isLoading, 'is-error': hasError }">
    <div v-if="isLoading" class="app-image__placeholder">
      <slot name="placeholder">
        <div class="app-image__skeleton"></div>
      </slot>
    </div>

    <img
      v-show="!isLoading && !hasError"
      ref="imgRef"
      :src="resolvedSrc"
      :alt="alt"
      :loading="lazy ? 'lazy' : 'eager'"
      :class="['app-image__inner', fitClass]"
      @load="onLoad"
      @error="onError"
    />

    <div v-if="hasError" class="app-image__error" @click="retry">
      <slot name="error">
        <el-icon :size="errorIconSize" color="var(--text-placeholder)"><Picture /></el-icon>
        <span v-if="showRetry" class="app-image__retry">{{ $t('common.retry') || '重试' }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Picture } from '@element-plus/icons-vue'

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  lazy: { type: Boolean, default: true },
  fit: { type: String, default: 'cover', validator: (v) => ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(v) },
  width: { type: [String, Number], default: '' },
  height: { type: [String, Number], default: '' },
  aspectRatio: { type: String, default: '' },
  showRetry: { type: Boolean, default: true },
  errorIconSize: { type: Number, default: 32 },
})

const emit = defineEmits(['load', 'error'])

const imgRef = ref(null)
const isLoading = ref(true)
const hasError = ref(false)
const blobUrl = ref('')
const retryCount = ref(0)

const fitClass = computed(() => `app-image__fit--${props.fit}`)

const wrapperStyle = computed(() => {
  const style = {}
  if (props.width) style.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  if (props.height) style.height = typeof props.height === 'number' ? `${props.height}px` : props.height
  if (props.aspectRatio) style.aspectRatio = props.aspectRatio
  return style
})

const resolvedSrc = computed(() => {
  if (!props.src) return ''
  if (props.src.startsWith('data:')) {
    if (blobUrl.value) return blobUrl.value
    return props.src
  }
  return props.src
})

function convertBase64ToBlobUrl(base64Src) {
  try {
    const parts = base64Src.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    const bstr = atob(parts[1] || parts[0])
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) {
      u8arr[i] = bstr.charCodeAt(i)
    }
    const blob = new Blob([u8arr], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    return base64Src
  }
}

function releaseBlobUrl() {
  if (blobUrl.value) {
    URL.revokeObjectURL(blobUrl.value)
    blobUrl.value = ''
  }
}

function onLoad(e) {
  isLoading.value = false
  hasError.value = false
  emit('load', e)
}

function onError(e) {
  isLoading.value = false
  hasError.value = true
  emit('error', e)
}

function retry() {
  if (retryCount.value >= 3) return
  retryCount.value++
  hasError.value = false
  isLoading.value = true
  if (imgRef.value) {
    const src = resolvedSrc.value
    imgRef.value.src = ''
    requestAnimationFrame(() => {
      if (imgRef.value) imgRef.value.src = src
    })
  }
}

watch(() => props.src, (newSrc) => {
  releaseBlobUrl()
  isLoading.value = true
  hasError.value = false
  retryCount.value = 0

  if (newSrc && newSrc.startsWith('data:')) {
    blobUrl.value = convertBase64ToBlobUrl(newSrc)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  releaseBlobUrl()
})
</script>

<style lang="scss" scoped>
.app-image {
  position: relative;
  display: inline-block;
  overflow: hidden;
  border-radius: var(--border-radius-base, 4px);

  &__placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--fill-light, #f5f7fa);
  }

  &__skeleton {
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, var(--fill-light, #f5f7fa) 25%, var(--fill-base, #e4e7ed) 37%, var(--fill-light, #f5f7fa) 63%);
    background-size: 400% 100%;
    animation: app-image-loading 1.4s ease infinite;
  }

  &__inner {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__fit--fill { object-fit: fill; }
  &__fit--contain { object-fit: contain; }
  &__fit--cover { object-fit: cover; }
  &__fit--none { object-fit: none; }
  &__fit--scale-down { object-fit: scale-down; }

  &__error {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: var(--fill-lighter, #fafafa);
    cursor: pointer;
  }

  &__retry {
    font-size: 12px;
    color: var(--text-secondary, #909399);
  }
}

@keyframes app-image-loading {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}
</style>
