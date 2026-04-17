﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="preview-panel">
    <div class="device-toolbar">
      <div class="toolbar-left">
        <el-select v-model="deviceMode" size="small" style="width: 120px">
          <el-option label="🖥️ 桌面端" value="desktop" />
          <el-option label="📱 iPad" value="tablet" />
          <el-option label="📲 iPhone" value="mobile" />
        </el-select>

        <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="" size="small"
          style="--el-switch-on-color: #409EFF" />
      </div>

      <div class="toolbar-right">
        <el-button-group size="small">
          <el-button @click="handleForceRefresh" :loading="isLoading">
            🔄 刷新
          </el-button>
          <el-button @click="toggleFullscreen">
            ⛶ 全屏
          </el-button>
          <el-button @click="showQRCode">
            📱 手机预览
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="preview-container" :class="[deviceMode]">
      <div v-if="isLoading" class="loading-overlay">
        <el-icon class="is-loading" :size="32">
          <Loading />
        </el-icon>
        <span>渲染中...</span>
      </div>

      <iframe ref="iframeRef" :src="previewUrl" class="preview-iframe" frameborder="0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
        allow="clipboard-read; clipboard-write" @load="handleIframeLoad"
        @error="handleIframeError" />

      <div v-if="lastError" class="error-overlay">
        <el-alert :title="lastError" type="error" :closable="false" show-icon />
      </div>
    </div>

    <div class="console-panel" :class="{ expanded: consoleExpanded }">
      <div class="console-header" @click="consoleExpanded = !consoleExpanded">
        <div class="console-header-left">
          <span class="console-title">控制台</span>
          <span v-if="consoleOutput.length > 0" class="console-badge">{{ consoleOutput.length }}</span>
          <span v-if="errorCount > 0" class="console-badge error">{{ errorCount }}</span>
        </div>
        <div class="console-header-right">
          <button class="console-action" @click.stop="clearConsole" title="清空控制台">
            🗑️
          </button>
          <button class="console-action" @click.stop="toggleConsoleFilter" title="过滤错误">
            {{ consoleFilter === 'error' ? '🔴' : '⚪' }}
          </button>
          <span class="console-toggle">{{ consoleExpanded ? '▼' : '▲' }}</span>
        </div>
      </div>

      <div v-if="consoleExpanded" class="console-body">
        <div v-if="filteredConsoleOutput.length === 0" class="console-empty">
          暂无控制台输出
        </div>
        <div v-for="(entry, idx) in filteredConsoleOutput" :key="idx" class="console-entry"
          :class="entry.method">
          <span class="console-method">{{ getMethodLabel(entry.method) }}</span>
          <span class="console-text">{{ entry.args.join(' ') }}</span>
          <span class="console-time">{{ formatConsoleTime(entry.timestamp) }}</span>
        </div>
      </div>
    </div>

    <el-dialog v-model="showQR" title="📱 手机扫码预览" width="400px">
      <div class="qr-container">
        <canvas ref="qrCanvas"></canvas>
        <p class="qr-hint">使用手机浏览器扫描二维码查看效果</p>
        <p class="qr-url">{{ mobileUrl }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import { usePreviewEngine } from '../composables/usePreviewEngine.js'

const props = defineProps({
  files: { type: Array, required: true },
  changedFile: { type: String, default: '' },
})

const emit = defineEmits(['console-output'])

const deviceMode = ref('desktop')
const autoRefresh = ref(true)
const showQR = ref(false)
const qrCanvas = ref(null)
const mobileUrl = ref('')
const consoleExpanded = ref(false)
const consoleFilter = ref('all')

const {
  iframeRef,
  previewUrl,
  isLoading,
  lastError,
  consoleOutput,
  isHotUpdating,
  debouncedHotUpdate,
  debouncedRefresh,
  forceRefresh,
  getMobilePreviewUrl,
  handleIframeLoad,
  handleIframeError,
  clearConsole,
} = usePreviewEngine({ autoRefresh: () => autoRefresh.value })

const errorCount = computed(() =>
  consoleOutput.value.filter(e => e.method === 'error').length,
)

const filteredConsoleOutput = computed(() => {
  if (consoleFilter.value === 'error') {
    return consoleOutput.value.filter(e => e.method === 'error')
  }
  return consoleOutput.value
})

watch(() => props.files, (newFiles) => {
  if (autoRefresh.value) {
    if (props.changedFile) {
      debouncedHotUpdate(newFiles, props.changedFile)
    } else {
      debouncedRefresh(newFiles)
    }
  }
}, { deep: true })

watch(autoRefresh, (val) => {
  if (val && props.files.length > 0) {
    forceRefresh(props.files)
  }
})

watch(consoleOutput, (val) => {
  emit('console-output', val)
  if (val.length > 0 && val[val.length - 1].method === 'error' && !consoleExpanded.value) {
    consoleExpanded.value = true
  }
}, { deep: true })

function handleForceRefresh() {
  forceRefresh(props.files)
}

async function showQRCode() {
  showQR.value = true
  await nextTick()

  try {
    const url = await getMobilePreviewUrl(props.files)
    mobileUrl.value = url.substring(0, 50) + '...'

    if (qrCanvas.value) {
      QRCode.toCanvas(qrCanvas.value, url, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }
  } catch (err) {
    console.error('生成二维码失败:', err)
  }
}

function toggleFullscreen() {
  const container = document.querySelector('.preview-container')
  if (!container) return

  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    container.requestFullscreen().catch(err => {
      console.warn('全屏请求失败:', err)
    })
  }
}

function toggleConsoleFilter() {
  consoleFilter.value = consoleFilter.value === 'error' ? 'all' : 'error'
}

function getMethodLabel(method) {
  const labels = {
    log: 'LOG',
    warn: 'WARN',
    error: 'ERR',
    info: 'INFO',
    debug: 'DBG',
  }
  return labels[method] || method.toUpperCase()
}

function formatConsoleTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
}

