# AI-Code Studio 技术调研报告 v1.0

> **项目代号**: CodeForge (代码锻造)
> **调研日期**: 2026-04-07
> **战略定位**: AI驱动的在线H5页面构建平台
> **目标用户**: 双模式切换（专业开发者 + 设计师/运营）

---

## 📊 执行摘要 (Executive Summary)

### 核心价值主张
**"让不懂代码的人也能在10分钟内生成专业级H5营销页面"**

### 差异化竞争优势
| 维度 | 竞品 (CodePen/JSFiddle) | 我们 (CodeForge) |
|------|------------------------|------------------|
| **AI能力** | ❌ 无 | ✅ 自然语言→代码 |
| **模板库** | 少量示例 | ✅ 50+行业模板 |
| **交付方式** | 仅在线预览 | ✅ 一键下载ZIP源码 |
| **逆向工程** | ❌ 不支持 | ✅ 设计稿→代码 |
| **目标用户** | 开发者 | ✅ 零基础用户优先 |
| **商业模式** | 免费/Pro订阅 | 模板市场+API服务 |

---

## 🧩 模块一: Monaco Editor 集成方案

### 技术选型对比

| 方案 | 包大小 | Vue3支持 | 功能完整性 | 推荐度 |
|------|-------|---------|-----------|--------|
| `@monaco-editor/react` | ~2MB | ⚠️ 需适配 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| `monaco-editor-vue3` | ~2MB | ✅ 原生支持 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| `codemirror` | ~500KB | ✅ 良好 | ⭐⭐⭐ | ⭐⭐⭐ |
| `ace-builds` | ~400KB | ⚠️ 社区维护 | ⭐⭐⭐ | ⭐⭐ |

### 最终推荐: `monaco-editor-vue3` 

**理由**:
1. **原生Vue3组件封装** - 无需额外适配层
2. **VS Code同款引擎** - 用户学习成本为零
3. **活跃维护** - GitHub 2k+ stars，持续更新
4. **TypeScript支持** - 类型提示完善

### 安装与配置

```bash
npm install monaco-editor-vue3
# 或
pnpm add monaco-editor-vue3
```

### 核心实现代码

#### 1. 编辑器组件封装 (`CodeEditor.vue`)

```vue
<template>
  <div class="code-editor-wrapper">
    <MonacoEditor
      v-model:value="code"
      :language="language"
      :theme="theme"
      :options="editorOptions"
      @mount="handleEditorMount"
      @change="handleChange"
      :height="height"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'
import * as monaco from 'monaco-editor'

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'html' }, // html/css/javascript
  theme: { type: String, default: 'vs-dark' }, // vs / vs-dark / hc-black
  height: { type: [String, Number], default: '100%' },
  readOnly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change', 'mount'])

const code = ref(props.modelValue)
const editorInstance = ref(null)

const editorOptions = {
  fontSize: 14,
  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
  lineNumbers: 'on',
  minimap: { enabled: true, maxColumn: 80 },
  wordWrap: 'on',
  automaticLayout: true,
  tabSize: 2,
  scrollBeyondLastLine: false,
  renderWhitespace: 'selection',
  suggestOnTriggerCharacters: true,
  quickSuggestions: true,
  parameterHints: { enabled: true },
  formatOnPaste: true,
  formatOnType: true,
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

// 同步内部变化到外部
watch(code, (newVal) => {
  emit('update:modelValue', newVal)
  emit('change', newVal)
})

function handleEditorMount(editor) {
  editorInstance.value = editor
  
  // 注册快捷键
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    // Ctrl+S 触发保存/运行
    emit('save')
  })

  // 自动补全配置
  editor.updateOptions({
    suggest: {
      showKeywords: true,
      showSnippets: true,
    }
  })
}

function handleChange(value) {
  emit('change', value)
}

onBeforeUnmount(() => {
  if (editorInstance.value) {
    editorInstance.value.dispose()
  }
})
</script>

<style scoped>
.code-editor-wrapper {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
}
</style>
```

#### 2. 多文件编辑器管理器 (`MultiFileEditor.vue`)

```vue
<template>
  <div class="multi-file-editor">
    <!-- 文件标签栏 -->
    <div class="file-tabs">
      <div 
        v-for="file in files" 
        :key="file.name"
        class="file-tab"
        :class="{ active: activeFile === file.name }"
        @click="switchFile(file.name)"
      >
        <span class="file-icon">{{ getFileIcon(file.name) }}</span>
        <span class="file-name">{{ file.name }}</span>
        <button class="close-btn" v-if="files.length > 1" @click.stop="removeFile(file.name)">×</button>
      </div>
      <button class="add-file-btn" @click="showAddDialog">+</button>
    </div>

    <!-- 当前编辑器 -->
    <CodeEditor
      v-model="currentFileContent"
      :language="currentLanguage"
      :height="'calc(100% - 40px)'"
      @change="handleContentChange"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CodeEditor from './CodeEditor.vue'

const props = defineProps({
  files: { 
    type: Array, 
    default: () => [
      { name: 'index.html', content: '', language: 'html' },
      { name: 'style.css', content: '', language: 'css' },
      { name: 'script.js', content: '', language: 'javascript' },
    ] 
  }
})

const emit = defineEmits(['update:files', 'file-change'])

const activeFile = ref('index.html')

const currentFile = computed(() => 
  props.files.find(f => f.name === activeFile.value)
)

const currentFileContent = computed({
  get: () => currentFile.value?.content || '',
  set: (val) => updateFileContent(activeFile.value, val)
})

const currentLanguage = computed(() => currentFile.value?.language || 'html')

function switchFile(name) {
  activeFile.value = name
}

function removeFile(name) {
  const newFiles = props.files.filter(f => f.name !== name)
  emit('update:files', newFiles)
  if (activeFile.value === name && newFiles.length > 0) {
    activeFile.value = newFiles[0].name
  }
}

function updateFileContent(name, content) {
  const newFiles = props.files.map(f => 
    f.name === name ? { ...f, content } : f
  )
  emit('update:files', newFiles)
  emit('file-change', { name, content })
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()
  const icons = { html: '🌐', css: '🎨', js: '⚡', json: '📋' }
  return icons[ext] || '📄'
}
</script>

<style scoped>
.multi-file-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.file-tabs {
  display: flex;
  background: #252526;
  padding: 0 8px;
  gap: 2px;
  border-bottom: 1px solid #3c3c3c;
}

.file-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  color: #969696;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
}

.file-tab:hover { background: #2d2d2d; color: #fff; }
.file-tab.active { 
  background: #1e1e1e; 
  color: #fff; 
  border-bottom-color: #007acc;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
}
.close-btn:hover { background: #c00; color: #fff; }

.add-file-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
}
.add-file-btn:hover { color: #fff; background: #333; }
</style>
```

