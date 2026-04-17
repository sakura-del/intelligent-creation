<template>
  <div class="ai-image-page">
    <div class="page-header">
      <div class="breadcrumb">
        <span>首页</span>
        <el-icon>
          <ArrowRight />
        </el-icon>
        <span class="current">AI图片生成</span>
      </div>
      <h1 class="page-title">AI 图片生成</h1>
      <p class="page-desc">用文字描述想象，AI为你创造视觉奇迹</p>
    </div>

    <div class="image-workspace">
      <div class="workspace-left">
        <div class="type-selector">
          <h3 class="section-label">选择创作类型</h3>
          <div class="type-grid">
            <div v-for="t in imageStore.templateTypes" :key="t.id || t.value" class="type-card"
              :class="{ active: imageStore.selectedType === (t.id || t.value) }"
              @click="imageStore.selectType(t.id || t.value)">
              <div class="type-icon" :style="{ background: t.color || getTypeColor(t.id || t.value) }">
                <el-icon :size="24" color="#fff">
                  <component :is="t.icon" />
                </el-icon>
              </div>
              <h4>{{ t.name || t.label }}</h4>
              <p>{{ t.desc }}</p>
            </div>
          </div>
        </div>

        <div class="prompt-section">
          <h3 class="section-label">描述你想要的图片</h3>
          <el-input v-model="imageStore.prompt" type="textarea" :rows="4" placeholder="详细描述你想生成的图片内容..."
            maxlength="1000" show-word-limit />
          <div v-if="imageStore.suggestedPrompts.length" class="suggested-prompts">
            <span class="suggest-label">灵感推荐：</span>
            <el-tag v-for="(sp, idx) in imageStore.suggestedPrompts" :key="idx" class="suggest-tag"
              @click="imageStore.prompt = sp">{{ sp }}</el-tag>
          </div>
        </div>
        migration-008.js
        <div class="options-section">
          <h3 class="section-label">高级选项</h3>
          <div class="options-grid">
            <div class="option-item">
              <label>AI模型</label>
              <el-select v-model="imageStore.imageModel" size="default" placeholder="选择模型" :teleported="true"
                filterable>
                <el-option-group v-for="group in modelGroups" :key="group.label" :label="group.label">
                  <el-option v-for="m in group.options" :key="m.value" :label="m.label" :value="m.value">
                    <span style="float: left">{{ m.label }}</span>
                    <span style="float: right; color: #999; font-size: 12px">{{ m.desc.substring(0, 15) }}...</span>
                  </el-option>
                </el-option-group>
              </el-select>
            </div>
            <div class="option-item">
              <label>图片尺寸</label>
              <el-select v-model="imageStore.imageSize" size="default" placeholder="选择尺寸">
                <el-option v-for="s in imageStore.ALL_IMAGE_SIZES" :key="s.value" :label="s.label" :value="s.value">
                  <span>{{ s.label.split(' ')[0] }}</span>
                  <span style="color: #999; font-size: 11px; margin-left: 8px">{{ s.desc }}</span>
                </el-option>
              </el-select>
            </div>
            <div class="option-item">
              <label>画质</label>
              <el-select v-model="imageStore.quality" size="default">
                <el-option v-for="q in imageStore.IMAGE_QUALITY_OPTIONS" :key="q.value" :label="q.label"
                  :value="q.value">
                  <span>{{ q.label.split(' ')[0] }}</span>
                  <span style="color: #999; font-size: 11px">{{ q.desc }}</span>
                </el-option>
              </el-select>
            </div>
            <div class="option-item full-width">
              <label>艺术风格</label>
              <div class="style-grid">
                <div v-for="s in imageStore.IMAGE_STYLE_OPTIONS" :key="s.value" class="style-chip"
                  :class="{ active: imageStore.style === s.value }" @click="imageStore.style = s.value">
                  <span class="style-emoji">{{ s.label.split(' ')[0] }}</span>
                  <span class="style-name">{{ s.label.split(' ').slice(1).join(' ') }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="batch-option">
            <label>生成数量</label>
            <el-slider v-model="imageStore.batchCount" :min="1" :max="4" :step="1" show-stops :marks="batchMarks" />
          </div>
        </div>

        <div class="action-section">
          <el-button type="primary" size="large" :loading="imageStore.generating" :disabled="!imageStore.prompt.trim()"
            class="generate-btn" @click="handleGenerate">
            <el-icon v-if="!imageStore.generating">
              <MagicStick />
            </el-icon>
            {{ imageStore.generating ? `AI正在创作中 (${currentBatchProgress})...` : (imageStore.batchCount > 1 ? `批量生成
            ${imageStore.batchCount} 张` : '开始生成') }}
          </el-button>
          <span v-if="imageStore.generating" class="generating-hint">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            通常需要 10-30 秒/张
          </span>
        </div>
      </div>

      <div class="workspace-right">
        <div class="preview-panel" :class="{ 'has-image': imageStore.hasImage, 'fullscreen-mode': isFullscreen }">
          <div v-if="!imageStore.hasImage && !imageStore.generating && !imageStore.editing" class="preview-empty">
            <FileDropZone accept="image/*" hint-text="拖拽图片到此处，或点击选择" sub-hint-text="支持 JPG/PNG/GIF/WebP，最大 10MB"
              :auto-upload="false" @select="handleImageUpload" />
          </div>

          <div v-else-if="imageStore.generating || imageStore.editing" class="preview-loading">
            <div class="loading-animation">
              <div class="loading-ring"></div>
              <div class="loading-ring delay"></div>
              <div class="loading-ring delay-2"></div>
            </div>
            <p class="loading-text">{{ imageStore.editing ? editActionText : 'AI 正在创作中...' }}</p>
          </div>

          <div v-else-if="showMaskCanvas && imageStore.currentImage" class="edit-mode-container">
            <canvas ref="maskCanvas" class="mask-canvas" @mousedown="startDrawing" @mousemove="draw"
              @mouseup="stopDrawing" @mouseleave="stopDrawing" />
            <div class="canvas-toolbar">
              <span class="toolbar-label">🎨 绘制要重绘的区域</span>
              <el-button size="small" type="primary" @click="applyInpainting">应用局部重绘</el-button>
              <el-button size="small" @click="cancelEdit">取消</el-button>
              <el-button size="small" type="danger" link @click="clearCanvas">清空画布</el-button>
            </div>
          </div>

          <div v-else class="preview-result">
            <AppImage v-if="imageStore.currentImage" :src="`data:image/png;base64,${imageStore.currentImage}`"
              alt="AI Generated" fit="contain" class="result-image" :lazy="false" @error="handleImageError" />

            <div v-if="imageStore.hasImage" class="edit-toolbar">
              <div class="toolbar-group">
                <el-tooltip content="局部重绘" placement="top">
                  <el-button circle size="small" @click="startInpainting">
                    <el-icon>
                      <Brush />
                    </el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="扩展画布" placement="top">
                  <el-dropdown trigger="click" @command="handleOutpainting">
                    <el-button circle size="small"><el-icon>
                        <FullScreen />
                      </el-icon></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="left">← 向左扩展</el-dropdown-item>
                        <el-dropdown-item command="right">向右扩展 →</el-dropdown-item>
                        <el-dropdown-item command="up">↑ 向上扩展</el-dropdown-item>
                        <el-dropdown-item command="down">向下扩展 ↓</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-tooltip>
                <el-tooltip content="风格迁移" placement="top">
                  <el-dropdown trigger="click" @command="handleStyleTransfer">
                    <el-button circle size="small"><el-icon>
                        <MagicStick />
                      </el-icon></el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="oil-painting">🎨 油画风格</el-dropdown-item>
                        <el-dropdown-item command="watercolor">💧 水彩风格</el-dropdown-item>
                        <el-dropdown-item command="sketch">✏️ 素描风格</el-dropdown-item>
                        <el-dropdown-item command="anime">🌸 动漫风格</el-dropdown-item>
                        <el-dropdown-item command="cyberpunk">🌆 赛博朋克</el-dropdown-item>
                        <el-dropdown-item command="pixel">👾 像素风</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </el-tooltip>
                <el-tooltip content="生成变体" placement="top">
                  <el-button circle size="small" @click="handleVariation">
                    <el-icon>
                      <RefreshRight />
                    </el-icon>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="toolbar-actions">
                <el-tooltip content="保存到作品库" placement="top">
                  <el-button type="success" circle @click="handleSaveToGallery"><el-icon>
                      <FolderAdd />
                    </el-icon></el-button>
                </el-tooltip>
                <el-dropdown trigger="click" @command="handleDownload">
                  <el-button type="primary" circle><el-icon>
                      <Download />
                    </el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="png">📥 下载 PNG (无损)</el-dropdown-item>
                      <el-dropdown-item command="jpeg">📥 下载 JPG (压缩)</el-dropdown-item>
                      <el-dropdown-item command="webp">📥 下载 WebP (现代格式)</el-dropdown-item>
                      <el-dropdown-item divided command="all">📦 批量下载全部 ({{ imageStore.generatedImages.length
                      }}张)</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
                <el-tooltip :content="isFullscreen ? '退出全屏' : '全屏预览'" placement="top">
                  <el-button circle size="small" @click="toggleFullscreen">
                    <el-icon>
                      <FullScreen v-if="!isFullscreen" />
                      <ScaleToOriginal v-else />
                    </el-icon>
                  </el-button>
                </el-tooltip>
                <el-button circle @click="copyImage"><el-icon>
                    <CopyDocument />
                  </el-icon></el-button>
                <el-button v-if="imageStore.canUndo" circle @click="imageStore.undoEdit()"><el-icon>
                    <Back />
                  </el-icon></el-button>
              </div>
            </div>

            <div class="result-meta">
              <span>{{ imageStore.currentSize }}</span>
              <span>{{ imageStore.currentProvider }}</span>
              <span v-if="imageStore.lastEditType" class="edit-badge">{{ getEditLabel(imageStore.lastEditType) }}</span>
            </div>
          </div>

          <div v-if="imageStore.generatedImages.length > 0" class="gallery-section">
            <h4 class="gallery-title">创作历程 ({{ imageStore.generatedImages.length }})</h4>
            <div class="gallery-grid">
              <div v-for="(img, idx) in imageStore.generatedImages" :key="idx"
                v-memo="[idx, imageStore.currentImageIndex === idx]" class="gallery-item"
                :class="{ active: imageStore.currentImageIndex === idx }" @click="imageStore.selectGalleryImage(idx)">
                <AppImage :src="`data:image/png;base64,${img.data}`" :alt="`Generated ${idx + 1}`" fit="cover"
                  aspect-ratio="1" />
                <div class="gallery-delete" @click.stop="imageStore.removeImage(idx)">
                  <el-icon>
                    <Close />
                  </el-icon>
                </div>
                <div v-if="img.editType" class="gallery-edit-tag">{{ getEditLabel(img.editType) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="saveDialogVisible" title="保存到作品库" width="480px" :close-on-click-modal="false">
      <el-form :model="saveForm" label-width="80px">
        <el-form-item label="标题">
          <el-input v-model="saveForm.title" placeholder="为作品起个名字" maxlength="200" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="saveForm.category" placeholder="选择分类" clearable style="width: 100%">
            <el-option v-for="cat in imageStore.categories" :key="cat.slug" :label="cat.name" :value="cat.slug" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <div class="tags-input-area">
            <el-tag v-for="tag in saveForm.tags" :key="tag" closable @close="removeTag(tag)" class="tag-item">
              {{ tag }}
            </el-tag>
            <el-input v-if="tagInputVisible" ref="tagInputRef" v-model="tagInputValue" size="small" style="width: 100px"
              @keyup.enter="addTag" @blur="addTag" />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </div>
        </el-form-item>
        <el-form-item label="收藏">
          <el-switch v-model="saveForm.is_favorite" />
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="saveForm.is_public" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="saveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  MagicStick, Picture, Download, CopyDocument, FolderAdd,
  RefreshRight, Close, Loading, ArrowRight,
  Brush, FullScreen, Back, ZoomIn, ZoomOut, ScaleToOriginal
} from '@element-plus/icons-vue'
import { useImageStore } from '@/stores/modules/image'
import AppImage from '@/components/AppImage.vue'
import FileDropZone from '@/components/FileDropZone.vue'
import { eventBus } from '@/utils/eventBus'

const route = useRoute()
const imageStore = useImageStore()

const showMaskCanvas = ref(false)
const editActionText = ref('AI 正在处理...')
const maskCanvas = ref(null)
const tagInputRef = ref(null)
const tagInputVisible = ref(false)
const tagInputValue = ref('')
const isFullscreen = ref(false)
const isGeneratingLocked = ref(false)

const modelGroups = computed(() => {
  const glm = imageStore.IMAGE_MODEL_OPTIONS.filter(m => m.provider === 'glm')
  const openai = imageStore.IMAGE_MODEL_OPTIONS.filter(m => m.provider === 'openai')
  return [
    { label: '🇨🇳 智谱 GLM (推荐)', options: glm },
    { label: '🌐 OpenAI', options: openai },
  ]
})

const saveDialogVisible = ref(false)
const saveForm = ref({
  title: '',
  category: '',
  tags: [],
  is_favorite: false,
  is_public: false,
})

const batchMarks = computed(() => {
  const marks = {}
  for (let i = 1; i <= 4; i++) {
    marks[i] = {
      style: { color: '#1989fa' },
      label: `${i}张`,
    }
  }
  return marks
})

const currentBatchProgress = computed(() => {
  if (!imageStore.generating) return ''
  return `${imageStore.generatedImages.length + 1}/${imageStore.batchCount}`
})

let isDrawing = false
let ctx = null

function getTypeColor(type) {
  const colors = {
    avatar: 'linear-gradient(135deg, #667eea, #764ba2)',
    portrait: 'linear-gradient(135deg, #f093fb, #f5576c)',
    landscape: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    ad_horizontal: 'linear-gradient(135deg, #fa709a, #fee140)',
    ad_vertical: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    ad_square: 'linear-gradient(135deg, #ff0844, #ffb199)',
    design: 'linear-gradient(135deg, #11998e, #38ef7d)',
    icon: 'linear-gradient(135deg, #fc4a1a, #f7b733)',
    general: 'linear-gradient(135deg, #409EFF, #67C23A)',
  }
  return colors[type] || colors.general
}

function handleImageError() {
  ElMessage.error('图片数据异常，请重新生成')
  imageStore.currentImage = ''
}

function handleImageUpload(files) {
  if (!files || files.length === 0) return
  const file = files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1]
    imageStore.generatedImages.unshift({
      data: base64,
      prompt: '上传的图片',
      type: 'uploaded',
      size: file.name,
      provider: 'local',
      time: new Date().toLocaleTimeString(),
      editType: null,
    })
    imageStore.currentImageIndex = 0
    ElMessage.success('图片已上传')
  }
  reader.readAsDataURL(file)
}

