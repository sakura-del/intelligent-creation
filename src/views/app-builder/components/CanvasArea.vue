﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="canvas-area" @click="onCanvasClick" @dragover.prevent="onCanvasDragOver" @drop="onCanvasDrop">
    <div class="canvas-toolbar">
      <div class="toolbar-left">
        <span class="canvas-title">🎨 画布</span>
        <el-tag size="small" type="info">{{ componentCount }} 个组件</el-tag>
      </div>
      <div class="toolbar-right">
        <el-button-group size="small">
          <el-button :disabled="!canUndo" @click="$emit('undo')">↩️ 撤销</el-button>
          <el-button :disabled="!canRedo" @click="$emit('redo')">↪️ 重做</el-button>
        </el-button-group>
        <el-button size="small" type="danger" plain @click="confirmClear" :disabled="componentCount === 0">
          🗑️ 清空
        </el-button>
        <el-divider direction="vertical" />
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="desktop">🖥️</el-radio-button>
          <el-radio-button value="tablet">📱</el-radio-button>
          <el-radio-button value="mobile">📲</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="canvas-scroll-area">
      <div class="canvas-content" :class="viewMode" @click.self="onCanvasContentClick">
        <div v-if="components.length === 0" class="canvas-empty" @dragover.prevent @drop.stop="onCanvasDrop">
          <div class="empty-icon">🎨</div>
          <h3>从左侧拖拽组件到这里</h3>
          <p>或双击左侧组件快速添加</p>
        </div>

        <ComponentRenderer v-for="comp in components" :key="comp.id" :component="comp"
          :selected-id="selectedId" @select="(id) => $emit('select', id)"
          @drop-component="(data) => $emit('drop-component', data)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import ComponentRenderer from './ComponentRenderer.vue'

defineProps({
  components: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
  componentCount: { type: Number, default: 0 },
  canUndo: { type: Boolean, default: false },
  canRedo: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'drop', 'undo', 'redo', 'clear', 'deselect'])

const viewMode = ref('desktop')

function onCanvasClick() {
  emit('deselect')
}

function onCanvasContentClick() {
  emit('deselect')
}

function onCanvasDragOver(event) {
  event.dataTransfer.dropEffect = 'copy'
}

function onCanvasDrop(event) {
  emit('drop', event)
}

async function confirmClear() {
  try {
    await ElMessageBox.confirm('确定要清空画布吗？此操作不可撤销。', '确认清空', {
      confirmButtonText: '确定清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    emit('clear')
  } catch {
    // cancelled
  }
}
</script>

<style scoped>
.canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--fill-base);
  overflow: hidden;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.canvas-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.canvas-scroll-area {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
}

.canvas-content {
  background: var(--bg-white);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  min-height: 500px;
  transition: width 0.3s ease;
}

.canvas-content.desktop {
  width: 100%;
  max-width: 1200px;
}

.canvas-content.tablet {
  width: 768px;
}

.canvas-content.mobile {
  width: 375px;
}

.canvas-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-placeholder);
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px;
  transition: all 0.2s;
}

.canvas-empty:hover {
  border-color: var(--color-primary);
  background: rgba(64, 158, 255, 0.02);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.canvas-empty h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--text-secondary);
  font-weight: 500;
}

.canvas-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--text-placeholder);
}
</style>
