﻿﻿﻿﻿﻿<template>
  <div class="app-builder-page">
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb">
          <span>首页</span>
          <el-icon>
            <ArrowRight />
          </el-icon>
          <span class="current">无代码应用</span>
        </div>
        <h1 class="page-title">🛠️ 无代码应用构建器</h1>
      </div>
      <div class="header-right">
        <el-button @click="showAIGenerate = true" type="warning" plain>
          🤖 AI生成
        </el-button>
        <el-button @click="handleSave" type="primary" :loading="isSaving">
          💾 保存
        </el-button>
        <el-button @click="handlePreview" :disabled="components.length === 0">
          👁️ 预览
        </el-button>
        <el-button @click="handleExportCode" :disabled="components.length === 0" type="success" plain>
          📦 导出代码
        </el-button>
        <el-button @click="handleDeploy" :disabled="!currentAppId" type="success">
          🚀 发布
        </el-button>
        <el-button @click="showMyApps = true" plain>
          📂 我的应用 ({{ appCount }})
        </el-button>
      </div>
    </div>

    <div class="builder-workspace">
      <ComponentPanel @drag-start="onDragStart" @drag-end="onDragEnd" />

      <CanvasArea :components="components" :selected-id="selectedId" :component-count="componentCount"
        :can-undo="canUndo" :can-redo="canRedo" @select="selectComponent" @deselect="deselectComponent"
        @drop="onCanvasDrop" @undo="undo" @redo="redo" @clear="clearCanvas" />

      <PropertyPanel :selected-component="selectedComponent" @update-props="updateComponentProps"
        @delete="deleteComponent" @duplicate="duplicateComp" />
    </div>

    <el-dialog v-model="showAIGenerate" title="🤖 AI 生成应用" width="600px" :close-on-click-modal="false">
      <el-form label-width="80px">
        <el-form-item label="应用名称">
          <el-input v-model="aiForm.name" placeholder="输入应用名称..." />
        </el-form-item>
        <el-form-item label="需求描述">
          <el-input v-model="aiForm.description" type="textarea" :rows="5"
            placeholder="描述您想要的应用，例如：我需要一个员工考勤管理系统，包含员工信息录入、每日打卡记录、月度统计报表功能..." />
        </el-form-item>
        <div class="ai-quick-tags">
          <span class="tag-label">快速选择：</span>
          <el-tag v-for="tag in quickTags" :key="tag" effect="plain" class="quick-tag"
            @click="aiForm.description = tag">
            {{ tag }}
          </el-tag>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showAIGenerate = false">取消</el-button>
        <el-button type="primary" @click="handleAIGenerate" :loading="isAIGenerating"
          :disabled="!aiForm.description || aiForm.description.length < 10">
          {{ isAIGenerating ? '⏳ AI生成中...' : '🚀 开始生成' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPreview" title="👁️ 应用预览" width="90%" top="3vh" :close-on-click-modal="false">
      <div class="preview-container">
        <div class="preview-toolbar">
          <el-radio-group v-model="previewDevice" size="small">
            <el-radio-button value="desktop">🖥️ 桌面</el-radio-button>
            <el-radio-button value="tablet">📱 平板</el-radio-button>
            <el-radio-button value="mobile">📲 手机</el-radio-button>
          </el-radio-group>
        </div>
        <div class="preview-frame-wrapper">
          <iframe ref="previewFrame" :class="previewDevice" class="preview-iframe" frameborder="0"
            sandbox="allow-scripts allow-same-origin" />
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showExportCode" title="📦 导出代码" width="700px">
      <div class="export-content">
        <el-tabs v-model="exportTab">
          <el-tab-pane label="Vue 模板" name="vue">
            <div class="code-block">
              <pre>{{ generatedVueCode }}</pre>
            </div>
          </el-tab-pane>
          <el-tab-pane label="JSON 结构" name="json">
            <div class="code-block">
              <pre>{{ generatedJSON }}</pre>
            </div>
          </el-tab-pane>
        </el-tabs>
        <div class="export-actions">
          <el-button type="primary" @click="copyCode">📋 复制代码</el-button>
          <el-button @click="downloadCode">⬇️ 下载文件</el-button>
        </div>
      </div>
    </el-dialog>

    <el-drawer v-model="showMyApps" title="📂 我的应用" direction="rtl" size="420px">
      <div class="my-apps-content">
        <div v-if="isLoadingApps" style="text-align: center; padding: 40px;">
          <el-icon class="is-loading" :size="32">
            <Loading />
          </el-icon>
          <p style="color: var(--text-secondary);">加载中...</p>
        </div>

        <div v-else-if="myApps.length === 0" style="text-align: center; padding: 40px;">
          <el-empty description="暂无保存的应用" :image-size="80">
            <el-button type="primary" size="small" @click="handleSave">保存当前应用</el-button>
          </el-empty>
        </div>

        <div v-else>
          <div v-for="app in myApps" :key="app.id" class="app-card" :class="{ active: currentAppId === app.id }"
            @click="handleLoadApp(app)">
            <div class="app-card-header">
              <h4>{{ app.name || '未命名应用' }}</h4>
              <el-tag size="small" :type="getStatusType(app.status)">{{ getStatusLabel(app.status) }}</el-tag>
            </div>
            <p class="app-card-desc">{{ app.description || '无描述' }}</p>
            <div class="app-card-meta">
              <span>{{ formatTime(app.update_time || app.create_time) }}</span>
            </div>
            <div class="app-card-actions">
              <el-button size="small" text type="primary" @click.stop="handleLoadApp(app)">打开</el-button>
              <el-button size="small" text type="danger" @click.stop="handleDeleteApp(app.id)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="showDeploy" title="🚀 发布应用" width="500px">
      <div class="deploy-content">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #title>发布后应用将可通过公开链接访问</template>
        </el-alert>
        <el-form label-width="80px">
          <el-form-item label="应用名称">
            <el-input v-model="deployForm.name" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="deployForm.description" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>
        <div v-if="deployResult" class="deploy-result">
          <el-result icon="success" title="发布成功" :sub-title="`应用已发布到: ${deployResult.deployUrl}`">
            <template #extra>
              <el-button type="primary" @click="copyDeployUrl">📋 复制链接</el-button>
              <el-button @click="window.open(deployResult.deployUrl)">🔗 打开应用</el-button>
            </template>
          </el-result>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDeploy = false">关闭</el-button>
        <el-button v-if="!deployResult" type="success" @click="confirmDeploy" :loading="isDeploying">
          🚀 确认发布
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Loading } from '@element-plus/icons-vue'
import ComponentPanel from './components/ComponentPanel.vue'
import CanvasArea from './components/CanvasArea.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import { useAppCanvas } from './composables/useAppCanvas.js'
import { appApi } from '@/api/app'

const route = useRoute()

const {
  components,
  selectedId,
  selectedComponent,
  canUndo,
  canRedo,
  startDrag,
  endDrag,
  selectComponent,
  addComponentToCanvas,
  deleteComponent,
  updateComponentProps,
  duplicateComp,
  clearCanvas,
  handleDrop,
  undo,
  redo,
  exportSchema,
  importSchema,
  generateCode,
  countComponents,
} = useAppCanvas()

const componentCount = computed(() => countComponents(components.value))

const isSaving = ref(false)
const currentAppId = ref(null)
const showAIGenerate = ref(false)
const isAIGenerating = ref(false)
const showPreview = ref(false)
const showExportCode = ref(false)
const showMyApps = ref(false)
const showDeploy = ref(false)
const isLoadingApps = ref(false)
const isDeploying = ref(false)
const deployResult = ref(null)
const previewDevice = ref('desktop')
const previewFrame = ref(null)
const exportTab = ref('vue')
const appCount = ref(0)
const myApps = ref([])

const aiForm = ref({ name: '', description: '' })
const quickTags = ['员工管理系统', '订单管理', '数据报表', '知识库', 'CRM客户管理', '项目管理']
const deployForm = ref({ name: '', description: '' })

const generatedVueCode = computed(() => generateCode())
const generatedJSON = computed(() => JSON.stringify(exportSchema(), null, 2))

function onDragStart(event, comp) {
  startDrag(event, comp)
}

function onDragEnd() {
  endDrag()
}

function onCanvasDrop(event) {
  handleDrop(event)
}

function deselectComponent() {
  selectComponent(null)
}

async function handleSave() {
  isSaving.value = true
  try {
    const schema = exportSchema()
    const code = generateCode()
    const data = {
      id: currentAppId.value || undefined,
      name: currentAppId.value ? undefined : '未命名应用',
      description: '',
      structure: schema,
      code,
    }

    const res = await appApi.saveStructure(data)
    if (res?.id && !currentAppId.value) {
      currentAppId.value = res.id
    }
    ElMessage.success('✅ 保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

function handlePreview() {
  showPreview.value = true
  setTimeout(() => {
    if (previewFrame.value) {
      const html = generatePreviewHTML()
      const blob = new Blob([html], { type: 'text/html;charset=UTF-8' })
      previewFrame.value.src = URL.createObjectURL(blob)
    }
  }, 100)
}

function generatePreviewHTML() {
  const vueCode = generateCode()
  const escapedCode = vueCode.replace(/`/g, '\\`').replace(/\$/g, '\\$')
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>应用预览</title>\n' +
    '  <link rel="stylesheet" href="https://unpkg.com/element-plus/dist/index.css">\n' +
    '  <style>\n' +
    '    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg-color); }\n' +
    '    .app-page { max-width: 1200px; margin: 0 auto; background: var(--bg-white); border-radius: 8px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }\n' +
    '    table { width: 100%; border-collapse: collapse; }\n' +
    '    th, td { padding: 10px 12px; border-bottom: 1px solid var(--border-lighter); text-align: left; font-size: 13px; }\n' +
    '    th { background: var(--bg-color); font-weight: 600; color: var(--text-secondary); }\n' +
    '    td { color: var(--text-regular); }\n' +
    '    .el-button { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer; border: 1px solid #dcdfe6; background: var(--bg-white); color: var(--text-regular); }\n' +
    '    .el-button--primary { background: #409eff; border-color: var(--color-primary); color: #fff; }\n' +
    '    .el-button--success { background: #67c23a; border-color: var(--color-success); color: #fff; }\n' +
    '    .el-button--warning { background: #e6a23c; border-color: var(--color-warning); color: #fff; }\n' +
    '    .el-button--danger { background: #f56c6c; border-color: var(--color-danger); color: #fff; }\n' +
    '    .el-button--info { background: #909399; border-color: var(--text-secondary); color: #fff; }\n' +
    '    .el-button--small { padding: 5px 11px; font-size: 12px; }\n' +
    '    .el-button--large { padding: 12px 20px; font-size: 16px; }\n' +
    '    .el-button.is-plain { background: transparent; }\n' +
    '    .el-button.is-round { border-radius: 20px; }\n' +
    '    .el-button.is-disabled { opacity: 0.6; cursor: not-allowed; }\n' +
    '  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div id="app"></div>\n' +
    '  <script>\n' +
    "    document.getElementById('app').innerHTML = `" + escapedCode + "`;\n" +
    '  <' + '/script>\n' +
    '</body>\n</html>'
}

function handleExportCode() {
  showExportCode.value = true
}

function copyCode() {
  const code = exportTab.value === 'vue' ? generatedVueCode.value : generatedJSON.value
  navigator.clipboard.writeText(code).then(() => {
    ElMessage.success('✅ 代码已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function downloadCode() {
  const code = exportTab.value === 'vue' ? generatedVueCode.value : generatedJSON.value
  const filename = exportTab.value === 'vue' ? 'AppPage.vue' : 'app-structure.json'
  const blob = new Blob([code], { type: 'text/plain;charset=UTF-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('✅ 文件下载成功')
}

async function handleAIGenerate() {
  if (!aiForm.value.description || aiForm.value.description.length < 10) {
    ElMessage.warning('请提供详细的应用需求描述（至少10个字符）')
    return
  }

  isAIGenerating.value = true
  try {
    const res = await appApi.generate({ description: aiForm.value.description })
    if (res) {
      if (res.structure?.components) {
        importSchema({ version: '1.0', components: res.structure.components })
      }
      if (res.id) currentAppId.value = res.id
      ElMessage.success('✅ AI生成成功！')
      showAIGenerate.value = false
      aiForm.value = { name: '', description: '' }
    }
  } catch (error) {
    console.error('AI生成失败:', error)
    ElMessage.error('AI生成失败：' + (error.message || '未知错误'))
  } finally {
    isAIGenerating.value = false
  }
}

function handleDeploy() {
  if (!currentAppId.value) {
    ElMessage.warning('请先保存应用')
    return
  }
  deployForm.value = { name: '', description: '' }
  deployResult.value = null
  showDeploy.value = true
}

async function confirmDeploy() {
  isDeploying.value = true
  try {
    const res = await appApi.deploy(currentAppId.value)
    deployResult.value = res
    ElMessage.success('✅ 发布成功！')
  } catch (error) {
    console.error('发布失败:', error)
    ElMessage.error('发布失败：' + (error.message || '未知错误'))
  } finally {
    isDeploying.value = false
  }
}

function copyDeployUrl() {
  if (deployResult.value?.deployUrl) {
    navigator.clipboard.writeText(deployResult.value.deployUrl).then(() => {
      ElMessage.success('✅ 链接已复制')
    })
  }
}

async function fetchMyApps() {
  isLoadingApps.value = true
  try {
    const res = await appApi.getList()
    if (Array.isArray(res)) {
      myApps.value = res
      appCount.value = res.length
    } else if (res?.items || res?.list || res?.data) {
      myApps.value = res.items || res.list || res.data || []
      appCount.value = res.pagination?.total || myApps.value.length
    }
  } catch (error) {
    console.error('获取应用列表失败:', error)
  } finally {
    isLoadingApps.value = false
  }
}

async function handleLoadApp(app) {
  try {
    const res = await appApi.getDetail(app.id)
    if (res?.structure) {
      let structure = res.structure
      if (typeof structure === 'string') {
        try { structure = JSON.parse(structure) }
        catch { structure = {} }
      }
      if (structure?.components) {
        importSchema({ version: '1.0', components: structure.components })
      }
      currentAppId.value = app.id
      ElMessage.success(`已加载应用：${app.name}`)
      showMyApps.value = false
    }
  } catch (error) {
    console.error('加载应用失败:', error)
    ElMessage.error('加载应用失败')
  }
}

async function handleDeleteApp(appId) {
  try {
    await ElMessageBox.confirm('确定要删除这个应用吗？', '确认删除', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await appApi.delete(appId)
    myApps.value = myApps.value.filter(a => a.id !== appId)
    appCount.value = myApps.value.length
    if (currentAppId.value === appId) currentAppId.value = null
    ElMessage.success('应用已删除')
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败')
  }
}

function getStatusType(status) {
  const map = { draft: 'info', generating: 'warning', ready: 'success', deployed: 'success', failed: 'danger' }
  return map[status] || 'info'
}

function getStatusLabel(status) {
  const map = { draft: '草稿', generating: '生成中', ready: '就绪', deployed: '已发布', failed: '失败' }
  return map[status] || status
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

watch(showMyApps, (val) => {
  if (val) fetchMyApps()
})

onMounted(() => {
  if (route.query.id) {
    appApi.getDetail(route.query.id).then(res => {
      if (res?.structure) {
        let structure = res.structure
        if (typeof structure === 'string') {
          try { structure = JSON.parse(structure) }
          catch { structure = {} }
        }
        if (structure?.components) {
          importSchema({ version: '1.0', components: structure.components })
        }
        currentAppId.value = parseInt(route.query.id)
      }
    }).catch(() => { })
  }
  fetchMyApps()
})
</script>

<style scoped>
.app-builder-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--fill-base);
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.breadcrumb .current {
  color: var(--color-primary);
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.builder-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ai-quick-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.ai-quick-tags .tag-label {
  color: var(--text-secondary);
  font-size: 13px;
}

.ai-quick-tags .quick-tag {
  cursor: pointer;
}

.preview-container {
  display: flex;
  flex-direction: column;
  height: 75vh;
}

.preview-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: center;
}

.preview-frame-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  background: var(--fill-base);
  padding: 16px;
  overflow: auto;
}

.preview-iframe {
  background: var(--bg-white);
  border: none;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: width 0.3s;
}

.preview-iframe.desktop {
  width: 100%;
  height: 100%;
}

.preview-iframe.tablet {
  width: 768px;
  height: 1024px;
}

.preview-iframe.mobile {
  width: 375px;
  height: 812px;
}

.export-content {
  max-height: 60vh;
  overflow-y: auto;
}

.code-block {
  background: #1e1e1e;
  color: var(--text-placeholder);
  padding: 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.export-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.my-apps-content {
  padding: 8px 0;
}

.app-card {
  background: var(--fill-lighter);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.app-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.app-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
}

.app-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.app-card-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.app-card-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.app-card-meta {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-bottom: 8px;
}

.app-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--border-lighter);
}

.deploy-content {
  padding: 8px 0;
}

.deploy-result {
  margin-top: 16px;
}
</style>