async function handleGenerate() {
  if (isGeneratingLocked.value || imageStore.generating) {
    ElMessage.warning('正在生成中，请稍候...')
    return
  }

  if (!imageStore.prompt.trim()) {
    ElMessage.warning('请输入创作提示词')
    return
  }

  if (!imageStore.selectedType) {
    ElMessage.warning('请选择图片类型')
    return
  }

  isGeneratingLocked.value = true
  try {
    if (imageStore.batchCount > 1) {
      await imageStore.batchGenerate(imageStore.batchCount)
    } else {
      await imageStore.generateImage()
    }
    ElMessage.success('图片生成完成！')
    eventBus.emit(eventBus.events.AI_OPERATION_COMPLETED, { type: 'image' })
    eventBus.emit(eventBus.events.HISTORY_REFRESH_REQUIRED)
    eventBus.emit(eventBus.events.STATISTICS_REFRESH_REQUIRED)
  } catch (error) {
    console.error('Generate error:', error)

    if (error.message?.includes('network') || error.message?.includes('fetch') || error.code === 'ERR_NETWORK') {
      ElMessage.error('网络连接失败，请检查网络设置')
    } else if (error.response?.status === 500) {
      ElMessage.error('服务器繁忙，请稍后重试')
    } else if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(`生成失败: ${error.message || '未知错误'}`)
    }
  } finally {
    isGeneratingLocked.value = false
  }
}

