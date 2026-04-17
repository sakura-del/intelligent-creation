﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="version-history">
    <div class="version-header">
      <h3>📜 版本历史</h3>
      <el-button size="small" type="primary" @click="handleCreateVersion" :loading="isCreating">
        💾 保存版本
      </el-button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="versions.length === 0" class="empty-state">
      <el-empty description="暂无版本记录" :image-size="80">
        <el-button type="primary" size="small" @click="handleCreateVersion">保存当前版本</el-button>
      </el-empty>
    </div>

    <div v-else class="version-list">
      <div v-for="ver in versions" :key="ver.id" class="version-item"
        :class="{ current: ver.version_number === currentVersion }">
        <div class="version-timeline">
          <div class="timeline-dot" :class="{ active: ver.version_number === currentVersion }"></div>
          <div class="timeline-line"></div>
        </div>

        <div class="version-content">
          <div class="version-main">
            <div class="version-info">
              <span class="version-number">v{{ ver.version_number }}</span>
              <el-tag v-if="ver.version_number === currentVersion" size="small" type="success">当前</el-tag>
              <span class="version-desc">{{ ver.description || '无描述' }}</span>
            </div>
            <div class="version-meta">
              <span>{{ ver.file_count || 0 }} 个文件</span>
              <span>{{ formatSize(ver.total_size) }}</span>
              <span>{{ formatTime(ver.create_time) }}</span>
            </div>
            <div v-if="ver.change_summary" class="version-summary">
              {{ ver.change_summary }}
            </div>
          </div>

          <div class="version-actions">
            <el-button size="small" text type="primary" @click="handleViewVersion(ver)">
              👁️ 查看
            </el-button>
            <el-button size="small" text type="warning" @click="handleRestoreVersion(ver)"
              :disabled="ver.version_number === currentVersion">
              🔄 恢复
            </el-button>
            <el-button size="small" text type="danger" @click="handleDeleteVersion(ver)">
              🗑️ 删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pagination.total > pagination.limit" class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" :page-size="pagination.limit"
        :total="pagination.total" layout="prev, pager, next" small @current-change="fetchVersions" />
    </div>

    <el-dialog v-model="showCreateDialog" title="💾 保存版本" width="400px">
      <el-form label-width="80px" size="default">
        <el-form-item label="版本描述">
          <el-input v-model="newVersionDesc" type="textarea" :rows="3" placeholder="描述本次变更内容（可选）..." />
        </el-form-item>
        <el-form-item label="变更摘要">
          <el-input v-model="newVersionSummary" placeholder="简短摘要（可选）..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmCreateVersion" :loading="isCreating">确认保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showVersionDetail" title="📋 版本详情" width="600px">
      <div v-if="versionDetail" class="version-detail">
        <div class="detail-header">
          <span class="version-number">v{{ versionDetail.version_number }}</span>
          <span class="version-desc">{{ versionDetail.description || '无描述' }}</span>
        </div>
        <div class="detail-meta">
          <span>📁 {{ versionDetail.file_count || 0 }} 个文件</span>
          <span>📏 {{ formatSize(versionDetail.total_size) }}</span>
          <span>🕐 {{ formatTime(versionDetail.create_time) }}</span>
        </div>
        <div v-if="versionDetail.files_data" class="detail-files">
          <div v-for="file in versionDetail.files_data" :key="file.name" class="detail-file">
            <span class="file-icon">{{ getFileIcon(file.name) }}</span>
            <span class="file-name">{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.content?.length || 0) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showVersionDetail = false">关闭</el-button>
        <el-button type="warning" @click="handleRestoreFromDetail" :disabled="versionDetail?.version_number === currentVersion">
          🔄 恢复到此版本
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { projectsApi } from '@/api/projects'

const props = defineProps({
  projectId: { type: [Number, String], default: null },
  currentVersion: { type: Number, default: 0 },
})

const emit = defineEmits(['restore', 'created'])

const versions = ref([])
const isLoading = ref(false)
const isCreating = ref(false)
const showCreateDialog = ref(false)
const showVersionDetail = ref(false)
const versionDetail = ref(null)
const newVersionDesc = ref('')
const newVersionSummary = ref('')

const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
})

async function fetchVersions() {
  if (!props.projectId) return

  isLoading.value = true
  try {
    const res = await projectsApi.getVersions(props.projectId, {
      page: pagination.value.page,
      limit: pagination.value.limit,
    })

    if (res?.items) {
      versions.value = res.items
      pagination.value.total = res.pagination?.total || 0
    } else if (Array.isArray(res)) {
      versions.value = res
    }
  } catch (e) {
    console.error('获取版本历史失败:', e)
    ElMessage.error('获取版本历史失败')
  } finally {
    isLoading.value = false
  }
}

