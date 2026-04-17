<template>
  <Transition name="fade">
    <div v-if="visible" class="shortcut-help-overlay" @click="close">
      <div class="shortcut-help-panel" @click.stop>
        <div class="panel-header">
          <h3>⌨️ 快捷键</h3>
          <el-icon class="close-btn" @click="close"><Close /></el-icon>
        </div>
        <div class="panel-body">
          <div v-for="group in groupedShortcuts" :key="group.scope" class="shortcut-group">
            <h4 class="group-title">{{ group.label }}</h4>
            <div v-for="item in group.shortcuts" :key="item.combo" class="shortcut-item">
              <div class="shortcut-keys">
                <kbd v-for="key in item.combo.split('+')" :key="key" class="key-badge">{{ key.trim() }}</kbd>
              </div>
              <span class="shortcut-desc">{{ item.description }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { getRegisteredShortcuts, onHelpToggle, toggleHelp } from '@/composables/useHotkey'

const visible = ref(false)

const scopeLabels = {
  global: '全局',
  editor: '编辑器',
  ai: 'AI 内容',
  gallery: '作品库',
}

const defaultShortcuts = [
  { combo: 'ctrl+k', description: '搜索', scope: 'global' },
  { combo: 'ctrl+/', description: '快捷键帮助', scope: 'global' },
  { combo: 'ctrl+shift+d', description: '切换暗色模式', scope: 'global' },
  { combo: 'ctrl+enter', description: '生成/提交', scope: 'ai' },
  { combo: 'ctrl+s', description: '保存', scope: 'editor' },
  { combo: 'ctrl+b', description: '切换侧边栏', scope: 'editor' },
  { combo: 'ctrl+h', description: '切换搜索', scope: 'editor' },
  { combo: 'escape', description: '取消/关闭', scope: 'global' },
]

const groupedShortcuts = computed(() => {
  const registered = getRegisteredShortcuts()
  const all = [...defaultShortcuts]
  for (const s of registered) {
    if (!all.find((d) => d.combo === s.combo && d.scope === s.scope)) {
      all.push({ combo: s.combo, description: s.handler?.description || s.combo, scope: s.scope })
    }
  }

  const groups = {}
  for (const item of all) {
    const scope = item.scope || 'global'
    if (!groups[scope]) groups[scope] = { scope, label: scopeLabels[scope] || scope, shortcuts: [] }
    if (!groups[scope].shortcuts.find((s) => s.combo === item.combo)) {
      groups[scope].shortcuts.push(item)
    }
  }
  return Object.values(groups)
})

function close() {
  visible.value = false
}

function onKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault()
    toggleHelp()
  }
  if (e.key === 'Escape' && visible.value) {
    e.preventDefault()
    close()
  }
}

const removeListener = onHelpToggle((v) => {
  visible.value = v
})

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  removeListener()
})
</script>

<style lang="scss" scoped>
.shortcut-help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.shortcut-help-panel {
  background: var(--bg-white, #fff);
  border-radius: 16px;
  width: 520px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-lighter, #ebeef5);

    h3 {
      margin: 0;
      font-size: 18px;
      color: var(--text-primary, #303133);
    }

    .close-btn {
      cursor: pointer;
      font-size: 20px;
      color: var(--text-secondary, #909399);
      transition: color 0.2s;

      &:hover {
        color: var(--text-primary, #303133);
      }
    }
  }

  .panel-body {
    padding: 16px 24px 24px;
    overflow-y: auto;
  }

  .shortcut-group {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .group-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary, #909399);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 10px;
    }
  }

  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;

    .shortcut-keys {
      display: flex;
      gap: 4px;
    }

    .shortcut-desc {
      font-size: 14px;
      color: var(--text-regular, #606266);
    }
  }

  .key-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 26px;
    padding: 0 8px;
    background: var(--fill-light, #f5f7fa);
    border: 1px solid var(--border-light, #dcdfe6);
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    color: var(--text-primary, #303133);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