function startInpainting() {
  if (!imageStore.currentImage) return
  showMaskCanvas.value = true
  nextTick(() => initCanvas())
}

function initCanvas() {
  if (!maskCanvas.value) return
  const canvas = maskCanvas.value
  const img = new Image()
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 30
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
  img.src = `data:image/png;base64,${imageStore.currentImage}`
}

function startDrawing(e) {
  if (!ctx) return
  isDrawing = true
  const rect = maskCanvas.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (maskCanvas.value.width / rect.width)
  const y = (e.clientY - rect.top) * (maskCanvas.value.height / rect.height)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e) {
  if (!isDrawing || !ctx) return
  const rect = maskCanvas.value.getBoundingClientRect()
  const x = (e.clientX - rect.left) * (maskCanvas.value.width / rect.width)
  const y = (e.clientY - rect.top) * (maskCanvas.value.height / rect.height)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function stopDrawing() {
  isDrawing = false
  if (ctx) ctx.beginPath()
}

function clearCanvas() {
  if (!ctx || !maskCanvas.value) return
  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)
    ctx.drawImage(img, 0, 0)
  }
  img.src = `data:image/png;base64,${imageStore.currentImage}`
}

function cancelEdit() {
  showMaskCanvas.value = false
}

async function applyInpainting() {
  if (!ctx || !maskCanvas.value) return
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = maskCanvas.value.width
  tempCanvas.height = maskCanvas.value.height
  const tempCtx = tempCanvas.getContext('2d')
  const imageData = ctx.getImageData(0, 0, maskCanvas.value.width, maskCanvas.value.height)
  const maskData = tempCtx.createImageData(maskCanvas.value.width, maskCanvas.value.height)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i]
    const g = imageData.data[i + 1]
    const b = imageData.data[i + 2]
    if (r > 200 && g < 100 && b < 100) {
      maskData.data[i] = 255
      maskData.data[i + 1] = 255
      maskData.data[i + 2] = 255
      maskData.data[i + 3] = 255
    } else {
      maskData.data[i + 3] = 0
    }
  }
  tempCtx.putImageData(maskData, 0, 0)
  const maskBase64 = tempCanvas.toDataURL('image/png').split(',')[1]
  showMaskCanvas.value = false
  editActionText.value = '正在执行局部重绘...'
  await imageStore.editImage({
    editType: 'inpainting',
    extraParams: { maskImage: maskBase64 },
  })
}