function handleCreateVersion() {
  newVersionDesc.value = ''
  newVersionSummary.value = ''
  showCreateDialog.value = true
}

async function confirmCreateVersion() {
  if (!props.projectId) {
    ElMessage.warning('请先保存项目')
    return
  }

  isCreating.value = true
  try {
    await projectsApi.createVersion(props.projectId, {
      description: newVersionDesc.value,
      changeSummary: newVersionSummary.value,
    })
    ElMessage.success('✅ 版本保存成功')
    showCreateDialog.value = false
    emit('created')
    fetchVersions()
  } catch (e) {
    console.error('保存版本失败:', e)
    ElMessage.error('保存版本失败')
  } finally {
    isCreating.value = false
  }
}

async function handleViewVersion(ver) {
  if (!props.projectId) return

  try {
    const res = await projectsApi.getVersion(props.projectId, ver.version_number)
    versionDetail.value = res
    showVersionDetail.value = true
  } catch (e) {
    console.error('获取版本详情失败:', e)
    ElMessage.error('获取版本详情失败')
  }
}

async function handleRestoreVersion(ver) {
  if (!props.projectId) return

  try {
    await ElMessageBox.confirm(
      `确定要恢复到 v${ver.version_number} 吗？当前代码将被替换。`,
      '确认恢复',
      { confirmButtonText: '确定恢复', cancelButtonText: '取消', type: 'warning' },
    )

    await projectsApi.restoreVersion(props.projectId, ver.version_number)
    ElMessage.success(`✅ 已恢复到 v${ver.version_number}`)
    emit('restore', ver)
    fetchVersions()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('恢复版本失败:', e)
      ElMessage.error('恢复版本失败')
    }
  }
}

function handleRestoreFromDetail() {
  if (versionDetail.value) {
    showVersionDetail.value = false
    handleRestoreVersion(versionDetail.value)
  }
}

async function handleDeleteVersion(ver) {
  if (!props.projectId) return

  try {
    await ElMessageBox.confirm(
      `确定要删除 v${ver.version_number} 吗？此操作不可撤销。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' },
    )

    await projectsApi.deleteVersion(props.projectId, ver.id)
    ElMessage.success('版本已删除')
    fetchVersions()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除版本失败:', e)
      ElMessage.error('删除版本失败')
    }
  }
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB']
  let size = bytes
  let unitIdx = 0
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024
    unitIdx++
  }
  return `${size.toFixed(1)} ${units[unitIdx]}`
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return date.toLocaleDateString('zh-CN')
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()
  const icons = { html: '🌐', css: '🎨', js: '⚡', json: '📋', md: '📝' }
  return icons[ext] || '📄'
}

watch(() => props.projectId, (val) => {
  if (val) fetchVersions()
})

onMounted(() => {
  if (props.projectId) fetchVersions()
})
</script>

<style scoped>
.version-history {
  padding: 8px 0;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.version-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: var(--text-secondary);
  gap: 8px;
}

.version-list {
  display: flex;
  flex-direction: column;
}

.version-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  position: relative;
}

.version-item.current {
  background: var(--color-primary-light-9);
  border-radius: 8px;
  padding: 12px;
  margin: -4px -12px;
}

.version-timeline {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 16px;
}

.timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--fill-base);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px #d0d0d0;
  flex-shrink: 0;
}

.timeline-dot.active {
  background: #409eff;
  box-shadow: 0 0 0 1px #409eff;
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: var(--fill-base);
  margin-top: 4px;
}

.version-content {
  flex: 1;
  min-width: 0;
}

.version-main {
  margin-bottom: 6px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.version-number {
  font-weight: 700;
  color: var(--color-primary);
  font-size: 14px;
}

.version-desc {
  color: var(--text-primary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-placeholder);
}

.version-summary {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--fill-base);
  padding: 4px 8px;
  border-radius: 4px;
}

.version-actions {
  display: flex;
  gap: 4px;
}

.pagination-wrapper {
  margin-top: 16px;
  text-align: center;
}

.version-detail {
  padding: 8px 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-header .version-number {
  font-size: 18px;
}

.detail-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.detail-files {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--fill-lighter);
  border-radius: 6px;
  border: 1px solid var(--border-lighter);
}

.file-icon {
  font-size: 16px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  font-family: 'Consolas', monospace;
}

.file-size {
  font-size: 12px;
  color: var(--text-placeholder);
}
</style>
