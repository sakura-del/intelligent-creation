﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="property-panel">
    <div v-if="!selectedComponent" class="empty-panel">
      <el-empty description="选择组件以编辑属性" :image-size="80" />
    </div>

    <template v-else>
      <div class="panel-header">
        <div class="comp-info">
          <span class="comp-icon">{{ getComponentIcon(selectedComponent.type) }}</span>
          <span class="comp-name">{{ selectedComponent.name }}</span>
          <span class="comp-type">{{ selectedComponent.type }}</span>
        </div>
        <div class="comp-actions">
          <el-button size="small" text type="primary" @click="$emit('duplicate', selectedComponent.id)" title="复制">
            📋
          </el-button>
          <el-button size="small" text type="danger" @click="$emit('delete', selectedComponent.id)" title="删除">
            🗑️
          </el-button>
        </div>
      </div>

      <div class="panel-body">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="属性" name="props">
            <div class="props-section">
              <div v-for="schema in currentSchema" :key="schema.key" class="prop-item">
                <label class="prop-label">{{ schema.label }}</label>

                <el-input v-if="schema.type === 'string'" v-model="propValues[schema.key]" size="small"
                  @change="onPropChange(schema.key, $event)" />

                <el-input v-else-if="schema.type === 'textarea'" v-model="propValues[schema.key]" type="textarea"
                  :rows="3" size="small" @change="onPropChange(schema.key, $event)" />

                <el-input-number v-else-if="schema.type === 'number'" v-model="propValues[schema.key]" size="small"
                  :min="schema.min" :max="schema.max" @change="onPropChange(schema.key, $event)" />

                <el-switch v-else-if="schema.type === 'boolean'" v-model="propValues[schema.key]" size="small"
                  @change="onPropChange(schema.key, $event)" />

                <el-color-picker v-else-if="schema.type === 'color'" v-model="propValues[schema.key]" size="small"
                  @change="onPropChange(schema.key, $event)" />

                <el-select v-else-if="schema.type === 'select'" v-model="propValues[schema.key]" size="small"
                  @change="onPropChange(schema.key, $event)">
                  <el-option v-for="opt in schema.options" :key="opt" :label="opt" :value="opt" />
                </el-select>

                <el-input v-else v-model="propValues[schema.key]" size="small"
                  @change="onPropChange(schema.key, $event)" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="样式" name="style">
            <div class="props-section">
              <div class="prop-item">
                <label class="prop-label">宽度</label>
                <el-input v-model="styleValues.width" size="small" placeholder="auto"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">高度</label>
                <el-input v-model="styleValues.height" size="small" placeholder="auto"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">外边距</label>
                <el-input v-model="styleValues.margin" size="small" placeholder="0"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">内边距</label>
                <el-input v-model="styleValues.padding" size="small" placeholder="0"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">背景色</label>
                <el-color-picker v-model="styleValues.background" size="small" @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">圆角</label>
                <el-input v-model="styleValues.borderRadius" size="small" placeholder="0"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">边框</label>
                <el-input v-model="styleValues.border" size="small" placeholder="none"
                  @change="onStyleChange" />
              </div>
              <div class="prop-item">
                <label class="prop-label">透明度</label>
                <el-slider v-model="styleValues.opacity" :min="0" :max="100" size="small"
                  @change="onStyleChange" />
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="高级" name="advanced">
            <div class="props-section">
              <div class="prop-item">
                <label class="prop-label">组件ID</label>
                <el-input :model-value="selectedComponent.id" size="small" readonly />
              </div>
              <div class="prop-item">
                <label class="prop-label">组件类型</label>
                <el-input :model-value="selectedComponent.type" size="small" readonly />
              </div>
              <div class="prop-item">
                <label class="prop-label">是否容器</label>
                <el-switch :model-value="selectedComponent.isContainer" size="small" disabled />
              </div>
              <div class="prop-item">
                <label class="prop-label">子组件数</label>
                <el-input :model-value="selectedComponent.children?.length || 0" size="small" readonly />
              </div>
              <div class="prop-item">
                <label class="prop-label">自定义类名</label>
                <el-input v-model="customClassName" size="small" placeholder="CSS类名"
                  @change="onStyleChange" />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getComponentByType } from '../data/presetComponents.js'

const props = defineProps({
  selectedComponent: { type: Object, default: null },
})

const emit = defineEmits(['update-props', 'delete', 'duplicate'])

const activeTab = ref('props')
const propValues = ref({})
const styleValues = ref({
  width: '',
  height: '',
  margin: '',
  padding: '',
  background: '',
  borderRadius: '',
  border: '',
  opacity: 100,
})
const customClassName = ref('')

const currentSchema = computed(() => {
  if (!props.selectedComponent) return []
  const compDef = getComponentByType(props.selectedComponent.type)
  return compDef?.propsSchema || []
})

watch(() => props.selectedComponent, (comp) => {
  if (comp) {
    propValues.value = { ...comp.props }

    const existingStyle = comp.props?._customStyle || {}
    styleValues.value = {
      width: existingStyle.width || '',
      height: existingStyle.height || '',
      margin: existingStyle.margin || '',
      padding: existingStyle.padding || '',
      background: existingStyle.background || '',
      borderRadius: existingStyle.borderRadius || '',
      border: existingStyle.border || '',
      opacity: existingStyle.opacity ?? 100,
    }
    customClassName.value = comp.props?._className || ''
  }
}, { immediate: true, deep: true })

function onPropChange(key, value) {
  emit('update-props', props.selectedComponent.id, { [key]: value })
}

function onStyleChange() {
  const customStyle = { ...styleValues.value }
  Object.keys(customStyle).forEach(k => {
    if (!customStyle[k] && k !== 'opacity') delete customStyle[k]
  })
  emit('update-props', props.selectedComponent.id, {
    _customStyle: customStyle,
    _className: customClassName.value,
  })
}

function getComponentIcon(type) {
  const compDef = getComponentByType(type)
  return compDef?.icon || '📦'
}
</script>

<style scoped>
.property-panel {
  width: 300px;
  min-width: 300px;
  background: var(--bg-white);
  border-left: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.comp-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comp-icon {
  font-size: 18px;
}

.comp-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.comp-type {
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--fill-base);
  padding: 1px 6px;
  border-radius: 4px;
}

.comp-actions {
  display: flex;
  gap: 4px;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.panel-body::-webkit-scrollbar {
  width: 4px;
}

.panel-body::-webkit-scrollbar-thumb {
  background: var(--fill-base);
  border-radius: 2px;
}

.props-section {
  padding-top: 12px;
}

.prop-item {
  margin-bottom: 14px;
}

.prop-label {
  display: block;
  font-size: 12px;
  color: var(--text-regular);
  font-weight: 500;
  margin-bottom: 6px;
}
</style>