async function handleOutpainting(direction) {
  const directionPrompts = {
    left: 'extend the image to the left side, continue the scene naturally',
    right: 'extend the image to the right side, continue the scene naturally',
    up: 'extend the image upward, add more sky or background above',
    down: 'extend the image downward, add more ground or foreground below',
  }
  editActionText.value = `正在向${direction === 'left' ? '左' : direction === 'right' ? '右' : direction === 'up' ? '上' : '下'}扩展...`
  await imageStore.editImage({
    editType: 'outpainting',
    extraParams: { prompt: directionPrompts[direction] },
  })
}

async function handleStyleTransfer(styleName) {
  const stylePrompts = {
    'oil-painting': 'transform into classical oil painting style with visible brushstrokes and rich textures',
    watercolor: 'transform into delicate watercolor painting with soft edges and flowing colors',
    sketch: 'transform into pencil sketch with fine lines and shading details',
    anime: 'transform into Japanese anime/manga art style with vibrant colors and clean lines',
    cyberpunk: 'transform into cyberpunk aesthetic with neon lights and futuristic elements',
    pixel: 'transform into retro pixel art style like 8-bit or 16-bit games',
  }
  editActionText.value = `正在应用${styleName}风格...`
  await imageStore.editImage({
    editType: 'style_transfer',
    extraParams: { prompt: stylePrompts[styleName] },
  })
}

