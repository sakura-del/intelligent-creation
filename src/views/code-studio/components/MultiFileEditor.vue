<template>
  <div class="multi-file-editor">
    <div class="editor-layout">
      <div v-if="showFileTree" class="file-tree-panel">
        <div class="file-tree-header">
          <span class="tree-title">资源管理器</span>
          <div class="tree-actions">
            <button class="tree-action-btn" @click="showAddDialog = true" title="新建文件">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </button>
            <button class="tree-action-btn" @click="collapseAll" title="折叠全部">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            </button>
          </div>
        </div>

        <div class="file-tree-body">
          <div v-for="group in fileGroups" :key="group.name" class="file-group">
            <div class="group-header" @click="toggleGroup(group.name)">
              <span class="group-arrow">{{ expandedGroups.has(group.name) ? '▾' : '▸' }}</span>
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-name">{{ group.label }}</span>
              <span class="group-count">{{ group.files.length }}</span>
            </div>

            <div v-if="expandedGroups.has(group.name)" class="group-files">
              <div v-for="file in group.files" :key="file.name"
                class="tree-file-item"
                :class="{ active: activeFile === file.name, modified: modifiedFiles.has(file.name) }"
                @click="switchFile(file.name)"
                @contextmenu.prevent="showContextMenu($event, file.name)">
                <span class="tree-file-icon">{{ getFileIcon(file.name) }}</span>
                <span class="tree-file-name">{{ file.name }}</span>
                <span class="tree-file-size">{{ formatFileSize(file.content?.length || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-main">
        <div class="file-tabs">
          <button class="toggle-tree-btn" @click="showFileTree = !showFileTree" title="切换文件树">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </button>

          <div v-for="file in files" :key="file.name" class="file-tab" :class="{ active: activeFile === file.name, modified: modifiedFiles.has(file.name) }"
            @click="switchFile(file.name)" @contextmenu.prevent="showContextMenu($event, file.name)">
            <span class="file-icon">{{ getFileIcon(file.name) }}</span>
            <span v-if="renamingFile === file.name" class="rename-input-wrapper">
              <input ref="renameInput" v-model="renameValue" class="rename-input"
                @keyup.enter="confirmRename" @keyup.escape="cancelRename" @blur="confirmRename" />
            </span>
            <span v-else class="file-name">{{ file.name }}</span>
            <button v-if="files.length > 1 && file.name !== 'index.html'" class="close-btn"
              @click.stop="removeFile(file.name)">×</button>
          </div>
          <button v-if="canAddFile" class="add-file-btn" @click="showAddDialog = true" title="添加新文件">+</button>
          <div class="tab-actions">
            <button class="action-btn" @click="toggleSearch" title="搜索替换 (Ctrl+H)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>
        </div>

        <div v-if="showSearchPanel" class="search-panel">
          <div class="search-row">
            <input v-model="searchQuery" class="search-input" placeholder="搜索..." @keyup.enter="findNext" />
            <input v-model="replaceQuery" class="search-input" placeholder="替换为..." />
            <button class="search-btn" @click="findNext" :disabled="!searchQuery">下一个</button>
            <button class="search-btn" @click="replaceCurrent" :disabled="!searchQuery">替换</button>
            <button class="search-btn" @click="replaceAll" :disabled="!searchQuery">全部替换</button>
            <span class="search-info">{{ searchResultCount }} 个结果</span>
            <button class="search-close" @click="toggleSearch">×</button>
          </div>
        </div>

        <CodeEditor v-model="currentFileContent" :language="currentLanguage" :height="editorHeight"
          @change="handleContentChange" />
      </div>
    </div>

    <el-dialog v-model="showAddDialog" title="添加新文件" width="400px">
      <el-form label-width="80px">
        <el-form-item label="文件名">
          <el-input v-model="newFileName" placeholder="例如: utils.js">
            <template #prepend>{{ newFileType }}</template>
          </el-input>
        </el-form-item>
        <el-form-item label="文件类型">
          <el-radio-group v-model="newFileType" size="small">
            <el-radio-button value=".html">HTML</el-radio-button>
            <el-radio-button value=".css">CSS</el-radio-button>
            <el-radio-button value=".js">JS</el-radio-button>
            <el-radio-button value=".json">JSON</el-radio-button>
            <el-radio-button value=".md">MD</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!newFileName.trim()" @click="addNewFile">添加</el-button>
      </template>
    </el-dialog>

    <teleport to="body">
      <div v-if="contextMenu.visible" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }">
        <div class="context-menu-item" @click="startRename(contextMenu.fileName)">重命名</div>
        <div class="context-menu-item" @click="duplicateFile(contextMenu.fileName)">复制文件</div>
        <div v-if="contextMenu.fileName !== 'index.html' && files.length > 1" class="context-menu-item danger"
          @click="removeFile(contextMenu.fileName)">删除</div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import CodeEditor from './CodeEditor.vue'

const props = defineProps({
  files: {
    type: Array,
    default: () => [
      { name: 'index.html', content: '', language: 'html' },
      { name: 'style.css', content: '', language: 'css' },
      { name: 'script.js', content: '', language: 'javascript' },
    ],
  },
  canAddFile: { type: Boolean, default: true },
})

const emit = defineEmits(['update:files', 'file-change'])

const activeFile = ref('index.html')
const showAddDialog = ref(false)
const newFileName = ref('')
const newFileType = ref('.js')
const modifiedFiles = ref(new Set())
const showFileTree = ref(true)
const expandedGroups = ref(new Set(['html', 'css', 'js']))

const showSearchPanel = ref(false)
const searchQuery = ref('')
const replaceQuery = ref('')
const searchResultCount = ref(0)

const renamingFile = ref(null)
const renameValue = ref('')
const renameInput = ref(null)

const contextMenu = ref({ visible: false, x: 0, y: 0, fileName: '' })

const editorHeight = computed(() => {
  let offset = 40
  if (showSearchPanel.value) offset += 40
  return `calc(100% - ${offset}px)`
})

const currentFile = computed(() =>
  props.files.find(f => f.name === activeFile.value),
)

const currentFileContent = computed({
  get: () => currentFile.value?.content || '',
  set: (val) => updateFileContent(activeFile.value, val),
})

const currentLanguage = computed(() => currentFile.value?.language || 'html')

const fileGroups = computed(() => {
  const groups = [
    { name: 'html', label: 'HTML', icon: '🌐', files: [] },
    { name: 'css', label: '样式表', icon: '🎨', files: [] },
    { name: 'js', label: '脚本', icon: '⚡', files: [] },
    { name: 'other', label: '其他', icon: '📄', files: [] },
  ]

  props.files.forEach(file => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'html' || ext === 'htm') {
      groups[0].files.push(file)
    } else if (ext === 'css') {
      groups[1].files.push(file)
    } else if (ext === 'js') {
      groups[2].files.push(file)
    } else {
      groups[3].files.push(file)
    }
  })

  return groups.filter(g => g.files.length > 0)
})