### 性能优化策略

1. **懒加载Monaco Editor**
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['monaco-editor'],
        }
      }
    }
  }
})
```

2. **Web Worker分离**
```javascript
// 使用Monaco的Web Worker避免阻塞主线程
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
self.MonacoEnvironment = { getWorker: () => new editorWorker() }
```

---

## 🖥️ 模块二: iframe实时预览引擎

### 架构设计

```
┌─────────────────────────────────────┐
│         CodeStudio 主应用            │
│  ┌───────────┐  ┌────────────────┐  │
│  │  Editor   │  │  Preview Panel │  │
│  │ (Monaco)  │→ │  (iframe)      │  │
│  └───────────┘  └────────────────┘  │
│         ↓                ↑          │
│  ┌──────────────────────────────┐  │
│  │     Preview Engine Core       │  │
│  │  • 实时编译                   │  │
│  │  • 错误捕获                   │  │
│  │  • Console日志转发            │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 安全沙箱配置

```javascript
const sandboxAttributes = {
  'sandbox': `
    allow-scripts 
    allow-same-origin 
    allow-popups 
    allow-forms
    allow-modals
  `,
  // 安全限制：
  // ❌ allow-top-navigation (防止跳转父页面)
  // ❌ allow-downloads (防止恶意下载)
}
```

### 核心实现

#### 1. 预览引擎 Composable (`usePreviewEngine.js`)

```javascript
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export function usePreviewEngine(options = {}) {
  const {
    autoRefresh = true,
    refreshDelay = 800, // 防抖延迟(ms)
    onError = console.error,
  } = options

  const iframeRef = ref(null)
  const previewUrl = ref('')
  const isLoading = ref(false)
  const lastError = ref(null)
  const consoleLogs = ref([])

  let refreshTimer = null

  function generatePreviewHTML(files) {
    const htmlFile = files.find(f => f.name.endsWith('.html'))?.content || ''
    const cssFiles = files.filter(f => f.name.endsWith('.css'))
    const jsFiles = files.filter(f => f.name.endsWith('.js'))

    // 注入CSS和JS到HTML中
    let finalHtml = htmlFile

    // 在</head>前注入CSS
    const cssLinks = cssFiles.map(f => 
      `<style>\n${f.content}\n</style>`
    ).join('\n')

    if (!finalHtml.includes('</head>')) {
      finalHtml = `<head>${cssLinks}</head><body>${finalHtml}</body>`
    } else {
      finalHtml = finalHtml.replace('</head>', `${cssLinks}</head>`)
    }

    // 在</body>前注入JS
    const jsScripts = jsFiles.map(f =>
      `<script>\n${f.content}\n<\/script>`
    ).join('\n')

    if (!finalHtml.includes('</body>')) {
      finalHtml += jsScripts
    } else {
      finalHtml = finalHtml.replace('</body>', `${jsScripts}</body>`)
    }

    return finalHtml
  }

  function refreshPreview(files) {
    if (!iframeRef.value) return

    isLoading.value = true
    lastError.value = null

    try {
      const htmlContent = generatePreviewHTML(files)
      
      // 使用Blob URL避免跨域问题
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // 清理旧URL
      if (previewUrl.value) {
        URL.revokeObjectURL(previewUrl.value)
      }
      
      previewUrl.value = url
      iframeRef.value.src = url
      
      setTimeout(() => {
        isLoading.value = false
      }, 300) // 给iframe加载时间
    } catch (error) {
      lastError.value = error.message
      onError(error)
      isLoading.value = false
    }
  }

  function debouncedRefresh(files) {
    if (!autoRefresh) return
    
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshPreview(files)
    }, refreshDelay)
  }

  function handleIframeLoad() {
    isLoading.value = false
  }

  function handleIframeError(event) {
    lastError.value = '预览加载失败'
    onError(event)
  }

  // 强制刷新（忽略防抖）
  function forceRefresh(files) {
    clearTimeout(refreshTimer)
    refreshPreview(files)
  }

  // 移动端预览（生成二维码）
  async function getMobilePreviewUrl(files) {
    const htmlContent = generatePreviewHTML(files)
    const blob = new Blob([htmlContent], { type: 'text/html' })
    return URL.createObjectURL(blob)
  }

  onBeforeUnmount(() => {
    clearTimeout(refreshTimer)
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }
  })

  return {
    iframeRef,
    previewUrl,
    isLoading,
    lastError,
    consoleLogs,
    refreshPreview,
    debouncedRefresh,
    forceRefresh,
    getMobilePreviewUrl,
    handleIframeLoad,
    handleIframeError,
  }
}
```

#### 2. 预览面板组件 (`PreviewPanel.vue`)

