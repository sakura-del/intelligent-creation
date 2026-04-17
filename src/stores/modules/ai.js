import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAIStore = defineStore('ai', () => {
  const histories = ref([])
  const currentContent = ref('')
  const isGenerating = ref(false)
  const selectedType = ref('')
  const prompt = ref('')
  const config = ref({
    style: 'professional',
    length: 'medium',
    wordCount: 500,
    model: '',
  })
  const generationMeta = ref({
    provider: '',
    providerName: '',
    model: '',
    tokenCount: 0,
  })
  const contentTemplates = ref([])
  const selectedTemplate = ref(null)
  const templateVariables = ref({})

  const contentTypes = ref([
    { id: 'article', name: '文章写作', icon: 'Document', desc: '论文、报告、博客' },
    { id: 'marketing', name: '营销文案', icon: 'Promotion', desc: '广告、产品描述' },
    { id: 'social', name: '社交媒体', icon: 'ChatDotRound', desc: '微博、公众号、小红书' },
    { id: 'summary', name: '报告总结', icon: 'Notebook', desc: '工作总结、分析报告' },
    { id: 'business', name: '商务邮件', icon: 'Message', desc: '正式邮件、商务沟通' },
    { id: 'creative', name: '创意写作', icon: 'MagicStick', desc: '故事、诗歌、文案' },
  ])

  const modelOptions = ref([
    { label: '自动选择', value: '' },
    { label: 'DeepSeek', value: 'deepseek' },
    { label: '通义千问', value: 'qwen' },
    { label: '字节豆包', value: 'doubao' },
    { label: '智谱GLM', value: 'glm' },
  ])

  const styleOptions = [
    { label: '专业正式', value: 'professional' },
    { label: '轻松活泼', value: 'casual' },
    { label: '学术严谨', value: 'academic' },
    { label: '创意文艺', value: 'creative' },
  ]

  const lengthOptions = [
    { label: '简短（100字）', value: 'short', max: 100 },
    { label: '中等（500字）', value: 'medium', max: 500 },
    { label: '长篇（1000字）', value: 'long', max: 1000 },
  ]

  const exportFormats = [
    { label: '纯文本', value: 'txt', icon: 'Document' },
    { label: 'HTML', value: 'html', icon: 'Monitor' },
    { label: 'Markdown', value: 'md', icon: 'EditPen' },
  ]

  const recentHistories = computed(() => histories.value.slice(0, 10))

  const resolvedPrompt = computed(() => {
    if (!selectedTemplate.value) return prompt.value

    let resolved = selectedTemplate.value.prompt_template
    if (selectedTemplate.value.variables) {
      const vars = Array.isArray(selectedTemplate.value.variables)
        ? selectedTemplate.value.variables
        : JSON.parse(selectedTemplate.value.variables || '[]')

      vars.forEach((varName) => {
        const value = templateVariables.value[varName] || `{{${varName}}}`
        resolved = resolved.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value)
      })
    }

    return resolved
  })

  function setSelectedType(type) {
    selectedType.value = type
  }

  function setPrompt(value) {
    prompt.value = value
  }

  function setConfig(key, value) {
    config.value[key] = value
  }

  function setCurrentContent(content) {
    currentContent.value = content
  }

  function setGenerating(status) {
    isGenerating.value = status
  }

  function appendContent(chunk) {
    currentContent.value += chunk
  }

  function clearContent() {
    currentContent.value = ''
    generationMeta.value = { provider: '', providerName: '', model: '', tokenCount: 0 }
  }

  function setGenerationMeta(meta) {
    generationMeta.value = { ...generationMeta.value, ...meta }
  }

  function addHistory(history) {
    histories.value.unshift({
      ...history,
      id: Date.now(),
      createTime: new Date().toISOString(),
    })
  }

  function setSelectedTemplate(template) {
    selectedTemplate.value = template
    templateVariables.value = {}

    if (template?.variables) {
      const vars = Array.isArray(template.variables)
        ? template.variables
        : JSON.parse(template.variables || '[]')
      vars.forEach((v) => {
        templateVariables.value[v] = ''
      })
    }
  }

  function setTemplateVariable(name, value) {
    templateVariables.value[name] = value
  }

  function clearTemplate() {
    selectedTemplate.value = null
    templateVariables.value = {}
  }

  function setContentTemplates(templates) {
    contentTemplates.value = templates
  }

  return {
    histories,
    currentContent,
    isGenerating,
    selectedType,
    prompt,
    config,
    contentTypes,
    modelOptions,
    styleOptions,
    lengthOptions,
    exportFormats,
    recentHistories,
    generationMeta,
    contentTemplates,
    selectedTemplate,
    templateVariables,
    resolvedPrompt,
    setSelectedType,
    setPrompt,
    setConfig,
    setCurrentContent,
    setGenerating,
    appendContent,
    clearContent,
    setGenerationMeta,
    addHistory,
    setSelectedTemplate,
    setTemplateVariable,
    clearTemplate,
    setContentTemplates,
  }
})