.device-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-container {
  flex: 1;
  position: relative;
  margin: 16px auto;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;
  border-radius: 8px;
  min-height: 0;
}

.preview-container.desktop {
  width: calc(100% - 32px);
  height: calc(100% - 80px);
}

.preview-container.tablet {
  width: 768px;
  height: 1024px;
}

.preview-container.mobile {
  width: 375px;
  height: 812px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  background: #fff;
  border: none;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 10;
  color: var(--text-regular);
  font-size: 14px;
}

.error-overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 10;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.qr-hint {
  color: var(--text-regular);
  font-size: 14px;
  margin: 0;
}

.qr-url {
  color: var(--text-secondary);
  font-size: 12px;
  word-break: break-all;
  max-width: 100%;
  margin: 0;
}

.console-panel {
  flex-shrink: 0;
  background: #1e1e1e;
  border-top: 1px solid #3c3c3c;
  max-height: 40%;
  display: flex;
  flex-direction: column;
  transition: max-height 0.2s ease;
}

.console-panel:not(.expanded) {
  max-height: 36px;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.console-header:hover {
  background: #2d2d2d;
}

.console-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.console-title {
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
}

.console-badge {
  background: #409eff;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.console-badge.error {
  background: #f56c6c;
}

.console-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.console-action {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
}

.console-action:hover {
  background: #3c3c3c;
}

.console-toggle {
  color: var(--text-secondary);
  font-size: 10px;
}

.console-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.console-body::-webkit-scrollbar {
  width: 6px;
}

.console-body::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 3px;
}

.console-empty {
  color: var(--text-regular);
  text-align: center;
  padding: 16px;
  font-size: 12px;
}

.console-entry {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 12px;
  border-bottom: 1px solid #2a2a2a;
}

.console-entry:hover {
  background: #2a2a2a;
}

.console-entry.error {
  background: #3c1f1f;
}

.console-entry.warn {
  background: #3c3c1f;
}

.console-method {
  color: var(--text-secondary);
  font-size: 10px;
  min-width: 36px;
  padding-top: 1px;
}

.console-entry.error .console-method {
  color: #f48771;
}

.console-entry.warn .console-method {
  color: #cca700;
}

.console-entry.info .console-method {
  color: #75beff;
}

.console-text {
  color: var(--text-placeholder);
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}

.console-entry.error .console-text {
  color: #f48771;
}

.console-entry.warn .console-text {
  color: #cca700;
}

.console-time {
  color: #555;
  font-size: 10px;
  flex-shrink: 0;
  padding-top: 1px;
}
</style>