```vue
<template>
  <div class="preview-panel">
    <!-- 设备模拟器工具栏 -->
    <div class="device-toolbar">
      <el-select v-model="deviceMode" size="small" style="width: 120px">
        <el-option label="桌面端" value="desktop" />
        <el-option label="iPad" value="tablet" />
        <el-option label="iPhone" value="mobile" />
      </el-select>

      <el-button-group size="small">
        <el-button @click="forceRefresh" :loading="isLoading">
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

    <!-- 预览容器（带设备边框） -->
    <div class="preview-container" :class="[deviceMode]">
      <div v-if="isLoading" class="loading-overlay">
        <el-icon class="is-loading" :size="32"><Loading /></el-icon>
        <span>渲染中...</span>
      </div>

      <iframe
        ref="iframeRef"
        :src="previewUrl"
        class="preview-iframe"
        frameborder="0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
        @load="handleIframeLoad"
        @error="handleIframeError"
      />

      <div v-if="lastError" class="error-overlay">
        <el-alert :title="lastError" type="error" :closable="false" show-icon />
      </div>
    </div>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="showQR" title="手机扫码预览" width="400px">
      <div class="qr-container">
        <canvas ref="qrCanvas"></canvas>
        <p class="qr-hint">使用手机浏览器扫描二维码查看效果</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { usePreviewEngine } from '../composables/usePreviewEngine'
import QRCode from 'qrcode'

const props = defineProps({
  files: { type: Array, required: true },
  autoRefresh: { type: Boolean, default: true }
})

const deviceMode = ref('desktop')
const showQR = ref(false)
const qrCanvas = ref(null)

const {
  iframeRef,
  previewUrl,
  isLoading,
  lastError,
  forceRefresh,
  debouncedRefresh,
  getMobilePreviewUrl,
  handleIframeLoad,
  handleIframeError,
} = usePreviewEngine({ autoRefresh: props.autoRefresh })

// 监听文件变化自动刷新
watch(() => props.files, (newFiles) => {
  debouncedRefresh(newFiles)
}, { deep: true })

async function showQRCode() {
  showQR.value = true
  await nextTick()
  
  const url = await getMobilePreviewUrl(props.files)
  QRCode.toCanvas(qrCanvas.value, url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  })
}

function toggleFullscreen() {
  const container = document.querySelector('.preview-container')
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    container.requestFullscreen()
  }
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f5f5;
}

.device-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.preview-container {
  flex: 1;
  position: relative;
  margin: 20px auto;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  transition: all 0.3s;
  overflow: hidden;
}

.preview-container.desktop {
  width: 100%;
  height: calc(100% - 60px);
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
}

.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 10;
  color: #666;
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
  padding: 20px;
}

.qr-hint {
  color: #666;
  font-size: 14px;
}
</style>
```

### 性能优化要点

1. **Blob URL替代data URI**
   - data URI有大小限制（~2MB）
   - Blob URL无限制且可清理

2. **防抖机制**
   - 用户输入时不要立即刷新
   - 停止输入800ms后再渲染

3. **虚拟DOM diff（进阶）**
   - 只更新变化的CSS/JS部分
   - 使用MutationObserver检测变更

---

## 📦 模块三: JSZip源码打包系统

### 安装依赖

```bash
npm install jszip file-saver
# 或
pnpm add jszip file-saver
```

### 核心实现

#### 打包Composable (`useCodePackager.js`)

```javascript
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

export function useCodePackager(options = {}) {
  const {
    defaultFileName = 'my-page',
    onProgress = () => {},
    onComplete = () => {},
  } = options

  async function packAndDownload(files, projectName = null) {
    const zip = new JSZip()
    const name = projectName || defaultFileName

    try {
      // 1. 添加所有文件
      for (const file of files) {
        zip.file(file.name, file.content)
      }

      // 2. 添加README.md
      zip.file('README.md', generateReadme(files))

      // 3. 添加package.json（如果是Node.js项目）
      if (files.some(f => f.name === 'package.json') === false) {
        zip.file('package.json', JSON.stringify({
          name: name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          description: `Generated by AI-Code Studio`,
          scripts: {
            start: 'npx serve .',
          },
        }, null, 2))
      }

      onProgress({ stage: 'compressing', progress: 50 })

      // 4. 生成ZIP
      const content = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
        comment: `Generated by AI-Code Studio on ${new Date().toLocaleString()}`,
      }, (metadata) => {
        onProgress({
          stage: 'generating',
          progress: 50 + Math.round(metadata.percent * 0.5),
        })
      })

      // 5. 下载
      saveAs(content, `${name}.zip`)
      
      onComplete({ success: true, size: content.size })
      return { success: true, size: content.size }

    } catch (error) {
      console.error('打包失败:', error)
      throw error
    }
  }

  function generateReadme(files) {
    const hasHTML = files.some(f => f.name.endsWith('.html'))
    const hasCSS = files.some(f => f.name.endsWith('.css'))
    const hasJS = files.some(f => f.name.endsWith('.js'))

    return `# ${name}

## 项目说明
此项目由 [AI-Code Studio](https://your-domain.com) 自动生成。

## 文件结构
\`\`\`
${files.map(f => `├── ${f.name}`).join('\n')}
\`\`\`

## 使用方法

### 方式一：直接打开
${hasHTML ? '- 直接用浏览器打开 \`index.html\` 即可预览' : ''}

### 方式二：本地服务器
\`\`\`bash
# 使用 npx serve
npx serve .

# 或者使用 Python
python -m http.server 8080
\`\`\`

## 技术栈
- HTML5 ${hasCSS ? '+ CSS3' : ''} ${hasJS ? '+ JavaScript' : ''}
- 生成时间: ${new Date().toLocaleString()}
- 生成工具: AI-Code Studio v1.0

---
© ${new Date().getFullYear()} AI-Code Studio. All rights reserved.
`
  }

  // 单文件导出（不打包ZIP）
  function exportSingleFile(files) {
    const htmlFile = files.find(f => f.name.endsWith('.html'))
    if (!htmlFile) {
      throw new Error('未找到HTML文件')
    }

    const blob = new Blob([htmlFile.content], { type: 'text/html' })
    saveAs(blob, `${defaultFileName}.html`)
  }

  // 复制到剪贴板（单文件版本）
  async function copyToClipboard(files) {
    const htmlFile = files.find(f => f.name.endsWith('.html'))
    if (!htmlFile) return

    try {
      await navigator.clipboard.writeText(htmlFile.content)
      return true
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = htmlFile.content
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    }
  }

  return {
    packAndDownload,
    exportSingleFile,
    copyToClipboard,
  }
}
```

### 高级功能：多格式导出

```javascript
// 支持多种导出格式
async function exportAs(format, files) {
  switch (format) {
    case 'zip':
      await packAndDownload(files)
      break
      
    case 'single-html':
      await mergeIntoSingleHTML(files)
      break
      
    case 'github-repo':
      await createGitHubRepoStructure(files)
      break
      
    case 'email':
      await sendViaEmail(files)
      break
      
    default:
      throw new Error(`不支持的导出格式: ${format}`)
  }
}

