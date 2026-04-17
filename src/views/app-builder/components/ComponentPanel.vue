﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="component-panel">
    <div class="panel-header">
      <h3>🧩 组件库</h3>
      <el-input v-model="searchKeyword" placeholder="搜索组件..." size="small" prefix-icon="Search" clearable />
    </div>

    <div class="panel-body">
      <div v-for="category in filteredCategories" :key="category.key" class="component-category">
        <div class="category-header" @click="toggleCategory(category.key)">
          <span class="category-arrow">{{ expandedCategories.has(category.key) ? '▾' : '▸' }}</span>
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ category.label }}</span>
          <span class="category-count">{{ getCategoryCount(category.key) }}</span>
        </div>

        <div v-if="expandedCategories.has(category.key)" class="category-items">
          <div v-for="comp in getCategoryComponents(category.key)" :key="comp.type" class="component-item"
            draggable="true" @dragstart="onDragStart($event, comp)" @dragend="onDragEnd">
            <span class="comp-icon">{{ comp.icon }}</span>
            <span class="comp-name">{{ comp.name }}</span>
            <span class="comp-desc">{{ comp.description }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { componentCategories, presetComponents, getComponentsByCategory } from '../data/presetComponents.js'

const emit = defineEmits(['drag-start', 'drag-end'])

const searchKeyword = ref('')
const expandedCategories = ref(new Set(['layout', 'basic', 'form']))

const filteredCategories = computed(() => {
  if (!searchKeyword.value) return componentCategories
  return componentCategories.filter(cat => {
    const comps = getComponentsByCategory(cat.key)
    return comps.some(c =>
      c.name.includes(searchKeyword.value) ||
      c.description.includes(searchKeyword.value) ||
      c.type.includes(searchKeyword.value.toLowerCase())
    )
  })
})

function getCategoryCount(key) {
  return getComponentsByCategory(key).length
}

function getCategoryComponents(key) {
  const comps = getComponentsByCategory(key)
  if (!searchKeyword.value) return comps
  return comps.filter(c =>
    c.name.includes(searchKeyword.value) ||
    c.description.includes(searchKeyword.value) ||
    c.type.includes(searchKeyword.value.toLowerCase())
  )
}

function toggleCategory(key) {
  if (expandedCategories.value.has(key)) {
    expandedCategories.value.delete(key)
  } else {
    expandedCategories.value.add(key)
  }
}

function onDragStart(event, comp) {
  emit('drag-start', event, comp)
}

function onDragEnd() {
  emit('drag-end')
}
</script>

<style scoped>
.component-panel {
  width: 260px;
  min-width: 260px;
  background: var(--bg-white);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0 0 10px;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 600;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.panel-body::-webkit-scrollbar {
  width: 4px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: var(--fill-base);
  border-radius: 2px;
}

.component-category {
  margin-bottom: 4px;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-regular);
  transition: background 0.15s;
}

.category-header:hover {
  background: var(--bg-color);
}

.category-arrow {
  font-size: 10px;
  width: 12px;
  text-align: center;
  color: var(--text-secondary);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  flex: 1;
}

.category-count {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--fill-base);
  padding: 0 6px;
  border-radius: 8px;
  font-weight: 400;
}

.category-items {
  padding: 4px 8px;
}

.component-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border: 1px solid var(--border-lighter);
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
}

.component-item:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.component-item:active {
  cursor: grabbing;
  opacity: 0.7;
}

.comp-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.comp-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 50px;
}

.comp-desc {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