function switchFile(name) {
  activeFile.value = name
}

function removeFile(name) {
  const newFiles = props.files.filter(f => f.name !== name)
  emit('update:files', newFiles)
  if (activeFile.value === name && newFiles.length > 0) {
    activeFile.value = newFiles[0].name
  }
  hideContextMenu()
}

function updateFileContent(name, content) {
  const newFiles = props.files.map(f =>
    f.name === name ? { ...f, content } : f,
  )
  modifiedFiles.value.add(name)
  emit('update:files', newFiles)
  emit('file-change', { name, content })
}

function addNewFile() {
  const fullName = newFileName.value.includes('.')
    ? newFileName.value
    : newFileName.value + newFileType.value

  if (props.files.some(f => f.name === fullName)) {
    return
  }

  const langMap = {
    '.html': 'html',
    '.css': 'css',
    '.js': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
  }

  const newFile = {
    name: fullName,
    content: getDefaultContent(fullName),
    language: langMap[newFileType.value] || 'plaintext',
  }

  emit('update:files', [...props.files, newFile])
  activeFile.value = fullName

  const ext = fullName.split('.').pop()?.toLowerCase()
  if (ext === 'html' || ext === 'htm') expandedGroups.value.add('html')
  else if (ext === 'css') expandedGroups.value.add('css')
  else if (ext === 'js') expandedGroups.value.add('js')
  else expandedGroups.value.add('other')

  showAddDialog.value = false
  newFileName.value = ''
}