// 合并为单个HTML文件（内联CSS/JS）
async function mergeIntoSingleHTML(files) {
  const htmlFile = files.find(f => f.name.endsWith('.html')).content
  const cssContent = files.filter(f => f.name.endsWith('.css')).map(f => f.content).join('\n')
  const jsContent = files.filter(f => f.name.endsWith('.js')).map(f => f.content).join('\n')

  const merged = htmlFile
    .replace('</head>', `<style>\n${cssContent}\n</style></head>`)
    .replace('</body>', `<script>\n${jsContent}\n</script></body>`)

  const blob = new Blob([merged], { type: 'text/html' })
  saveAs(blob, 'page.html')
}
```

---

## 🤖 模块四: AI代码生成架构 (NL2Code)

### 整体流程

```
用户输入自然语言描述
        ↓
  [Prompt Engineering Layer]
  - 模板匹配（是否命中预设场景）
  - 关键词提取（颜色、布局、风格等）
  - 上下文增强（添加行业最佳实践）
        ↓
  [GLM API 调用]
  - System Prompt: "你是一个资深前端工程师..."
  - User Prompt: "生成一个双十一促销页..."
  - Output Format: JSON { html, css, js }
        ↓
  [Post-Processing]
  - JSON解析与校验
  - 代码美化（Prettier格式化）
  - 响应式适配检查
        ↓
  [Result]
  - 写入编辑器
  - 实时预览
  - 可编辑调整
```

### 后端API设计

#### 新增路由: `/api/ai/code-generate`

```javascript
// server/routes/ai.js 新增

router.post(
  '/code-generate',
  authenticate,
  checkAICount,
  rateLimit({ windowMs: 60000, max: 10 }), // 每分钟10次
  async (req, res, next) => {
    try {
      const { prompt, templateId, style, features } = req.body

      // 1. 如果选择了模板，获取模板上下文
      let templateContext = ''
      if (templateId) {
        const template = await db.query(
          'SELECT * FROM code_templates WHERE id = ? AND status = ?',
          [templateId, 'published']
        )
        templateContext = template[0]?.context || ''
      }

      // 2. 构建System Prompt
      const systemPrompt = buildSystemPrompt(style, features)

      // 3. 构建User Prompt
      const userPrompt = buildUserPrompt(prompt, templateContext)

      // 4. 调用GLM API
      const completion = await openai.chat.completions.create({
        model: 'glm-4-plus', // 使用更强的模型
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' }, // 强制JSON输出
      })

      const aiResponse = completion.choices[0].message.content
      
      // 5. 解析并验证响应
      let parsedResponse
      try {
        parsedResponse = JSON.parse(aiResponse)
      } catch (parseError) {
        // 如果JSON解析失败，尝试修复
        parsedResponse = extractJSONFromText(aiResponse)
      }

      // 6. 校验必要字段
      if (!parsedResponse.html) {
        throw new AppError('AI返回的代码缺少HTML内容', 500)
      }

      // 7. 记录使用统计
      await db.query(
        'INSERT INTO ai_usage_logs (user_id, type, tokens_used) VALUES (?, ?, ?)',
        [req.user.id, 'code_generate', completion.usage?.total_tokens || 0]
      )

      successResponse(res, {
        files: [
          { name: 'index.html', content: parsedResponse.html, language: 'html' },
          ...(parsedResponse.css ? [{ name: 'style.css', content: parsedResponse.css, language: 'css' }] : []),
          ...(parsedResponse.js ? [{ name: 'script.js', content: parsedResponse.js, language: 'javascript' }] : []),
        ],
        metadata: {
          model: 'glm-4-plus',
          tokensUsed: completion.usage?.total_tokens,
          generationTime: Date.now(),
        }
      }, '代码生成成功')

    } catch (error) {
      next(error)
    }
  }
)
```

### Prompt工程（关键！）

```javascript
function buildSystemPrompt(style = 'modern', features = []) {
  const basePrompt = `你是一个资深前端工程师和UI设计师，专精于创建高质量、响应式的H5营销页面。

## 你的任务
根据用户的自然语言描述，生成完整的、可直接运行的网页代码。

## 输出要求
必须返回严格的JSON格式：
{
  "html": "<!-- 完整的HTML代码 -->",
  "css": "/* 完整的CSS样式 */",
  "js": "// JavaScript交互逻辑",
  "description": "简要说明生成的页面功能"
}

## 代码规范
1. 使用语义化HTML5标签
2. CSS采用移动端优先的响应式设计（@media查询）
3. JavaScript使用ES6+语法
4. 所有图片使用占位符（https://picsum.photos/宽度/高度）
5. 字体使用Google Fonts或系统默认字体
6. 颜色使用现代配色方案（参考Dribbble/Behance热门作品）

## 设计原则
- 首屏加载时间 < 3秒
- 移动端友好（触摸目标至少44x44px）
- 无障碍访问（ARIA标签、对比度符合WCAG AA标准）`

  const stylePrompts = {
    modern: '\n- 采用现代扁平化设计\n- 大量留白\n- 微交互动画',
    luxury: '\n- 高端奢华风格\n- 金色/深色调\n- 衬线字体',
    minimal: '\n- 极简主义\n- 黑白灰主色调\n- 克制的动画',
    playful: '\n- 活泼有趣\n- 明亮色彩\n- 圆角元素',
  }

  const featurePrompts = []
  if (features.includes('animation')) featurePrompts.push('- 包含入场动画（fade-in/slide-up）')
  if (features.includes('responsive')) featurePrompts.push('- 必须完美适配手机/平板/桌面')
  if (features.includes('interactive')) featurePrompts.push('- 至少3个交互按钮或卡片悬停效果')
  if (features.includes('form')) featurePrompts.push('- 包含表单组件（带验证）')

  return basePrompt + (stylePrompts[style] || '') + featurePrompts.join('\n')
}

function buildUserPrompt(userPrompt, templateContext = '') {
  let finalPrompt = `请为以下需求生成完整的H5页面代码：

## 用户需求
${userPrompt}`

  if (templateContext) {
    finalPrompt += `\n\n## 参考模板上下文
${templateContext}`
  }

  finalPrompt += `\n\n请直接返回JSON格式的代码，无需任何解释。`

  return finalPrompt
}
```

### 前端调用示例

```javascript
// composables/useAICodeGenerator.js
import request from '@/utils/request'

