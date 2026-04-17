import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { imageApi, galleryApi } from '@/api/ai'
import { ElMessage } from 'element-plus'

export const useImageStore = defineStore('image', () => {
  const generating = ref(false)
  const editing = ref(false)
  const currentImage = ref('')
  const currentSize = ref('')
  const currentProvider = ref('')
  const lastEditType = ref('')
  const editHistory = ref([])
  const generatedImages = ref([])
  const currentImageIndex = ref(-1)
  const MAX_GENERATED_IMAGES = 50
  const templateTypes = ref([])
  const categories = ref([])

  const selectedType = ref('avatar')
  const prompt = ref('')
  const imageSize = ref('1024x1024')
  const quality = ref('standard')
  const style = ref('vivid')
  const batchCount = ref(1)
  const imageModel = ref('cogview-3-plus')

  const ALL_IMAGE_SIZES = [
    { value: '256x256', label: '256×256 (缩略图)', desc: '适合图标/头像缩略' },
    { value: '512x512', label: '512×512 (小尺寸)', desc: '适合预览/小图' },
    { value: '768x1344', label: '768×1344 (竖版3:4)', desc: '适合手机壁纸/人像' },
    { value: '1024x1024', label: '1024×1024 (正方形)', desc: '默认尺寸，通用性强' },
    { value: '1344x768', label: '1344×768 (横版16:9)', desc: '适合横幅/Banner/风景' },
    { value: '1280x720', label: '1280×720 (HD横版)', desc: '高清横版，标准比例' },
    { value: '720x1280', label: '720×1280 (HD竖版)', desc: '高清竖版，手机适配' },
    { value: '1792x1024', label: '1792×1024 (大横版)', desc: 'DALL-E 3最大横版' },
    { value: '1024x1792', label: '1024×1792 (大竖版)', desc: 'DALL-E 3最大竖版' },
  ]

  const IMAGE_QUALITY_OPTIONS = [
    { value: 'standard', label: '标准画质', desc: '生成速度快，质量良好' },
    { value: 'hd', label: '高清画质', desc: '细节更丰富，耗时稍长' },
  ]

  const IMAGE_STYLE_OPTIONS = [
    { value: 'vivid', label: '🎨 生动鲜明', desc: '色彩饱和，视觉冲击强' },
    { value: 'natural', label: '🌿 自然写实', desc: '真实感强，接近照片' },
    { value: 'anime', label: '🌸 动漫风格', desc: '日系动漫，线条清晰' },
    { value: 'sketch', label: '✏️ 素描风格', desc: '铅笔素描，艺术感强' },
    { value: 'oil-painting', label: '🖼️ 油画风格', desc: '笔触厚重，质感丰富' },
    { value: 'watercolor', label: '💧 水彩风格', desc: '柔和淡雅，意境优美' },
    { value: 'cyberpunk', label: '🌆 赛博朋克', desc: '霓虹灯光，未来科技' },
    { value: 'pixel', label: '👾 像素风格', desc: '复古游戏，8-bit/16-bit' },
    { value: '3d-render', label: '🎮 3D渲染', desc: '立体建模，现代感强' },
    { value: 'photography', label: '📷 摄影风格', desc: '专业摄影，光影自然' },
    { value: 'illustration', label: '📐 插画风格', desc: '平面插画，设计感强' },
    { value: 'minimalist', label: '⚪ 极简风格', desc: '简洁留白，现代美学' },
  ]

  const IMAGE_MODEL_OPTIONS = [
    {
      value: 'cogview-3-plus',
      label: 'CogView-3 Plus',
      provider: 'glm',
      desc: '智谱最新模型，中文优化，支持复杂场景',
    },
    { value: 'cogview-3', label: 'CogView-3', provider: 'glm', desc: '智谱稳定版本，速度快' },
    {
      value: 'dall-e-3',
      label: 'DALL·E 3',
      provider: 'openai',
      desc: 'OpenAI旗舰，创意强，支持精确文本渲染',
    },
    { value: 'dall-e-2', label: 'DALL·E 2', provider: 'openai', desc: 'OpenAI经典版，性价比高' },
  ]

  const canUndo = computed(() => editHistory.value.length > 0)
  const hasImage = computed(() => !!currentImage.value)

  const availableSizes = computed(() => {
    const typeSizeMap = {
      avatar: ['256x256', '512x512', '1024x1024'],
      portrait: ['768x1344', '1024x1792', '720x1280'],
      landscape: ['1344x768', '1792x1024', '1280x720'],
      ad_horizontal: ['1344x768', '1792x1024', '1280x720'],
      ad_vertical: ['768x1344', '1024x1792', '720x1280'],
      ad_square: ['1024x1024'],
      design: ['1024x1024', '1344x768', '1792x1024', '768x1344'],
      icon: ['256x256', '512x512', '1024x1024'],
      general: ALL_IMAGE_SIZES.map((s) => s.value),
    }
    return typeSizeMap[selectedType.value] || typeSizeMap.general
  })

  const currentModelInfo = computed(() => {
    return IMAGE_MODEL_OPTIONS.find((m) => m.value === imageModel.value) || IMAGE_MODEL_OPTIONS[0]
  })

  const currentStyleInfo = computed(() => {
    return IMAGE_STYLE_OPTIONS.find((s) => s.value === style.value) || IMAGE_STYLE_OPTIONS[0]
  })

  const selectedTypeInfo = computed(
    () => templateTypes.value.find((t) => t.value === selectedType.value) || {},
  )

  const suggestedPrompts = computed(() => selectedTypeInfo.value.suggestedPrompts || [])

  async function fetchTemplates() {
    try {
      const res = await imageApi.getTemplates()
      const types = res?.types || res?.data?.types
      if (types) {
        templateTypes.value = types.map((t, index) => ({
          ...t,
          icon:
            [
              'UserFilled',
              'Avatar',
              'Picture',
              'DataBoard',
              'Mobile',
              'Postcard',
              'MagicStick',
              'SetUp',
              'StarFilled',
            ][index] || 'MagicStick',
        }))
      }
    } catch (error) {
      console.error('Failed to load image templates:', error)
    }
  }

  async function fetchCategories() {
    try {
      const res = await imageApi.getCategories()
      categories.value = res?.categories || res?.data?.categories || []
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  async function generateImage() {
    if (!prompt.value.trim()) {
      ElMessage.warning('请输入图片描述')
      return null
    }

    generating.value = true
    currentImage.value = ''

    try {
      const res = await imageApi.generate({
        prompt: prompt.value.trim(),
        type: selectedType.value,
        size: imageSize.value !== '1024x1024' ? imageSize.value : undefined,
        quality: quality.value,
        style: style.value,
        model: imageModel.value !== 'cogview-3-plus' ? imageModel.value : undefined,
      })

      if (res?.imageData) {
        currentImage.value = res.imageData
        currentSize.value = res.size || imageSize.value
        currentProvider.value = res.provider || 'AI'
        lastEditType.value = ''

        generatedImages.value.unshift({
          data: res.imageData,
          prompt: prompt.value,
          type: selectedType.value,
          size: res.size,
          provider: res.provider,
          time: new Date().toLocaleTimeString(),
          editType: null,
        })
        if (generatedImages.value.length > MAX_GENERATED_IMAGES) {
          generatedImages.value.splice(MAX_GENERATED_IMAGES)
        }
        currentImageIndex.value = 0

        ElMessage.success('图片生成成功！')
        return res
      } else {
        ElMessage.warning('未返回有效的图片数据')
        return null
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || '生成失败'
      ElMessage.error(msg)
      return null
    } finally {
      generating.value = false
    }
  }

  async function batchGenerate(count = 1) {
    if (!prompt.value.trim()) {
      ElMessage.warning('请输入图片描述')
      return []
    }

    generating.value = true
    const results = []

    for (let i = 0; i < count; i++) {
      try {
        const res = await imageApi.generate({
          prompt: prompt.value.trim(),
          type: selectedType.value,
          size: imageSize.value !== '1024x1024' ? imageSize.value : undefined,
          quality: quality.value,
          style: style.value,
          model: imageModel.value !== 'cogview-3-plus' ? imageModel.value : undefined,
        })

        if (res?.imageData) {
          generatedImages.value.unshift({
            data: res.imageData,
            prompt: prompt.value,
            type: selectedType.value,
            size: res.size,
            provider: res.provider,
            time: new Date().toLocaleTimeString(),
            editType: null,
          })
          if (generatedImages.value.length > MAX_GENERATED_IMAGES) {
            generatedImages.value.splice(MAX_GENERATED_IMAGES)
          }
          results.push(res)

          if (i === 0) {
            currentImage.value = res.imageData
            currentSize.value = res.size || imageSize.value
            currentProvider.value = res.provider || 'AI'
            currentImageIndex.value = 0
          }
        }
      } catch (error) {
        const msg = error.response?.data?.message || error.message || `第${i + 1}张生成失败`
        ElMessage.error(msg)
      }
    }

    generating.value = false

    if (results.length > 0) {
      ElMessage.success(`成功生成 ${results.length} 张图片`)
    }

    return results
  }

  async function editImage({ editType, extraParams = {} }) {
    if (!currentImage.value) return null

    editing.value = true
    editHistory.value.push({
      imageData: currentImage.value,
      timestamp: Date.now(),
    })

    try {
      let res

      if (editType === 'variation') {
        res = await imageApi.variation({
          originalImage: currentImage.value,
          size: currentSize.value,
          style: style.value,
        })
      } else {
        res = await imageApi.edit({
          originalImage: currentImage.value,
          prompt: extraParams.prompt || prompt.value,
          editType,
          ...(extraParams.maskImage && { maskImage: extraParams.maskImage }),
          size: currentSize.value,
          quality: quality.value,
          style: style.value,
        })
      }

      if (res?.imageData) {
        currentImage.value = res.imageData
        lastEditType.value = editType

        generatedImages.value.unshift({
          data: res.imageData,
          prompt: extraParams.prompt || prompt.value,
          type: `${selectedType.value}_${editType}`,
          size: res.size,
          provider: res.provider,
          time: new Date().toLocaleTimeString(),
          editType,
        })
        if (generatedImages.value.length > MAX_GENERATED_IMAGES) {
          generatedImages.value.splice(MAX_GENERATED_IMAGES)
        }
        currentImageIndex.value = 0

        const editLabels = {
          inpainting: '局部重绘',
          outpainting: '画布扩展',
          style_transfer: '风格迁移',
          variation: '变体生成',
        }
        ElMessage.success(`${editLabels[editType] || editType}完成！`)
        return res
      } else {
        ElMessage.warning('未返回有效的编辑结果')
        return null
      }
    } catch (error) {
      const msg = error.response?.data?.message || error.message || '编辑失败'
      ElMessage.error(msg)
      undoEdit(false)
      return null
    } finally {
      editing.value = false
    }
  }

  function undoEdit(showMsg = true) {
    if (editHistory.value.length === 0) return
    const previousState = editHistory.value.pop()
    currentImage.value = previousState.imageData
    lastEditType.value = ''

    if (showMsg) ElMessage.success('已撤销上一步操作')
  }

  function selectGalleryImage(idx) {
    if (idx >= 0 && idx < generatedImages.value.length) {
      currentImageIndex.value = idx
      currentImage.value = generatedImages.value[idx].data
      currentSize.value = generatedImages.value[idx].size
      currentProvider.value = generatedImages.value[idx].provider
      lastEditType.value = generatedImages.value[idx].editType || ''
    }
  }

  function removeImage(idx) {
    generatedImages.value.splice(idx, 1)
    if (currentImageIndex.value === idx) {
      if (generatedImages.value.length > 0) {
        selectGalleryImage(Math.max(0, idx - 1))
      } else {
        currentImage.value = ''
        currentImageIndex.value = -1
      }
    } else if (currentImageIndex.value > idx) {
      currentImageIndex.value--
    }
  }

  async function saveToGallery(data) {
    try {
      const res = await galleryApi.save({
        imageData: currentImage.value,
        prompt_text: prompt.value,
        type: lastEditType.value ? 'edited_image' : 'image',
        ...data,
      })
      ElMessage.success('已保存到作品库')
      return res
    } catch (error) {
      const msg = error.response?.data?.message || error.message || '保存失败'
      ElMessage.error(msg)
      return null
    }
  }

  function clearAll() {
    currentImage.value = ''
    currentSize.value = ''
    currentProvider.value = ''
    lastEditType.value = ''
    editHistory.value = []
    generatedImages.value = []
    currentImageIndex.value = -1
  }

  function selectType(type) {
    selectedType.value = type
    const info = templateTypes.value.find((t) => t.value === type)
    if (info?.defaultSize && !availableSizes.value.includes(imageSize.value)) {
      imageSize.value = info.defaultSize
    }
  }

  return {
    generating,
    editing,
    currentImage,
    currentSize,
    currentProvider,
    lastEditType,
    editHistory,
    generatedImages,
    currentImageIndex,
    templateTypes,
    categories,
    selectedType,
    prompt,
    imageSize,
    quality,
    style,
    batchCount,
    imageModel,
    canUndo,
    hasImage,
    availableSizes,
    ALL_IMAGE_SIZES,
    IMAGE_QUALITY_OPTIONS,
    IMAGE_STYLE_OPTIONS,
    IMAGE_MODEL_OPTIONS,
    currentModelInfo,
    currentStyleInfo,
    selectedTypeInfo,
    suggestedPrompts,
    fetchTemplates,
    fetchCategories,
    generateImage,
    batchGenerate,
    editImage,
    undoEdit,
    selectGalleryImage,
    removeImage,
    saveToGallery,
    clearAll,
    selectType,
  }
})