function duplicateFile(name) {
  const source = props.files.find(f => f.name === name)
  if (!source) return

  const ext = name.substring(name.lastIndexOf('.'))
  const baseName = name.substring(0, name.lastIndexOf('.'))
  let newName = `${baseName}-copy${ext}`
  let counter = 1
  while (props.files.some(f => f.name === newName)) {
    newName = `${baseName}-copy${counter}${ext}`
    counter++
  }

  emit('update:files', [...props.files, { ...source, name: newName }])
  activeFile.value = newName
  hideContextMenu()
}

function getDefaultContent(filename) {
  if (filename.endsWith('.html')) {
    return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n</head>\n<body>\n  \n</body>\n</html>'
  }
  if (filename.endsWith('.css')) {
    return `/* ${filename} */\n`
  }
  if (filename.endsWith('.json')) {
    return '{\n  \n}'
  }
  if (filename.endsWith('.md')) {
    return `# Title\n`
  }
  return `// ${filename}\n`
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()
  const icons = { html: '🌐', css: '🎨', js: '⚡', json: '📋', md: '📝' }
  return icons[ext] || '📄'
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`
  return `${(bytes / 1024 / 1024).toFixed(1)}M`
}

function toggleGroup(groupName) {
  if (expandedGroups.value.has(groupName)) {
    expandedGroups.value.delete(groupName)
  } else {
    expandedGroups.value.add(groupName)
  }
}

function collapseAll() {
  expandedGroups.value.clear()
}

function toggleSearch() {
  showSearchPanel.value = !showSearchPanel.value
  if (!showSearchPanel.value) {
    searchQuery.value = ''
    replaceQuery.value = ''
    searchResultCount.value = 0
  }
}

function findNext() {
  if (!searchQuery.value || !currentFile.value) return
  const content = currentFile.value.content
  const regex = new RegExp(searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const matches = content.match(regex)
  searchResultCount.value = matches ? matches.length : 0
}

function replaceCurrent() {
  if (!searchQuery.value || !currentFile.value) return
  const content = currentFile.value.content
  const regex = new RegExp(searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const newContent = content.replace(regex, replaceQuery.value)
  if (newContent !== content) {
    updateFileContent(activeFile.value, newContent)
    findNext()
  }
}

function replaceAll() {
  if (!searchQuery.value || !currentFile.value) return
  const content = currentFile.value.content
  const regex = new RegExp(searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const newContent = content.replace(regex, replaceQuery.value)
  if (newContent !== content) {
    updateFileContent(activeFile.value, newContent)
    findNext()
  }
}

function showContextMenu(event, fileName) {
  contextMenu.value = { visible: true, x: event.clientX, y: event.clientY, fileName }
}

function hideContextMenu() {
  contextMenu.value.visible = false
}

function startRename(fileName) {
  renamingFile.value = fileName
  renameValue.value = fileName
  hideContextMenu()
  nextTick(() => {
    const input = document.querySelector('.rename-input')
    if (input) {
      const dotIndex = fileName.lastIndexOf('.')
      input.focus()
      input.setSelectionRange(0, dotIndex > 0 ? dotIndex : fileName.length)
    }
  })
}

function confirmRename() {
  if (!renamingFile.value || !renameValue.value.trim()) {
    cancelRename()
    return
  }

  const oldName = renamingFile.value
  const newName = renameValue.value.trim()

  if (oldName === newName) {
    cancelRename()
    return
  }

  if (props.files.some(f => f.name === newName)) {
    cancelRename()
    return
  }

  const ext = newName.substring(newName.lastIndexOf('.') + 1).toLowerCase()
  const langMap = { html: 'html', css: 'css', js: 'javascript', json: 'json', md: 'markdown' }

  const newFiles = props.files.map(f =>
    f.name === oldName ? { ...f, name: newName, language: langMap[ext] || f.language } : f,
  )

  emit('update:files', newFiles)

  if (activeFile.value === oldName) {
    activeFile.value = newName
  }

  renamingFile.value = null
  renameValue.value = ''
}

function cancelRename() {
  renamingFile.value = null
  renameValue.value = ''
}

function handleContentChange(content) {
}

function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
    e.preventDefault()
    toggleSearch()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault()
    showFileTree.value = !showFileTree.value
  }
  if (contextMenu.value.visible) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped>
.multi-file-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.editor-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.file-tree-panel {
  width: 200px;
  min-width: 160px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
}

.file-tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.tree-title {
  color: #bbb;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.tree-action-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.tree-action-btn:hover {
  color: #fff;
  background: #3c3c3c;
}

.file-tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.file-tree-body::-webkit-scrollbar {
  width: 4px;
}

.file-tree-body::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 2px;
}

.file-group {
  margin-bottom: 2px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
}

.group-header:hover {
  background: #2a2d2e;
}

.group-arrow {
  font-size: 10px;
  width: 12px;
  text-align: center;
}

.group-icon {
  font-size: 12px;
}

.group-name {
  flex: 1;
}

.group-count {
  color: #666;
  font-size: 10px;
  background: #3c3c3c;
  padding: 0 6px;
  border-radius: 8px;
}

.group-files {
  padding: 0;
}

.tree-file-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px 3px 28px;
  cursor: pointer;
  font-size: 13px;
  color: #ccc;
  transition: background 0.15s;
  user-select: none;
}

.tree-file-item:hover {
  background: #2a2d2e;
}

.tree-file-item.active {
  background: #37373d;
  color: #fff;
}

.tree-file-item.modified .tree-file-name::after {
  content: ' ●';
  color: #e8ab6a;
  font-size: 8px;
}

.tree-file-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.tree-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.tree-file-size {
  color: #555;
  font-size: 10px;
  flex-shrink: 0;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.file-tabs {
  display: flex;
  background: #252526;
  padding: 0 8px;
  gap: 2px;
  border-bottom: 1px solid #3c3c3c;
  overflow-x: auto;
  align-items: center;
}

.file-tabs::-webkit-scrollbar { height: 4px; }
.file-tabs::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }

.toggle-tree-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  margin-right: 4px;
}

.toggle-tree-btn:hover { color: #fff; background: #333; }

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
  white-space: nowrap;
  user-select: none;
  position: relative;
}

.file-tab:hover { background: #2d2d2d; color: #fff; }

.file-tab.active { background: #1e1e1e; color: #fff; border-bottom-color: #007acc; }

.file-tab.modified::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e8ab6a;
}

.rename-input-wrapper { display: inline-flex; }

.rename-input {
  background: #3c3c3c;
  border: 1px solid #007acc;
  color: #fff;
  font-size: 13px;
  padding: 1px 4px;
  border-radius: 2px;
  width: 120px;
  outline: none;
}

.close-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
  font-size: 14px;
  margin-left: 4px;
}

.close-btn:hover { background: #c00; color: #fff; }

.add-file-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 16px;
  align-self: center;
}

.add-file-btn:hover { color: #fff; background: #333; }

.tab-actions {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
}

.action-btn:hover { color: #fff; background: #333; }

.search-panel {
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  padding: 8px 12px;
}

.search-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input {
  background: #3c3c3c;
  border: 1px solid #555;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  width: 180px;
  outline: none;
}

.search-input:focus { border-color: #007acc; }

.search-btn {
  background: #0e639c;
  border: none;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.search-btn:hover { background: #1177bb; }
.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.search-info { color: #888; font-size: 12px; margin-left: 4px; }

.search-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 16px;
  margin-left: auto;
}

.search-close:hover { color: #fff; }

.context-menu {
  position: fixed;
  background: #252526;
  border: 1px solid #454545;
  border-radius: 6px;
  padding: 4px 0;
  z-index: 10000;
  min-width: 140px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.context-menu-item {
  padding: 8px 16px;
  color: #ccc;
  font-size: 13px;
  cursor: pointer;
}

.context-menu-item:hover { background: #094771; color: #fff; }
.context-menu-item.danger:hover { background: #5a1d1d; color: #f48771; }
</style>