async function handleVariation() {
  editActionText.value = '正在生成变体...'
  await imageStore.editImage({ editType: 'variation' })
}

function getEditLabel(type) {
  const labels = {
    inpainting: '局部重绘',
    outpainting: '画布扩展',
    style_transfer: '风格迁移',
    variation: '变体生成',
  }
  return labels[type] || type
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  if (isFullscreen.value) {
    ElMessage.info('已进入全屏模式，按 ESC 或点击按钮退出')
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
    ElMessage.info('已退出全屏模式')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

async function handleDownload(format) {
  if (format === 'all') {
    await batchDownloadImages()
    return
  }

  if (!imageStore.currentImage) {
    ElMessage.warning('没有可下载的图片')
    return
  }

  try {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
    const ext = format === 'jpeg' ? 'jpg' : format
    const timestamp = Date.now()

    const base64Data = imageStore.currentImage

    if (format === 'png') {
      const link = document.createElement('a')
      link.href = `data:image/png;base64,${base64Data}`
      link.download = `ai-image-${timestamp}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const response = await fetch(`data:image/png;base64,${base64Data}`)
      const blob = await response.blob()

      const canvas = document.createElement('canvas')
      const img = new Image()
      img.src = URL.createObjectURL(blob)

      await new Promise((resolve) => {
        img.onload = resolve
      })

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((convertedBlob) => {
        const url = URL.createObjectURL(convertedBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ai-image-${timestamp}.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        URL.revokeObjectURL(img.src)
      }, mimeType, format === 'jpeg' ? 0.92 : 0.95)
    }

    ElMessage.success(`${format.toUpperCase()} 格式图片已下载`)
  } catch (error) {
    console.error('Download error:', error)

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      ElMessage.error('图片数据异常，请尝试复制图片')
    } else {
      ElMessage.error('下载失败，请尝试复制图片')
    }
  }
}

async function batchDownloadImages() {
  if (imageStore.generatedImages.length === 0) {
    ElMessage.warning('没有可下载的图片')
    return
  }

  ElMessage.info(`开始打包下载 ${imageStore.generatedImages.length} 张图片...`)

  const baseTime = Date.now()

  for (let i = 0; i < imageStore.generatedImages.length; i++) {
    try {
      const imgData = imageStore.generatedImages[i].data
      const timestamp = baseTime + (i * 1000)
      const seqNum = String(i + 1).padStart(2, '0')

      const link = document.createElement('a')
      link.href = `data:image/png;base64,${imgData}`
      link.download = `ai-image-${seqNum}-${timestamp}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (e) {
      console.error(`Failed to download image ${i}:`, e)
    }
  }

  ElMessage.success(`已完成 ${imageStore.generatedImages.length} 张图片的下载`)
}

async function copyImage() {
  if (!imageStore.currentImage) return
  try {
    const response = await fetch(`data:image/png;base64,${imageStore.currentImage}`)
    const blob = await response.blob()
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    ElMessage.success('图片已复制到剪贴板')
  } catch {
    ElMessage.warning('复制失败，请使用下载功能')
  }
}

function handleSaveToGallery() {
  saveForm.value = {
    title: imageStore.prompt.substring(0, 50),
    category: imageStore.selectedType,
    tags: [],
    is_favorite: false,
    is_public: false,
  }
  saveDialogVisible.value = true
}

async function confirmSave() {
  await imageStore.saveToGallery(saveForm.value)
  saveDialogVisible.value = false
}

function showTagInput() {
  tagInputVisible.value = true
  nextTick(() => tagInputRef.value?.focus())
}

function addTag() {
  const val = tagInputValue.value.trim()
  if (val && !saveForm.value.tags.includes(val) && saveForm.value.tags.length < 10) {
    saveForm.value.tags.push(val)
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
}

function removeTag(tag) {
  saveForm.value.tags = saveForm.value.tags.filter((t) => t !== tag)
}

function loadPromptFromStorage() {
  if (route.query.promptId) {
    const savedPrompt = localStorage.getItem('selectedPrompt')
    if (savedPrompt) {
      try {
        const promptData = JSON.parse(savedPrompt)
        if (promptData.content) {
          imageStore.prompt = promptData.content
          ElMessage.success(`已加载提示词：${promptData.title || '自定义提示词'}`)
        }
      } catch (e) {
        console.error('Failed to parse saved prompt:', e)
      }
    }
  }
}

function handleWindowMessage(event) {
  if (event.origin !== window.location.origin) return
  if (event.data?.type === 'USE_PROMPT' && event.data?.content) {
    imageStore.prompt = event.data.content
    ElMessage.success('提示词已填充到输入框')
  }
}

onMounted(() => {
  imageStore.fetchTemplates()
  imageStore.fetchCategories()
  loadPromptFromStorage()
  window.addEventListener('message', handleWindowMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleWindowMessage)
})
</script>

<style lang="scss" scoped>
.ai-image-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;

  .breadcrumb {
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .current {
      color: var(--color-primary);
    }
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .page-desc {
    color: var(--text-regular);
    font-size: 15px;
    margin: 0;
  }
}

.image-workspace {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 28px;
  background: var(--bg-white);
  border-radius: 12px;
  padding: 28px;
  box-shadow: var(--shadow-light);
}

.workspace-left {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .section-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;

  .type-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 14px 8px;
    border: 2px solid var(--border-light);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s;

    &:hover {
      border-color: var(--text-placeholder);
      transform: translateY(-2px);
    }

    &.active {
      border-color: var(--color-primary);
      background: var(--color-primary-light-9);
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
    }

    .type-icon {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-emoji {
      font-size: 22px;
      line-height: 1;
    }

    .type-name {
      font-size: 12px;
      color: var(--text-regular);
      text-align: center;
    }
  }
}

.prompt-section {
  .suggested-prompts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 10px;
    align-items: center;

    .suggest-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .suggest-tag {
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }
    }
  }
}

.options-section {
  .options-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

    .option-item {
      &.full-width {
        grid-column: 1 / -1;
      }

      label {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 6px;
        font-weight: 500;
      }
    }
  }

  .style-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .style-chip {
      padding: 6px 12px;
      border: 1.5px solid var(--border-light);
      border-radius: 18px;
      cursor: pointer;
      transition: all 0.25s ease;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--bg-white);

      &:hover {
        border-color: var(--color-primary-light-5);
        background: var(--color-primary-light-9);
      }

      &.active {
        border-color: var(--color-primary);
        background: var(--color-primary-light-9);
        color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
      }

      .style-emoji {
        font-size: 14px;
      }

      .style-name {
        color: var(--text-regular);
        font-size: 11px;
      }
    }
  }

  .batch-option {
    margin-top: 16px;

    label {
      display: block;
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 6px;
    }
  }
}