export function useAICodeGenerator() {
  const isGenerating = ref(false)
  const generatedFiles = ref([])
  const error = ref(null)

  async function generateCode(params) {
    isGenerating.value = true
    error.value = null

    try {
      const res = await request.post('/ai/code-generate', params)
      
      // Axios拦截器已解包，res直接是数据
      if (res?.files) {
        generatedFiles.value = res.files
        
        return {
          success: true,
          files: res.files,
          metadata: res.metadata,
        }
      } else {
        throw new Error('未返回有效的代码数据')
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  return {
    isGenerating,
    generatedFiles,
    error,
    generateCode,
  }
}
```

---

## 🎨 模块五: 设计稿转代码（逆向工程）

### 可行性分析

| 技术 | 成熟度 | 准确率 | 实现难度 | 推荐度 |
|------|-------|-------|---------|--------|
| **基于规则的启发式算法** | ⭐⭐⭐ | 40-60% | 低 | ⭐⭐⭐（MVP先用） |
| **传统CV + 模板匹配** | ⭐⭐⭐⭐ | 60-75% | 中 | ⭐⭐⭐⭐ |
| **深度学习 (Pix2Code)** | ⭐⭐⭐⭐ | 77-87% | 高 | ⭐⭐⭐⭐⭐（长期目标） |
| **商业API (Builder.io)** | ⭐⭐⭐⭐⭐ | 90-95% | 低 | ⭐⭐⭐⭐⭐（快速集成） |

### Phase 1 方案: 基于规则的颜色+布局识别（推荐先实现）

```javascript
// services/imageAnalyzer.js
export class ImageAnalyzer {
  constructor() {
    this.canvas = null
    this.ctx = null
  }

  async analyze(imageDataUrl) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        this.canvas = document.createElement('canvas')
        this.ctx = this.canvas.getContext('2d')
        
        this.canvas.width = img.width
        this.canvas.height = img.height
        this.ctx.drawImage(img, 0, 0)

        const analysis = {
          dimensions: { width: img.width, height: img.height },
          dominantColors: this.extractColors(),
          layout: this.detectLayout(),
          elements: this.detectElements(),
          suggestedTemplate: this.suggestTemplate(),
        }

        resolve(analysis)
      }
      img.src = imageDataUrl
    })
  }

  // 提取主要颜色（简化版K-Means）
  extractColors(sampleSize = 10000) {
    const imageData = this.ctx.getImageData(
      0, 0, this.canvas.width, this.canvas.height
    )
    const pixels = imageData.data
    const colorMap = {}

    // 采样像素
    for (let i = 0; i < sampleSize; i++) {
      const idx = Math.floor(Math.random() * (pixels.length / 4)) * 4
      const r = pixels[idx]
      const g = pixels[idx + 1]
      const b = pixels[idx + 2]
      
      // 量化颜色（减少精度以合并相似色）
      const qr = Math.round(r / 32) * 32
      const qg = Math.round(g / 32) * 32
      const qb = Math.round(b / 32) * 32
      const key = `${qr},${qg},${qb}`
      
      colorMap[key] = (colorMap[key] || 0) + 1
    }

    // 返回Top 5颜色
    return Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number)
        return { hex: rgbToHex(r, g, b), rgb: { r, g, b } }
      })
  }

  // 检测布局类型（基于颜色分布）
  detectLayout() {
    const { width, height } = this.canvas
    const aspectRatio = width / height

    if (aspectRatio < 0.6) return { type: 'tall-mobile', suggestion: '长图/详情页' }
    if (aspectRatio > 1.5) return { type: 'wide-banner', suggestion: '横幅/Banner' }
    if (aspectRatio >= 0.9 && aspectRatio <= 1.1) return { type: 'square-poster', suggestion: '海报/封面' }
    
    return { type: 'standard', suggestion: '常规H5页面' }
  }

  // 检测UI元素位置（基于边缘检测）
  detectElements() {
    // 简化版：返回建议的区域划分
    const { width, height } = this.canvas
    
    return [
      { type: 'header', region: { x: 0, y: 0, width, height: height * 0.15 } },
      { type: 'hero', region: { x: 0, y: height * 0.15, width, height: height * 0.35 } },
      { type: 'content', region: { x: 0, y: height * 0.5, width, height: height * 0.35 } },
      { type: 'footer', region: { x: 0, y: height * 0.85, width, height: height * 0.15 } },
    ]
  }

  // 建议使用的模板
  suggestTemplate() {
    const colors = this.extractColors(1000)
    const layout = this.detectLayout()

    // 根据颜色判断风格
    const primaryColor = colors[0]?.hex || '#000000'
    
    if (this.isDarkTheme(colors)) return 'dark-luxury'
    if (this.isColorful(colors)) return 'vibrant-promo'
    if (layout.type === 'wide-banner') return 'marketing-banner'
    
    return 'standard-h5'
  }

  isDarkTheme(colors) {
    const avgBrightness = colors.reduce((sum, c) => {
      return sum + (c.rgb.r * 299 + c.rgb.g * 587 + c.rgb.b * 114) / 1000
    }, 0) / colors.length
    
    return avgBrightness < 128
  }

  isColorful(colors) {
    const uniqueHues = new Set(colors.map(c => rgbToHsl(c.rgb.r, c.rgb.g, c.rgb.b).h))
    return uniqueHues.size > 5
  }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
