<template>
  <div class="ai-content-page">
    <div class="page-header">
      <div class="breadcrumb">
        <span>首页</span>
        <el-icon>
          <ArrowRight />
        </el-icon>
        <span class="current">AI内容生成</span>
      </div>
      <h1 class="page-title">AI内容生成</h1>
    </div>

    <div class="ai-content-layout">
      <div class="main-area">
        <section class="type-selection card">
          <h3 class="section-label">
            <el-icon>
              <EditPen />
            </el-icon>
            选择内容类型
          </h3>
          <div class="type-grid">
            <div v-for="type in aiStore.contentTypes" :key="type.id" class="type-card"
              :class="{ selected: aiStore.selectedType === type.id }" @click="aiStore.setSelectedType(type.id)">
              <h4>{{ type.name }}</h4>
              <p>{{ type.desc }}</p>
            </div>
          </div>
        </section>

        <section v-if="filteredTemplates.length" class="template-section card">
          <h3 class="section-label">
            <el-icon>
              <Notebook />
            </el-icon>
            内容模板
            <el-button text size="small" @click="aiStore.clearTemplate()"
              v-if="aiStore.selectedTemplate">取消选择</el-button>
          </h3>
          <div class="template-grid">
            <div v-for="tpl in filteredTemplates" :key="tpl.id" class="template-card"
              :class="{ selected: aiStore.selectedTemplate?.id === tpl.id }" @click="selectTemplate(tpl)">
              <div class="template-icon">
                <el-icon :size="20">
                  <component :is="tpl.icon || 'Document'" />
                </el-icon>
              </div>
              <div class="template-info">
                <h4>{{ tpl.name }}</h4>
                <p>{{ tpl.description }}</p>
              </div>
            </div>
          </div>
        </section>

        <section v-if="aiStore.selectedTemplate && templateVars.length" class="template-vars card">
          <h3 class="section-label">
            <el-icon>
              <Edit />
            </el-icon>
            填写模板变量
          </h3>
          <el-row :gutter="16">
            <el-col v-for="varName in templateVars" :key="varName" :span="12">
              <div class="config-item">
                <label>{{ varName }}</label>
                <el-input v-model="aiStore.templateVariables[varName]" :placeholder="`请输入${varName}`" />
              </div>
            </el-col>
          </el-row>
        </section>

        <section class="prompt-input card">
          <h3 class="section-label">
            <el-icon>
              <ChatDotRound />
            </el-icon>
            输入创作指令
          </h3>
          <el-input v-model="aiStore.prompt" type="textarea" :rows="6"
            :placeholder="aiStore.selectedTemplate ? '模板已填充变量，也可在此补充指令...' : '请描述您想要创作的内容，越详细越好，例如：写一篇关于AI技术发展趋势的文章，要求专业但不晦涩，适合普通读者阅读，包含具体案例和数据支撑...'" />
        </section>

        <section class="config-section card">
          <h3 class="section-label">参数配置</h3>
          <el-row :gutter="24">
            <el-col :span="6">
              <div class="config-item">
                <label>AI模型</label>
                <el-select v-model="aiStore.config.model" style="width: 100%;">
                  <el-option v-for="opt in aiStore.modelOptions" :key="opt.value" :label="opt.label"
                    :value="opt.value" />
                </el-select>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="config-item">
                <label>写作风格</label>
                <el-select v-model="aiStore.config.style" style="width: 100%;">
                  <el-option v-for="opt in aiStore.styleOptions" :key="opt.value" :label="opt.label"
                    :value="opt.value" />
                </el-select>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="config-item">
                <label>内容长度</label>
                <el-select v-model="aiStore.config.length" style="width: 100%;">
                  <el-option v-for="opt in aiStore.lengthOptions" :key="opt.value" :label="opt.label"
                    :value="opt.value" />
                </el-select>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="config-item">
                <label>字数限制</label>
                <el-input v-model="aiStore.config.wordCount" placeholder="中等（500字）" />
              </div>
            </el-col>
          </el-row>

          <div class="generate-action">
            <el-button v-if="!aiStore.isGenerating" type="primary" size="large"
              :disabled="!aiStore.prompt || !aiStore.selectedType" @click="handleGenerate">
              <el-icon>
                <MagicStick />
              </el-icon>
              开始生成
            </el-button>
            <template v-else>
              <el-button type="danger" size="large" @click="stopGeneration">
                <el-icon>
                  <VideoPause />
                </el-icon>
                停止生成
              </el-button>
              <span class="generating-hint">正在生成中，请耐心等待...</span>
            </template>
          </div>
        </section>

        <section v-if="aiStore.currentContent || aiStore.isGenerating" class="result-section card">
          <div class="result-header">
            <h3 class="section-label">
              <el-icon>
                <Document />
              </el-icon>
              生成结果
              <span v-if="aiStore.generationMeta.providerName" class="meta-info">
                {{ aiStore.generationMeta.providerName }} · {{ aiStore.generationMeta.tokenCount }} tokens
              </span>
            </h3>
            <div class="result-actions">
              <el-dropdown @command="handleExport" trigger="click">
                <el-button size="small">
                  <el-icon>
                    <Download />
                  </el-icon> 导出
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="fmt in aiStore.exportFormats" :key="fmt.value" :command="fmt.value">
                      {{ fmt.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button size="small" @click="handleCopy">
                <el-icon>
                  <CopyDocument />
                </el-icon> 复制
              </el-button>
              <el-button size="small" @click="handleRegenerate">
                <el-icon>
                  <Refresh />
                </el-icon> 重新生成
              </el-button>
            </div>
          </div>
          <div class="result-content" ref="resultRef">
            <div v-if="aiStore.isGenerating && !aiStore.currentContent" class="loading-placeholder">
              <SkeletonLoader variant="detail" />
            </div>
            <div v-else class="content-text markdown-body" v-html="formattedContent"></div>
          </div>
        </section>
      </div>

      <aside class="history-sidebar">
        <div class="history-header">
          <h3>历史记录</h3>
          <el-pagination v-if="historyPagination.total > historyPagination.limit" small layout="prev, pager, next"
            :total="historyPagination.total" :page-size="historyPagination.limit" :current-page="historyPagination.page"
            @current-change="handleHistoryPageChange" class="history-pagination" />
        </div>
        <div class="history-filters">
          <el-input v-model="historySearch" placeholder="搜索历史记录" size="small" clearable @clear="fetchHistory"
            @keyup.enter="fetchHistory">
            <template #prefix><el-icon>
                <Search />
              </el-icon></template>
          </el-input>
          <!-- 类型筛选 -->
          <el-select v-model="historyTypeFilter" placeholder="全部类型" size="small" style="width: 120px"
            @change="fetchHistory">
            <el-option label="全部" value="" />
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </div>
        <div v-if="historyLoading" v-loading="historyLoading" class="history-loading" element-loading-text="加载历史记录...">
        </div>
        <div v-else-if="historyList.length === 0" class="history-empty">
          <el-empty description="暂无历史记录" :image-size="80" />
        </div>
        <div v-else class="history-list">
          <DynamicScroller class="history-scroller" :items="historyList" key-field="id" :min-item-size="100"
            :buffer="200">
            <template #default="{ item, active }">
              <DynamicScrollerItem :item="item" :active="active">
                <div class="history-item" :class="{ favorite: item.is_favorite }">
                  <div class="history-type" :class="getTypeClass(item.type)">{{ getTypeName(item.type) }}</div>
                  <div class="history-info" @click="viewHistory(item)">
                    <h4>{{ item.prompt_preview || '无标题' }}</h4>
                    <div class="history-meta">
                      <span>{{ formatTime(item.create_time) }}</span>
                      <span>{{ item.token_count || 0 }} tokens</span>
                      <span v-if="item.generation_time_ms">{{ (item.generation_time_ms / 1000).toFixed(1) }}s</span>
                    </div>
                  </div>
                  <div class="history-actions">
                    <el-button text size="small" @click="toggleFavorite(item)">
                      <el-icon :color="item.is_favorite ? '#E6A23C' : ''">
                        <Star />
                      </el-icon>
                    </el-button>
                    <el-button text size="small" @click="viewHistory(item)">
                      <el-icon>
                        <View />
                      </el-icon>
                    </el-button>
                    <el-button text size="small" type="danger" @click="deleteHistory(item.id)">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
              </DynamicScrollerItem>
            </template>
          </DynamicScroller>
        </div>
      </aside>
    </div>

    <el-dialog v-model="historyDialogVisible" :title="historyDialogTitle" width="700px" class="history-dialog">
      <div v-if="historyDialogContent" class="history-dialog-content markdown-body"
        v-html="renderMarkdown(historyDialogContent)"></div>
      <template #footer>
        <el-button @click="handleCopyText(historyDialogContent)">复制内容</el-button>
        <el-button type="primary" @click="historyDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAIStore } from '@/stores/modules/ai'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Marked } from 'marked'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { aiApi } from '@/api/ai'
import { eventBus } from '@/utils/eventBus'

const aiStore = useAIStore()
const resultRef = ref(null)
const historyTypeFilter = ref('')
const abortController = ref(null)

const historyList = ref([])
const historyLoading = ref(false)
const historySearch = ref('')
const historyPagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const historyDialogVisible = ref(false)
const historyDialogTitle = ref('')
const historyDialogContent = ref('')


const marked = new Marked({
  gfm: true,
  breaks: true,
})

function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
}

function renderMarkdown(text) {
  if (!text) return ''
  try {
    const raw = marked.parse(text)
    return sanitizeHtml(raw)
  } catch {
    return text.replace(/</g, '&lt;').replace(/\n/g, '<br>')
  }
}

const formattedContent = computed(() => {
  return renderMarkdown(aiStore.currentContent)
})

const filteredTemplates = computed(() => {
  if (!aiStore.selectedType) return aiStore.contentTemplates
  return aiStore.contentTemplates.filter((t) => t.type === aiStore.selectedType)
})

const templateVars = computed(() => {
  if (!aiStore.selectedTemplate?.variables) return []
  try {
    return Array.isArray(aiStore.selectedTemplate.variables)
      ? aiStore.selectedTemplate.variables
      : JSON.parse(aiStore.selectedTemplate.variables || '[]')
  } catch {
    return []
  }
})

const typeMap = {
  article: { name: '文章写作', class: 'article' },
  marketing: { name: '营销文案', class: 'marketing' },
  social: { name: '社交媒体', class: 'social' },
  summary: { name: '报告总结', class: 'summary' },
  business: { name: '商务邮件', class: 'business' },
  creative: { name: '创意写作', class: 'creative' },
  code_generate: { name: '代码生成', class: 'code' },
  image: { name: '图片生成', class: 'image' },
}

function getTypeName(type) {
  return typeMap[type]?.name || type || '其他'
}

function getTypeClass(type) {
  return typeMap[type]?.class || 'article'
}

const typeOptions = Object.entries(typeMap).map(([value, info]) => ({
  value,
  label: info.name,
}))

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

async function fetchTemplates() {
  try {
    const res = await aiApi.getContentTemplates({ type: aiStore.selectedType || undefined })
    aiStore.setContentTemplates(res?.templates || [])
  } catch {
    // ignore
  }
}

watch(() => aiStore.selectedType, () => {
  fetchTemplates()
})

async function selectTemplate(tpl) {
  if (aiStore.selectedTemplate?.id === tpl.id) {
    aiStore.clearTemplate()
  } else {
    aiStore.setSelectedTemplate(tpl)
  }
}

async function fetchHistory(page = 1) {
  historyLoading.value = true
  try {
    const res = await aiApi.getHistory({
      page,
      limit: historyPagination.value.limit,
      search: historySearch.value || undefined,
      type: historyTypeFilter.value || undefined,
    })

    historyList.value = res?.items || []
    historyPagination.value = {
      ...historyPagination.value,
      ...res?.pagination,
      page: res?.pagination?.page || page,
    }
  } catch (error) {
    if (error.response?.status !== 500) {
      console.error('获取历史记录失败:', error)
    } else if (error.response?.status === 401) {
      ElMessage.error('登录过期，请重新登录')
    } else {
      console.error('获取历史记录失败:', error)
    }
    historyList.value = []
    historyPagination.value = { ...historyPagination.value, total: 0, totalPages: 0 }
  } finally {
    historyLoading.value = false
  }
}

function handleHistoryPageChange(page) {
  fetchHistory(page)
}

async function deleteHistory(id) {
  try {
    await ElMessageBox.confirm('确定要删除这条历史记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await aiApi.deleteHistory(id)
    ElMessage.success('删除成功')
    fetchHistory(historyPagination.value.page)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除历史记录失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

async function toggleFavorite(item) {
  try {
    const res = await aiApi.toggleFavorite(item.id)
    item.is_favorite = res?.isFavorite ? 1 : 0
    ElMessage.success(res?.message || '操作成功')
  } catch {
    ElMessage.error('操作失败')
  }
}

async function viewHistory(item) {
  try {
    const res = await aiApi.getHistoryDetail(item.id)
    historyDialogTitle.value = item.prompt_preview || '历史记录详情'
    historyDialogContent.value = res?.result || ''
    historyDialogVisible.value = true
  } catch {
    ElMessage.error('加载详情失败')
  }
}

onMounted(() => {
  fetchHistory()
  fetchTemplates()
})

async function handleGenerate() {
  const finalPrompt = aiStore.resolvedPrompt || aiStore.prompt
  if (!finalPrompt || !aiStore.selectedType) {
    ElMessage.warning('请选择内容类型并输入创作指令')
    return
  }

  aiStore.setGenerating(true)
  aiStore.clearContent()

  abortController.value = new AbortController()

  const timeoutId = setTimeout(() => {
    abortController.value?.abort()
    ElMessage.warning('生成超时（120秒），已自动停止')
  }, 120000)

  try {
    const userStore = (await import('@/stores/modules/user')).useUserStore()
    const token = userStore.token
    const generationStart = performance.now()
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: aiStore.selectedType,
        prompt: finalPrompt,
        style: aiStore.config.style,
        length: aiStore.config.length,
        wordCount: parseInt(aiStore.config.wordCount) || 500,
        model: aiStore.config.model || undefined,
      }),
      signal: abortController.value.signal,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      if (abortController.value?.signal.aborted) break

      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'meta') {
              aiStore.setGenerationMeta({
                provider: data.provider,
                providerName: data.providerName,
                model: data.model,
              })
            } else if (data.type === 'chunk' && data.content) {
              aiStore.setCurrentContent(aiStore.currentContent + data.content)
              if (resultRef.value) {
                resultRef.value.scrollTop = resultRef.value.scrollHeight
              }
            } else if (data.type === 'done') {
              aiStore.setGenerationMeta({ tokenCount: data.tokenCount })
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }

    if (!abortController.value.signal.aborted) {
      const generationTimeMs = Math.round(performance.now() - generationStart)

      aiStore.addHistory({
        type: aiStore.selectedType,
        prompt: finalPrompt,
        result: aiStore.currentContent,
      })

      try {
        await aiApi.saveHistory({
          type: aiStore.selectedType,
          prompt: finalPrompt,
          result: aiStore.currentContent,
          style: aiStore.config.style,
          length_type: aiStore.config.length,
          word_count: parseInt(aiStore.config.wordCount) || 500,
          model_used: aiStore.generationMeta.model || aiStore.config.model || null,
          provider: aiStore.generationMeta.provider || null,
          token_count: aiStore.generationMeta.tokenCount || 0,
          generation_time_ms: generationTimeMs,
        })
      } catch {
        console.warn('历史记录保存到后端失败，已保留在本地')
      }

      ElMessage.success('内容生成完成！')
      fetchHistory()
      eventBus.emit(eventBus.events.AI_OPERATION_COMPLETED, { type: 'content' })
      eventBus.emit(eventBus.events.HISTORY_REFRESH_REQUIRED)
      eventBus.emit(eventBus.events.STATISTICS_REFRESH_REQUIRED)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      if (!aiStore.currentContent) {
        ElMessage.info('已取消生成')
      }
    } else if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed'))) {
      ElMessage.error('无法连接到服务器，请检查网络连接或后端服务是否启动')
    } else {
      console.error('AI generation failed:', error)
      if (error.message.includes('401')) {
        ElMessage.error('登录已过期，请重新登录')
      } else if (error.message.includes('429')) {
        ElMessage.error('操作过于频繁，请稍后再试')
      } else {
        ElMessage.error(`生成失败：${error.message}`)
      }
    }
  } finally {
    clearTimeout(timeoutId)
    abortController.value = null
    aiStore.setGenerating(false)
  }
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort()
    ElMessage.info('正在停止生成...')
  }
}