.action-section {
  .generate-btn {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 2px;
  }

  .generating-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: 10px;

    .is-loading {
      animation: spin 1s linear infinite;
    }
  }
}

.workspace-right {
  min-height: 500px;
  position: relative;
}

.preview-panel {
  background: var(--bg-color);
  border-radius: 12px;
  overflow: visible;
  display: flex;
  flex-direction: column;

  &.has-image {
    background: var(--bg-white);
    box-shadow: var(--shadow-light);
  }

  &.fullscreen-mode {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    border-radius: 0;
    background: rgba(0, 0, 0, 0.95);
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  color: var(--text-placeholder);

  p {
    margin: 16px 0 6px;
    font-size: 15px;
  }

  span {
    font-size: 13px;
  }
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 450px;

  .loading-animation {
    position: relative;
    width: 80px;
    height: 80px;

    .loading-ring {
      position: absolute;
      width: 60px;
      height: 60px;
      border: 3px solid transparent;
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;

      &.delay {
        width: 70px;
        height: 70px;
        border-width: 2px;
        border-top-color: var(--color-success);
        animation-delay: 0.2s;
        opacity: 0.6;
      }

      &.delay-2 {
        width: 78px;
        height: 78px;
        border-width: 1.5px;
        border-top-color: var(--color-warning);
        animation-delay: 0.4s;
        opacity: 0.35;
      }
    }
  }

  .loading-text {
    margin-top: 28px;
    color: var(--text-regular);
    font-size: 15px;
    animation: pulse 1.5s ease-in-out infinite;
  }
}

.edit-mode-container {
  position: relative;

  .mask-canvas {
    width: 100%;
    max-height: 520px;
    object-fit: contain;
    cursor: crosshair;
    display: block;
    border-radius: 8px 8px 0 0;
  }

  .canvas-toolbar {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 25px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10;

    .toolbar-label {
      color: #fff;
      font-size: 13px;
      font-weight: 500;
    }
  }
}

.preview-result {
  position: relative;
  min-height: 300px;

  .result-image {
    width: 100%;
    max-height: none;
    height: auto;
    object-fit: contain;
    display: block;
    border-radius: 8px 8px 0 0;
  }

  .edit-toolbar {
    position: relative;
    top: auto;
    left: auto;
    transform: none;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(10px);
    padding: 12px 16px;
    border-radius: 0 0 12px 12px;
    box-shadow: var(--shadow-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    opacity: 1;
    z-index: 10;
    margin-top: -4px;
    flex-wrap: wrap;

    &:hover {
      box-shadow: var(--shadow-dark);
    }
  }

  .toolbar-group {
    display: flex;
    gap: 6px;
    padding-right: 12px;
    border-right: 1px solid var(--border-lighter);
  }

  .toolbar-actions {
    display: flex;
    gap: 6px;
  }

  .result-meta {
    padding: 14px 20px;
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.02));

    .edit-badge {
      background: var(--color-primary-light-9);
      color: var(--color-primary);
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 500;
    }
  }
}