```

### Phase 2 方案: 集成商业API（推荐中期接入）

```javascript
// services/builderioService.js
export class BuilderIOService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://api.builder.io/api/v1/pixel-perfect'
  }

  async imageToCode(imageUrl, options = {}) {
    const response = await fetch(`${this.baseUrl}/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageUrl,
        output: {
          format: 'react', // 或 'html', 'vue'
          framework: 'vanilla', // 或 'nextjs', 'vue'
        },
        ...options,
      }),
    })

    if (!response.ok) {
      throw new Error(`Builder.io API错误: ${response.statusText}`)
    }

    return response.json()
  }
}
```

---

## 📚 模块六: H5营销页面模板系统设计

### 数据库表结构

```sql
CREATE TABLE `code_templates` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL COMMENT '模板名称',
  `description` TEXT COMMENT '模板描述',
  `category` ENUM(
    'promo_11_11',      -- 双11促销
    'promo_618',         -- 618大促
    'new_year',           -- 新年活动
    'product_launch',     -- 产品发布
    'brand_story',        -- 品牌故事
    'event_invite',       -- 活动邀请
    'coupon_center',      -- 领券中心
    'user_growth',        -- 用户增长
    'landing_page',       -- 落地页
    'app_download',       -- APP下载
    'membership',         -- 会员权益
    'flash_sale',         -- 秒杀活动
    'live_stream',        -- 直播预告
    'survey_form',        -- 问卷调研
    'thank_you',          -- 感谢页
    'coming_soon'         -- 敬请期待
  ) NOT NULL DEFAULT 'landing_page',
  
  `thumbnail` VARCHAR(500) NOT NULL COMMENT '缩略图URL',
  `preview_gif` VARCHAR(500) DEFAULT NULL COMMENT '动态预览GIF',
  
  `difficulty` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  `target_audience` ENUM('developer', 'designer', 'marketer', 'all') DEFAULT 'all',
  
  `tags` JSON DEFAULT NULL COMMENT '标签数组',
  `features` JSON DEFAULT NULL COMMENT ['animation', 'responsive', 'form', 'video']`,
  
  `base_files` JSON NOT NULL COMMENT '基础文件结构 [{name, content, language}]',
  `context` TEXT COMMENT '给AI的上下文提示词',
  `customizable_fields` JSON DEFAULT NULL COMMENT '可自定义字段 [{key, label, type, default}]`,
  
  `use_count` INT DEFAULT 0 COMMENT '使用次数',
  `rating_avg` DECIMAL(2,1) DEFAULT NULL COMMENT '平均评分',
  `status` ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  
  `created_by` INT COMMENT '创建者（0=系统预设）',
  `price` DECIMAL(10,2) DEFAULT 0.00 COMMENT '价格（0=免费）',
  
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_category` (`category`),
  INDEX `idx_difficulty` (`difficulty`),
  INDEX `idx_status` (`status`),
  INDEX `idx_use_count` (`use_count`),
  FULLTEXT KEY `ft_name_desc` (`name`, `description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码模板表';
```

### 模板示例数据

```sql
INSERT INTO `code_templates` (`name`, `description`, `category`, `thumbnail`, `difficulty`, `target_audience`, `tags`, `features`, `base_files`, `context`, `customizable_fields`, `status`) VALUES
(
  '双11狂欢促销页',
  '专为双11购物节设计的高转化率促销页面，包含倒计时、优惠券领取、商品展示等模块',
  'promo_11_11',
  '/templates/promo-11-11/thumb.jpg',
  'beginner',
  'marketer',
  '["双11", "促销", "电商", "倒计时", "优惠券"]',
  '["animation", "responsive", "form"]',
  -- base_files: 见下方详细内容
  '{"primary_color": "#FF0036", "secondary_color": "#FFA500", "bg_gradient": "linear-gradient(135deg, #FF0036, #FF4D4D)", "title_font": "\'PingFang SC\', sans-serif"}',
  '[{"key": "brand_name", "label": "品牌名称", "type": "text", "default": "我的店铺"}, {"key": "discount_rate", "label": "折扣力度", "type": "select", "options": ["5折起", "满减", "秒杀"], "default": "5折起"}, {"key": "end_date", "label": "活动截止日期", "type": "date", "default": "2026-11-11"}]',
  'published'
);
```

### base_files 详细内容（双11模板示例）

```json
{
  "index.html": "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>{{brand_name}} - 双11狂欢节</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <!-- Hero Section -->\n  <section class=\"hero\">\n    <div class=\"hero-content\">\n      <h1 class=\"hero-title\">{{brand_name}}</h1>\n      <p class=\"hero-subtitle\">双11狂欢节 {{discount_rate}}</p>\n      <div class=\"countdown\" id=\"countdown\">\n        <div class=\"time-unit\"><span id=\"days\">00</span><label>天</label></div>\n        <div class=\"time-unit\"><span id=\"hours\">00</span><label>时</label></div>\n        <div class=\"time-unit\"><span id=\"minutes\">00</span><label>分</label></div>\n        <div class=\"time-unit\"><span id=\"seconds\">00</span><label>秒</label></div>\n      </div>\n      <a href=\"#products\" class=\"cta-button\">立即抢购 →</a>\n    </div>\n  </section>\n\n  <!-- Products Grid -->\n  <section class=\"products\" id=\"products\">\n    <h2>热销爆款</h2>\n    <div class=\"product-grid\">\n      <div class=\"product-card\">\n        <img src=\"https://picsum.photos/300/300?random=1\" alt=\"产品1\">\n        <div class=\"product-info\">\n          <h3>爆款商品 A</h3>\n          <p class=\"original-price\">¥999</p>\n          <p class=\"sale-price\">¥{{discount_price}} <span class=\"tag\">{{discount_rate}}</span></p>\n        </div>\n      </div>\n      <!-- 更多产品... -->\n    </div>\n  </section>\n\n  <!-- Coupon Section -->\n  <section class=\"coupons\">\n    <h2>领券中心</h2>\n    <div class=\"coupon-list\">\n      <div class=\"coupon-item\">\n        <div class=\"coupon-value\">¥50</div>\n        <div class=\"coupon-condition\">满299可用</div>\n        <button class=\"coupon-btn\">立即领取</button>\n      </div>\n      <!-- 更多优惠券... -->\n    </div>\n  </section>\n\n  <footer class=\"page-footer\">\n    <p>&copy; 2026 {{brand_name}} All Rights Reserved.</p>\n  </footer>\n\n  <script src=\"script.js\"></script>\n</body>\n</html>",

  "style.css": ":root {\n  --primary: {{primary_color}};\n  --secondary: {{secondary_color}};\n  --bg-gradient: {{bg_gradient}};\n  --text-light: #ffffff;\n  --text-dark: #333333;\n}\n\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: {{title_font}}, -apple-system, BlinkMacSystemFont, sans-serif;\n  line-height: 1.6;\n  color: var(--text-dark);\n}\n\n/* Hero Section */\n.hero {\n  background: var(--bg-gradient);\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  color: var(--text-light);\n  padding: 20px;\n  position: relative;\n  overflow: hidden;\n}\n\n.hero::before {\n  content: '';\n  position: absolute;\n  top: -50%;\n  left: -50%;\n  width: 200%;\n  height: 200%;\n  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);\n  animation: pulse-bg 4s ease-in-out infinite;\n}\n\n@keyframes pulse-bg {\n  0%, 100% { transform: scale(1); opacity: 0.5; }\n  50% { transform: scale(1.1); opacity: 0.8; }\n}\n\n.hero-title {\n  font-size: clamp(2rem, 8vw, 5rem);\n  font-weight: 900;\n  text-shadow: 0 4px 20px rgba(0,0,0,0.3);\n  margin-bottom: 1rem;\n  animation: fadeInUp 1s ease-out;\n}\n\n.hero-subtitle {\n  font-size: clamp(1.2rem, 3vw, 2rem);\n  margin-bottom: 2rem;\n  animation: fadeInUp 1s ease-out 0.2s both;\n}\n\n/* Countdown Timer */\n.countdown {\n  display: flex;\n  gap: 1rem;\n  justify-content: center;\n  margin-bottom: 2rem;\n  animation: fadeInUp 1s ease-out 0.4s both;\n}\n\n.time-unit {\n  background: rgba(255,255,255,0.2);\n  backdrop-filter: blur(10px);\n  border-radius: 12px;\n  padding: 1rem 1.5rem;\n  min-width: 80px;\n}\n\n.time-unit span {\n  display: block;\n  font-size: 2.5rem;\n  font-weight: bold;\n  line-height: 1;\n}\n\n.time-unit label {\n  font-size: 0.875rem;\n  opacity: 0.8;\n}\n\n/* CTA Button */\n.cta-button {\n  display: inline-block;\n  background: var(--text-light);\n  color: var(--primary);\n  padding: 1rem 3rem;\n  border-radius: 50px;\n  font-size: 1.25rem;\n  font-weight: bold;\n  text-decoration: none;\n  transition: all 0.3s ease;\n  animation: fadeInUp 1s ease-out 0.6s both;\n  border: none;\n  cursor: pointer;\n}\n\n.cta-button:hover {\n  transform: translateY(-3px);\n  box-shadow: 0 10px 30px rgba(0,0,0,0.3);\n}\n\n/* Products Section */\n.products {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 4rem 20px;\n}\n\n.products h2 {\n  text-align: center;\n  font-size: 2rem;\n  margin-bottom: 3rem;\n}\n\n.product-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 2rem;\n}\n\n.product-card {\n  background: white;\n  border-radius: 16px;\n  overflow: hidden;\n  box-shadow: 0 4px 20px rgba(0,0,0,0.08);\n  transition: transform 0.3s ease, box-shadow 0.3s ease;\n}\n\n.product-card:hover {\n  transform: translateY(-8px);\n  box-shadow: 0 12px 40px rgba(0,0,0,0.15);\n}\n\n.product-card img {\n  width: 100%;\n  height: 280px;\n  object-fit: cover;\n}\n\n.product-info {\n  padding: 1.5rem;\n}\n\n.product-info h3 {\n  font-size: 1.125rem;\n  margin-bottom: 0.5rem;\n}\n\n.original-price {\n  text-decoration: line-through;\n  color: #999;\n  font-size: 0.875rem;\n}\n\n.sale-price {\n  color: var(--primary);\n  font-size: 1.5rem;\n  font-weight: bold;\n  margin-top: 0.25rem;\n}\n\n.tag {\n  background: var(--primary);\n  color: white;\n  padding: 2px 8px;\n  border-radius: 4px;\n  font-size: 0.75rem;\n  margin-left: 0.5rem;\n}\n\n/* Coupons Section */\n.coupons {\n  background: linear-gradient(to bottom, #fff5f5, #fff);\n  padding: 4rem 20px;\n}\n\n.coupons h2 {\n  text-align: center;\n  margin-bottom: 2rem;\n}\n\n.coupon-list {\n  max-width: 800px;\n  margin: 0 auto;\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 1.5rem;\n}\n\n.coupon-item {\n  background: white;\n  border: 2px dashed var(--primary);\n  border-radius: 12px;\n  padding: 1.5rem;\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n  transition: all 0.3s;\n}\n\n.coupon-item:hover {\n  border-style: solid;\n  background: #fffafa;\n}\n\n.coupon-value {\n  font-size: 2rem;\n  font-weight: bold;\n  color: var(--primary);\n  min-width: 60px;\n}\n\n.coupon-condition {\n  flex: 1;\n  color: #666;\n  font-size: 0.875rem;\n}\n\n.coupon-btn {\n  background: var(--primary);\n  color: white;\n  border: none;\n  padding: 0.5rem 1rem;\n  border-radius: 6px;\n  cursor: pointer;\n  font-weight: 500;\n  transition: opacity 0.2s;\n}\n\n.coupon-btn:hover {\n  opacity: 0.9;\n}\n\n/* Footer */\n.page-footer {\n  background: #222;\n  color: #999;\n  text-align: center;\n  padding: 2rem 20px;\n  font-size: 0.875rem;\n}\n\n/* Animations */\n@keyframes fadeInUp {\n  from {\n    opacity: 0;\n    transform: translateY(30px);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0);\n  }\n}\n\n/* Responsive Design */\n@media (max-width: 768px) {\n  .hero-title { font-size: 2rem; }\n  .hero-subtitle { font-size: 1.2rem; }\n  \n  .countdown { gap: 0.5rem; }\n  .time-unit { padding: 0.75rem 1rem; min-width: 60px; }\n  .time-unit span { font-size: 1.75rem; }\n  \n  .product-grid { grid-template-columns: 1fr; }\n  .coupon-list { grid-template-columns: 1fr; }\n}",

  "script.js": "// 双11促销页交互逻辑\n\ndocument.addEventListener('DOMContentLoaded', function() {\n  initCountdown();\n  initCouponButtons();\n  initScrollAnimations();\n});\n\n// 倒计时功能\nfunction initCountdown() {\n  const endDate = new Date('{{end_date}}T23:59:59').getTime();\n  \n  function updateCountdown() {\n    const now = new Date().getTime();\n    const distance = endDate - now;\n    \n    if (distance < 0) {\n      document.getElementById('countdown').innerHTML = '<p>活动已结束！</p>';\n      return;\n    }\n    \n    const days = Math.floor(distance / (1000 * 60 * 60 * 24));\n    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));\n    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));\n    const seconds = Math.floor((distance % (1000 * 60)) / 1000);\n    \n    document.getElementById('days').textContent = String(days).padStart(2, '0');\n    document.getElementById('hours').textContent = String(hours).padStart(2, '0');\n    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');\n    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');\n  }\n  \n  updateCountdown();\n  setInterval(updateCountdown, 1000); // 每秒更新\n}\n\n// 优惠券领取\nfunction initCouponButtons() {\n  document.querySelectorAll('.coupon-btn').forEach(btn => {\n    btn.addEventListener('click', function() {\n      const couponItem = this.closest('.coupon-item');\n      const value = couponItem.querySelector('.coupon-value').textContent;\n      \n      // 模拟领取动画\n      this.textContent = '已领取 ✓';\n      this.disabled = true;\n      this.style.background = '#52c41a';\n      couponItem.style.borderColor = '#52c41a';\n      couponItem.style.borderStyle = 'solid';\n      \n      // 显示Toast提示\n      showToast(`成功领取 ${value} 优惠券！`);\n    });\n  });\n}\n\n// Toast提示函数\nfunction showToast(message) {\n  const toast = document.createElement('div');\n  toast.className = 'toast';\n  toast.textContent = message;\n  toast.style.cssText = `\n    position: fixed;\n    top: 20px;\n    left: 50%;\n    transform: translateX(-50%);\n    background: rgba(0,0,0,0.8);\n    color: white;\n    padding: 12px 24px;\n    border-radius: 8px;\n    z-index: 9999;\n    animation: slideDown 0.3s ease;\n  `;\n  document.body.appendChild(toast);\n  \n  setTimeout(() => {\n    toast.style.animation = 'slideUp 0.3s ease';\n    setTimeout(() => toast.remove(), 300);\n  }, 2000);\n}\n\n// 滚动动画\nfunction initScrollAnimations() {\n  const observer = new IntersectionObserver((entries) => {\n    entries.forEach(entry => {\n      if (entry.isIntersecting) {\n        entry.target.style.opacity = '1';\n        entry.target.style.transform = 'translateY(0)';\n      }\n    });\n  }, { threshold: 0.1 });\n  \n  document.querySelectorAll('.product-card, .coupon-item').forEach(el => {\n    el.style.opacity = '0';\n    el.style.transform = 'translateY(30px)';\n    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';\n    observer.observe(el);\n  });\n}"
}
```

---

## 🗺️ 实施路线图（总览）

### Phase 1: MVP基础能力（第1-2周）

| 任务 | 优先级 | 预估工时 | 依赖项 |
|------|-------|---------|--------|
| 集成Monaco Editor | P0 | 4h | 无 |
| 实现iframe预览引擎 | P0 | 6h | 无 |
| JSZip打包下载功能 | P0 | 3h | 无 |
| 创建CodeStudio主页面 | P0 | 6h | 以上全部 |
| **小计** | | **19h** | |

**里程碑**: 用户可以手写代码 → 实时预览 → 下载ZIP

### Phase 2: AI能力集成（第3-4周）

| 任务 | 优先级 | 预估工时 | 依赖项 |
|------|-------|---------|--------|
| 后端NL2Code API | P0 | 8h | GLM API |
| 前端AI对话界面 | P0 | 6h | 后端API |
| Prompt工程优化 | P1 | 4h | 测试反馈 |
| 代码美化与格式化 | P2 | 2h | Prettier |
| **小计** | | **20h** | |

**里程碑**: 用户说"我要一个双11促销页" → AI生成代码 → 预览 → 下载

### Phase 3: 模板系统（第5-6周）

| 任务 | 优先级 | 预估工时 | 依赖项 |
|------|-------|---------|--------|
| 数据库设计与迁移 | P0 | 2h | TiDB |
| 5个核心模板开发 | P0 | 20h | 设计稿 |
| 模板选择与定制UI | P0 | 6h | 数据库 |
| 模板变量替换引擎 | P1 | 4h | 模板数据 |
| **小计** | | **32h** | |

**里程碑**: 用户选择"双11模板" → 填写品牌名 → 一键生成 → 下载

### Phase 4: 逆向工程（第7-8周）

| 任务 | 优先级 | 预估工时 | 依赖项 |
|------|-------|---------|--------|
| 图片上传与预处理 | P0 | 3h | 无 |
| 颜色提取算法 | P0 | 4h | Canvas API |
| 布局检测逻辑 | P1 | 6h | 图像处理 |
| AI辅助代码生成 | P1 | 4h | GLM视觉模型 |
| **小计** | | **17h** | |

**里程碑**: 用户上传设计稿 → 分析颜色/布局 → 生成近似代码 → 手动微调

---

## 💰 商业化路径规划

### 收入来源矩阵

| 时间节点 | 功能 | 定价模式 | 月收入预估 |
|---------|------|---------|-----------|
| Month 1-2 | 免费基础版（限速） | Freemium | $0（积累用户） |
| Month 3-4 | Pro会员（无限AI生成） | $9.9/月 | $1,000 |
| Month 5-6 | 模板市场（设计师分成） | 交易抽成30% | $3,000 |
| Month 7-8 | 企业私有部署 | $299/月 | $5,000 |
| Month 9-12 | API开放平台 | 按调用量 | $8,000+ |

### 关键指标(KPI)

| 指标 | Month 1 | Month 3 | Month 6 | Month 12 |
|------|---------|---------|---------|----------|
| DAU | 100 | 1,000 | 5,000 | 20,000 |
| 付费转化率 | 0% | 2% | 5% | 8% |
| ARPU | $0 | $5 | $15 | $25 |
| 模板数量 | 10 | 30 | 100 | 500+ |

---

## ⚠️ 风险评估与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| **AI生成质量不稳定** | 中 | 高 | 人工审核模板 + 用户反馈循环 |
| **Monaco Editor包体积过大** | 低 | 中 | 懒加载 + CDN加速 |
| **iframe安全漏洞** | 低 | 高 | 严格sandbox + CSP策略 |
| **竞品抄袭** | 高 | 中 | 快速迭代 + 建立模板壁垒 |
| **用户教育成本高** | 中 | 中 | 引导式教程 + 视频演示 |

---

## 🎯 下一步行动建议

老大！基于以上调研，我强烈建议我们**立即开始Phase 1的开发**，理由如下：

1. **技术风险低** - Monaco Editor + iframe都是成熟方案
2. **开发周期短** - 19小时即可完成MVP
3. **验证价值快** - 可以快速获得用户反馈
4. **为后续铺路** - 好的基础设施让后续AI集成更顺畅

### 你现在需要做的决策：

**选项A: 我立即开始编码** ✨ 推荐
我会按照以下顺序实施：
1. 安装依赖（monaco-editor-vue3, jszip, file-saver, qrcode）
2. 创建CodeStudioPage.vue主页面
3. 实现CodeEditor.vue组件
4. 实现PreviewPanel.vue组件
5. 实现打包下载功能
6. 集成到现有路由系统
7. 测试完整流程

**预计完成时间**: 今天内（4-6小时）

**选项B: 先看Demo再决定**
我可以先做一个简化的在线Demo（纯前端，无后端），让你体验核心交互流程。

**选项C: 继续细化方案**
如果你觉得还有细节需要讨论，我们可以继续深入某个具体模块。

---

**请告诉我你的选择，老大！我随时准备开始编码！** 🚀
