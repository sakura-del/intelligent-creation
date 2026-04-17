﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="share-dialog-content">
    <el-tabs v-model="activeTab">
      <el-tab-pane label="🔗 分享链接" name="link">
        <div class="share-section">
          <p class="section-desc">生成分享链接，让其他人也能预览你的作品</p>

          <div class="share-toggle">
            <el-switch v-model="isPublic" active-text="公开" inactive-text="私有" @change="handleTogglePublic" />
            <span class="toggle-hint">{{ isPublic ? '任何人可通过链接访问' : '仅自己可见' }}</span>
          </div>

          <div v-if="isPublic && shareUrl" class="share-link-row">
            <el-input :model-value="shareUrl" readonly size="large">
              <template #prepend>分享链接</template>
              <template #append>
                <el-button @click="copyToClipboard(shareUrl)">复制</el-button>
              </template>
            </el-input>
          </div>

          <div v-if="!isPublic" class="private-hint">
            <el-alert type="info" :closable="false" show-icon>
              <template #title>项目当前为私有，开启公开后可生成分享链接</template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="📋 嵌入代码" name="embed">
        <div class="share-section">
          <p class="section-desc">将作品嵌入到你的网站或博客中</p>

          <div v-if="isLoadingEmbed" class="loading-state">
            <el-icon class="is-loading" :size="20"><Loading /></el-icon>
            <span>生成嵌入代码中...</span>
          </div>

          <template v-else>
            <div v-if="embedData" class="embed-section">
              <div class="embed-option">
                <label>嵌入方式</label>
                <el-radio-group v-model="embedMode" size="small">
                  <el-radio-button value="iframe">Iframe</el-radio-button>
                  <el-radio-button value="url">直接链接</el-radio-button>
                </el-radio-group>
              </div>

              <div v-if="embedMode === 'iframe'" class="embed-config">
                <div class="config-row">
                  <label>宽度</label>
                  <el-input v-model="embedWidth" size="small" style="width: 120px" />
                </div>
                <div class="config-row">
                  <label>高度</label>
                  <el-input v-model="embedHeight" size="small" style="width: 120px" />
                </div>
                <div class="config-row">
                  <label>圆角</label>
                  <el-input v-model="embedRadius" size="small" style="width: 120px" />
                </div>
              </div>

              <div class="embed-code-box">
                <label>嵌入代码</label>
                <div class="code-block">
                  <code>{{ currentEmbedCode }}</code>
                </div>
                <el-button type="primary" size="small" @click="copyToClipboard(currentEmbedCode)"
                  style="margin-top: 8px;">
                  📋 复制嵌入代码
                </el-button>
              </div>

              <div v-if="embedData.embedUrl" class="embed-preview">
                <label>预览效果</label>
                <div class="preview-frame">
                  <iframe :src="embedData.embedUrl" :width="embedWidth" :height="embedHeight"
                    frameborder="0" :style="`border-radius: ${embedRadius}`"
                    sandbox="allow-scripts allow-same-origin" />
                </div>
              </div>
            </div>

            <div v-else class="no-embed">
              <el-alert type="warning" :closable="false" show-icon>
                <template #title>请先保存项目并开启公开访问，才能生成嵌入代码</template>
              </el-alert>
            </div>
          </template>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { projectsApi } from '@/api/projects'

const props = defineProps({
  projectId: { type: [Number, String], default: null },
  shareToken: { type: String, default: '' },
  isProjectPublic: { type: Boolean, default: false },
})

const emit = defineEmits(['share-updated'])

const activeTab = ref('link')
const isPublic = ref(props.isProjectPublic)
const isLoadingEmbed = ref(false)
const embedData = ref(null)
const embedMode = ref('iframe')
const embedWidth = ref('100%')
const embedHeight = ref('600')
const embedRadius = ref('8px')

const shareUrl = computed(() => {
  if (props.shareToken) {
    return `${window.location.origin}/share/${props.shareToken}`
  }
  return ''
})

const currentEmbedCode = computed(() => {
  if (!embedData.value) return ''

  if (embedMode.value === 'url') {
    return embedData.value.embedUrl || ''
  }

  return `<iframe src="${embedData.value.embedUrl}" width="${embedWidth.value}" height="${embedHeight.value}" frameborder="0" style="border-radius:${embedRadius.value};" sandbox="allow-scripts allow-same-origin"></iframe>`
})

watch(() => props.isProjectPublic, (val) => {
  isPublic.value = val
})

watch(() => props.projectId, (val) => {
  if (val && activeTab.value === 'embed') {
    loadEmbedCode()
  }
})

watch(activeTab, (val) => {
  if (val === 'embed' && props.projectId) {
    loadEmbedCode()
  }
})

function handleTogglePublic(val) {
  emit('share-updated', { isPublic: val })
}

async function loadEmbedCode() {
  if (!props.projectId) return

  isLoadingEmbed.value = true
  try {
    const res = await projectsApi.getEmbedCode(props.projectId)
    embedData.value = res
  } catch (e) {
    console.error('获取嵌入代码失败:', e)
    ElMessage.error('获取嵌入代码失败')
  } finally {
    isLoadingEmbed.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('✅ 已复制到剪贴板')
  }).catch(() => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('✅ 已复制到剪贴板')
  })
}
</script>

<style scoped>
.share-dialog-content {
  padding: 8px 0;
}

.share-section {
  padding: 8px 0;
}

.section-desc {
  color: var(--text-regular);
  font-size: 13px;
  margin: 0 0 16px;
}

.share-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.toggle-hint {
  color: var(--text-secondary);
  font-size: 12px;
}

.share-link-row {
  margin-bottom: 16px;
}

.private-hint {
  margin-top: 8px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
}

.embed-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.embed-option {
  display: flex;
  align-items: center;
  gap: 12px;
}

.embed-option label {
  font-size: 13px;
  color: var(--text-regular);
  font-weight: 600;
}

.embed-config {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-row label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 32px;
}

.embed-code-box label {
  display: block;
  font-size: 13px;
  color: var(--text-regular);
  font-weight: 600;
  margin-bottom: 8px;
}

.code-block {
  background: #1e1e1e;
  color: var(--text-placeholder);
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
}

.embed-preview label {
  display: block;
  font-size: 13px;
  color: var(--text-regular);
  font-weight: 600;
  margin-bottom: 8px;
}

.preview-frame {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-white);
}

.no-embed {
  margin-top: 8px;
}
</style>