function handleCopy() {
  navigator.clipboard.writeText(aiStore.currentContent)
  ElMessage.success('已复制到剪贴板')
}

function handleCopyText(text) {
  navigator.clipboard.writeText(text)
  ElMessage.success('已复制到剪贴板')
}

function handleRegenerate() {
  handleGenerate()
}

async function handleExport(format) {
  try {
    const { useUserStore } = await import('@/stores/modules/user')
    const token = useUserStore().token
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/ai/export`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: aiStore.currentContent,
        format,
        title: `AI生成内容_${new Date().toLocaleDateString('zh-CN')}`,
      }),
    })

    if (!response.ok) {
      throw new Error('导出失败')
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `AI生成内容.${format}`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/)
      if (match) filename = decodeURIComponent(match[1])
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败，请重试')
  }
}
</script>

<style lang="scss" scoped>
.ai-content-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;

  .breadcrumb {
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .current {
      color: var(--color-primary);
    }
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }
}

.ai-content-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  align-items: start;
  /* 防止右侧列被左侧内容撑高 */
}

.card {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-light);
  margin-bottom: 20px;
  transition: background-color var(--transition-duration) var(--transition-ease);
}

.section-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 8px;

  .meta-info {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 8px;
  }
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  .type-card {
    border: 2px solid var(--border-light);
    border-radius: 8px;
    padding: 18px 16px;
    cursor: pointer;
    transition: all 0.3s;
    text-align: left;

    &:hover {
      border-color: var(--text-placeholder);
      box-shadow: var(--shadow-light);
    }

    &.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-light-9);

      h4 {
        color: var(--color-primary);
      }
    }

    h4 {
      font-size: 15px;
      color: var(--text-primary);
      margin: 0 0 6px;
      font-weight: 600;
    }

    p {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
    }
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;

  .template-card {
    display: flex;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: var(--text-placeholder);
      background: var(--fill-light);
    }

    &.selected {
      border-color: var(--color-primary);
      background: var(--color-primary-light-9);
    }

    .template-icon {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--color-primary-light-9);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary);
      flex-shrink: 0;
    }

    .template-info {
      h4 {
        font-size: 14px;
        color: var(--text-primary);
        margin: 0 0 4px;
        font-weight: 600;
      }

      p {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.4;
      }
    }
  }
}

.config-item {
  label {
    display: block;
    font-size: 14px;
    color: var(--text-regular);
    margin-bottom: 8px;
    font-weight: 500;
  }
}

.generate-action {
  margin-top: 24px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;

  .el-button {
    min-width: 200px;
    height: 46px;
    font-size: 16px;
  }

  .generating-hint {
    color: var(--text-secondary);
    font-size: 14px;
    animation: pulse 1.5s ease-in-out infinite;
  }
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.result-section {
  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .section-label {
      margin: 0;
    }

    .result-actions {
      display: flex;
      gap: 8px;
    }
  }

  .result-content {
    min-height: 300px;
    max-height: 600px;
    overflow-y: auto;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    padding: 20px;
    background: var(--fill-lighter);

    .loading-placeholder {
      text-align: center;
      padding: 60px 0;
      color: var(--text-secondary);

      p {
        margin-top: 12px;
      }
    }

    .content-text {
      line-height: 1.8;
      color: var(--text-primary);
      font-size: 15px;

      :deep(h1) {
        font-size: 24px;
        margin: 20px 0 12px;
        color: var(--text-primary);
        border-bottom: 1px solid var(--border-lighter);
        padding-bottom: 8px;
      }

      :deep(h2) {
        font-size: 22px;
        margin: 20px 0 12px;
        color: var(--text-primary);
      }

      :deep(h3) {
        font-size: 18px;
        margin: 16px 0 10px;
        color: var(--text-primary);
      }

      :deep(strong) {
        color: var(--color-primary);
      }

      :deep(ul),
      :deep(ol) {
        margin: 12px 0;
        padding-left: 24px;

        li {
          margin: 6px 0;
        }
      }

      :deep(blockquote) {
        border-left: 4px solid var(--color-primary);
        padding: 10px 20px;
        margin: 16px 0;
        background: var(--fill-light);
        color: var(--text-regular);
      }

      :deep(code) {
        background: var(--fill-base);
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 14px;
      }

      :deep(pre) {
        background: #2d2d2d;
        color: #ccc;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
      }

      :deep(pre code) {
        background: none;
        color: inherit;
      }

      :deep(table) {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }

      :deep(th),
      :deep(td) {
        border: 1px solid var(--border-color);
        padding: 8px 12px;
        text-align: left;
      }

      :deep(th) {
        background: var(--fill-base);
        font-weight: 600;
      }
    }
  }
}

.history-sidebar {
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  height: calc(100vh - 140px);
  /* max-height → height，强制固定高度 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: sticky;
  top: 80px;
  align-self: start;
  /* grid 中不被拉伸 */
  transition: background-color var(--transition-duration) var(--transition-ease);

  .history-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border-lighter);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
  }

  .history-filters {
    padding: 12px 20px 0;
    display: flex;
    /* 让搜索框和筛选下拉框横向排列 */
    flex-wrap: wrap;
    /* 允许换行 */
    gap: 8px;
    /* 统一间距 */
    align-items: center;
  }

  .history-loading,
  .history-empty {
    padding: 40px 20px;
  }

  .history-list {
    padding: 12px;
    flex: 1;
    min-height: 0;

    .history-scroller {
      height: 100%;
    }

    .history-item {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 0.3s;
      margin-bottom: 8px;

      &:hover {
        background: var(--fill-light);
      }

      &.favorite {
        background: #FDF6EC;
      }

      .history-type {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        width: fit-content;

        &.article {
          background: #E8F5E9;
          color: #67C23A;
        }

        &.marketing {
          background: #FFF3E0;
          color: #E6A23C;
        }

        &.social {
          background: #E3F2FD;
          color: #409EFF;
        }

        &.summary {
          background: #FCE4EC;
          color: #F56C6C;
        }

        &.business {
          background: #E8EAF6;
          color: #7B68EE;
        }

        &.creative {
          background: #F3E5F5;
          color: #9C27B0;
        }

        &.code {
          background: #E0F7FA;
          color: #00BCD4;
        }

        &.image {
          background: #FFF8E1;
          color: #FF9800;
        }
      }

      .history-info {
        h4 {
          font-size: 14px;
          color: var(--text-primary);
          margin: 0 0 4px;
          font-weight: 500;
        }

        .history-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .history-actions {
        display: flex;
        justify-content: flex-end;
        gap: 4px;
      }
    }
  }
}

.history-dialog {
  .history-dialog-content {
    max-height: 500px;
    overflow-y: auto;
    padding: 16px;
    line-height: 1.8;
    font-size: 15px;
  }
}

@media (max-width: 1024px) {
  .ai-content-layout {
    grid-template-columns: 1fr;
  }

  .history-sidebar {
    position: static;
  }
}

@media (max-width: 768px) {
  .ai-content-page {
    padding: 12px;
  }

  .type-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;

    .type-card {
      padding: 14px 12px;
    }
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .config-section {
    :deep(.el-col) {
      max-width: 100% !important;
      flex: 0 0 100% !important;
      margin-bottom: 12px;
    }
  }

  .generate-action {
    .el-button {
      min-width: 160px;
      height: 40px;
      font-size: 14px;
    }
  }
}
</style>