.gallery-section {
  padding: 16px 20px;
  border-top: 1px solid var(--border-lighter);

  .gallery-title {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 12px;
  }

  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  .gallery-item {
    position: relative;
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.25s;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &:hover {
      border-color: var(--text-placeholder);
      transform: scale(1.05);

      .gallery-delete {
        opacity: 1;
      }
    }

    &.active {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }

    .gallery-delete {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      color: #fff;
      font-size: 11px;

      &:hover {
        background: #F56C6C;
      }
    }

    .gallery-edit-tag {
      position: absolute;
      bottom: 2px;
      left: 2px;
      right: 2px;
      background: rgba(64, 158, 255, 0.9);
      color: #fff;
      font-size: 9px;
      text-align: center;
      padding: 2px 4px;
      border-radius: 3px;
    }
  }
}

.tags-input-area {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  .tag-item {
    margin: 0;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.45;
  }
}

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  .fullscreen-image {
    max-width: 95vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  }

  .fullscreen-toolbar {
    margin-top: 20px;
    display: flex;
    gap: 12px;
    padding: 16px 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 40px;
    backdrop-filter: blur(10px);
  }
}

@media (max-width: 900px) {
  .image-workspace {
    grid-template-columns: 1fr;
  }

  .type-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .edit-toolbar {
    position: static !important;
    transform: none !important;
    margin-top: 12px;
    opacity: 1 !important;
  }
}
</style>
