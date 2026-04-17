﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="component-renderer" :class="{
    selected: isSelected,
    hovered: isHovered,
    'is-container': component.isContainer,
    'has-children': component.children?.length > 0,
  }" :style="customStyle" @click.stop="onSelect" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave"
    @dragover.prevent="onCompDragOver" @dragleave="onCompDragLeave" @drop.stop="onCompDrop">

    <div v-if="isSelected" class="selection-border">
      <span class="selection-label">{{ component.name }}</span>
    </div>

    <div v-if="isHovered && !isSelected" class="hover-border"></div>

    <div v-if="component.isContainer && (!component.children || component.children.length === 0)"
      class="container-placeholder">
      <span>拖拽组件到此处</span>
    </div>

    <component :is="renderComponent" v-bind="componentProps">
      <template v-if="component.isContainer && component.children?.length">
        <ComponentRenderer v-for="child in component.children" :key="child.id" :component="child"
          :selected-id="selectedId" @select="(id) => $emit('select', id)"
          @drop-component="(data) => $emit('drop-component', data)" />
      </template>
    </component>
  </div>
</template>

<script setup>
import { computed, h, defineComponent } from 'vue'
import { getComponentByType } from '../data/presetComponents.js'

const props = defineProps({
  component: { type: Object, required: true },
  selectedId: { type: String, default: null },
})

const emit = defineEmits(['select', 'drop-component'])

const isSelected = computed(() => props.selectedId === props.component.id)
const isHovered = computed(false)

const customStyle = computed(() => {
  const style = props.component.props?._customStyle || {}
  const result = {}
  if (style.width) result.width = style.width
  if (style.height) result.height = style.height
  if (style.margin) result.margin = style.margin
  if (style.background) result.background = style.background
  if (style.borderRadius) result.borderRadius = style.borderRadius
  if (style.border) result.border = style.border
  if (style.opacity !== undefined && style.opacity !== 100) result.opacity = style.opacity / 100
  return result
})

const componentProps = computed(() => {
  const p = { ...props.component.props }
  delete p._customStyle
  delete p._className
  return p
})

const renderComponent = computed(() => {
  return defineComponent({
    name: `Renderer_${props.component.type}`,
    setup() {
      return () => renderByType(props.component.type, componentProps.value)
    },
  })
})

function renderByType(type, p) {
  switch (type) {
    case 'container':
    case 'row':
    case 'column':
    case 'grid': {
      const styles = {}
      if (type === 'container') {
        styles.padding = p.padding || '16px'
        styles.background = p.background || 'var(--bg-white)'
        styles.borderRadius = p.borderRadius || '8px'
        styles.border = p.border || '1px solid var(--border-light)'
        if (p.direction === 'row') {
          styles.display = 'flex'
          styles.flexDirection = 'row'
          styles.gap = p.gap || '12px'
          styles.alignItems = p.alignItems || 'stretch'
        } else if (p.direction === 'column') {
          styles.display = 'flex'
          styles.flexDirection = 'column'
          styles.gap = p.gap || '12px'
          styles.alignItems = p.alignItems || 'stretch'
        }
        const shadowMap = { none: 'none', sm: '0 1px 3px rgba(0,0,0,0.1)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.15)' }
        if (p.shadow && shadowMap[p.shadow]) styles.boxShadow = shadowMap[p.shadow]
      } else if (type === 'row') {
        styles.display = 'flex'
        styles.flexDirection = 'row'
        styles.gap = p.gap || '12px'
        styles.alignItems = p.alignItems || 'center'
        styles.justifyContent = p.justifyContent || 'flex-start'
        if (p.wrap) styles.flexWrap = 'wrap'
      } else if (type === 'column') {
        styles.display = 'flex'
        styles.flexDirection = 'column'
        styles.gap = p.gap || '12px'
        styles.alignItems = p.alignItems || 'stretch'
      } else if (type === 'grid') {
        styles.display = 'grid'
        styles.gridTemplateColumns = `repeat(${p.columns || 3}, 1fr)`
        styles.gap = p.gap || '12px'
      }
      return h('div', { style: styles }, renderSlot())
    }

    case 'heading': {
      const tag = `h${p.level || 2}`
      const styles = { color: p.color || 'var(--text-primary)', textAlign: p.textAlign || 'left', fontWeight: p.fontWeight || 'bold', margin: 0 }
      if (p.fontSize) styles.fontSize = p.fontSize
      return h(tag, { style: styles }, p.text || '标题')
    }

    case 'text':
      return h('p', { style: { color: p.color || 'var(--text-regular)', fontSize: p.fontSize || '14px', lineHeight: p.lineHeight || '1.6', textAlign: p.textAlign || 'left', margin: 0 } }, p.text || '文本')

    case 'button':
      return h('button', {
        class: [`el-button`, `el-button--${p.type || 'default'}`, p.size !== 'default' ? `el-button--${p.size}` : '', p.plain ? 'is-plain' : '', p.round ? 'is-round' : '', p.disabled ? 'is-disabled' : ''],
        style: p.fullWidth ? { width: '100%' } : {},
        disabled: p.disabled,
      }, p.text || '按钮')

    case 'link':
      return h('a', { href: p.href || '#', class: `el-link el-link--${p.type || 'primary'}`, style: { textDecoration: p.underline ? 'underline' : 'none', cursor: p.disabled ? 'not-allowed' : 'pointer' } }, p.text || '链接')

    case 'divider':
      return h('div', { style: { borderTop: `${p.borderStyle || 'solid'} 1px #dcdfe6`, margin: '16px 0', position: 'relative', textAlign: p.contentPosition || 'center' } }, p.text ? h('span', { style: { background: 'var(--bg-white)', padding: '0 16px', position: 'relative', top: '-10px', fontSize: '13px', color: 'var(--text-secondary)' } }, p.text) : null)

    case 'image':
      return h('div', { style: { width: p.width || '100%', height: p.height === 'auto' ? '200px' : p.height, background: 'var(--bg-color)', borderRadius: p.borderRadius || '0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-placeholder)', fontSize: '14px', overflow: 'hidden' } }, p.src ? h('img', { src: p.src, alt: p.alt || '', style: { width: '100%', height: '100%', objectFit: p.fit || 'cover' } }) : '🖼️ 图片')

    case 'avatar':
      return h('div', { style: { width: `${p.size || 48}px`, height: `${p.size || 48}px`, borderRadius: p.shape === 'circle' ? '50%' : '4px', background: 'var(--text-placeholder)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: `${(p.size || 48) / 2.5}px` } }, '👤')

    case 'input':
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, [p.label || '输入框', p.required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null]),
        h('div', { style: { background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 12px', color: 'var(--text-placeholder)', fontSize: '14px' } }, p.placeholder || '请输入'),
      ])

    case 'textarea':
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, [p.label || '文本域', p.required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null]),
        h('div', { style: { background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 12px', color: 'var(--text-placeholder)', fontSize: '14px', minHeight: `${(p.rows || 4) * 22}px` } }, p.placeholder || '请输入内容'),
      ])

    case 'select':
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, [p.label || '选择器', p.required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null]),
        h('div', { style: { background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 12px', color: 'var(--text-placeholder)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' } }, [p.placeholder || '请选择', h('span', null, '▾')]),
      ])

    case 'radio': {
      const options = (p.options || '').split(',').filter(Boolean)
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, p.label || '单选'),
        h('div', { style: { display: 'flex', flexDirection: p.direction === 'horizontal' ? 'row' : 'column', gap: '8px' } }, options.map((opt, i) =>
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-regular)', cursor: 'pointer' } }, [
            h('span', { style: { width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--border-color)', display: 'inline-block' } }),
            opt.trim(),
          ])
        )),
      ])
    }

    case 'checkbox': {
      const options = (p.options || '').split(',').filter(Boolean)
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, p.label || '复选'),
        h('div', { style: { display: 'flex', flexDirection: p.direction === 'horizontal' ? 'row' : 'column', gap: '8px' } }, options.map(opt =>
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-regular)', cursor: 'pointer' } }, [
            h('span', { style: { width: '14px', height: '14px', borderRadius: '2px', border: '2px solid var(--border-color)', display: 'inline-block' } }),
            opt.trim(),
          ])
        )),
      ])
    }

    case 'switch':
      return h('div', { class: 'render-form-item', style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
        h('label', { style: { fontSize: '13px', color: 'var(--text-regular)' } }, p.label || '开关'),
        h('div', { style: { width: '40px', height: '20px', borderRadius: '10px', background: '#dcdfe6', position: 'relative' } }, [
          h('div', { style: { width: '16px', height: '16px', borderRadius: '50%', background: 'var(--bg-white)', position: 'absolute', top: '2px', left: '2px', transition: 'all 0.3s' } }),
        ]),
      ])

    case 'datePicker':
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, [p.label || '日期', p.required ? h('span', { style: { color: 'var(--color-danger)' } }, ' *') : null]),
        h('div', { style: { background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '8px 12px', color: 'var(--text-placeholder)', fontSize: '14px', display: 'flex', justifyContent: 'space-between' } }, [p.placeholder || '选择日期', h('span', null, '📅')]),
      ])

    case 'upload':
      return h('div', { class: 'render-form-item' }, [
        h('label', { style: { display: 'block', fontSize: '13px', color: 'var(--text-regular)', marginBottom: '6px' } }, p.label || '上传文件'),
        h('div', { style: { border: '1px dashed var(--border-color)', borderRadius: '6px', padding: '20px', textAlign: 'center', color: 'var(--text-placeholder)' } }, '📤 点击上传'),
      ])

    case 'table': {
      const columns = (p.columns || '').split(',').filter(Boolean)
      const rows = (p.data || '').split('\n').filter(Boolean).map(row => row.split(','))
      return h('div', { style: { width: '100%' } }, [
        h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' } }, [
          h('thead', null, [
            h('tr', null, [
              ...(p.showIndex ? [h('th', { style: thStyle }, '#')] : []),
              ...columns.map(col => h('th', { style: thStyle }, col.trim())),
            ]),
          ]),
          h('tbody', null, rows.map((row, idx) =>
            h('tr', { style: { background: p.stripe && idx % 2 === 1 ? '#fafafa' : 'transparent' } }, [
              ...(p.showIndex ? [h('td', { style: tdStyle }, `${idx + 1}`)] : []),
              ...row.map(cell => h('td', { style: tdStyle }, cell.trim())),
            ])
          )),
        ]),
      ])
    }

    case 'statistic':
      return h('div', { style: { textAlign: 'center', padding: '16px' } }, [
        h('div', { style: { fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' } }, p.title || '统计'),
        h('div', { style: { fontSize: '28px', fontWeight: '700', color: 'var(--text-primary)' } }, [
          p.prefix ? h('span', { style: { fontSize: '16px' } }, p.prefix) : null,
          (p.value || 0).toLocaleString(),
          p.suffix ? h('span', { style: { fontSize: '16px' } }, p.suffix) : null,
        ]),
      ])

    case 'progress':
      return h('div', null, [
        h('div', { style: { width: '100%', height: `${p.strokeWidth || 12}px`, background: 'var(--border-lighter)', borderRadius: `${p.strokeWidth || 12}px`, overflow: 'hidden' } }, [
          h('div', { style: { width: `${p.percentage || 0}%`, height: '100%', background: p.color || 'var(--color-primary)', borderRadius: `${p.strokeWidth || 12}px`, transition: 'width 0.3s' } }),
        ]),
        h('div', { style: { fontSize: '12px', color: 'var(--text-regular)', marginTop: '4px', textAlign: 'right' } }, `${p.percentage || 0}%`),
      ])

    case 'tag':
      return h('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: p.round ? '10px' : '4px', fontSize: '12px', ...getTagStyle(p.type, p.effect) } }, p.text || '标签')

    case 'menu': {
      const items = (p.items || '').split(',').filter(Boolean)
      return h('div', { style: { background: p.backgroundColor || '#545c64', borderRadius: '4px', overflow: 'hidden' } }, items.map((item, idx) =>
        h('div', { style: { padding: '12px 20px', color: idx === parseInt(p.activeIndex || '0') ? (p.activeTextColor || '#ffd04b') : (p.textColor || '#fff'), fontSize: '14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)' } }, item.trim())
      ))
    }

    case 'tabs': {
      const items = (p.items || '').split(',').filter(Boolean)
      return h('div', null, [
        h('div', { style: { display: 'flex', borderBottom: '2px solid var(--border-light)' } }, items.map((item, idx) =>
          h('div', { style: { padding: '10px 20px', fontSize: '14px', color: idx === 0 ? '#409eff' : '#909399', cursor: 'pointer', borderBottom: idx === 0 ? '2px solid var(--color-primary)' : 'none', marginBottom: '-2px' } }, item.trim())
        )),
        h('div', { style: { padding: '16px', color: 'var(--text-placeholder)', fontSize: '13px' } }, '内容区域'),
      ])
    }

    case 'breadcrumb': {
      const items = (p.items || '').split(',').filter(Boolean)
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' } }, items.map((item, idx) =>
        h('span', { style: { color: idx === items.length - 1 ? '#303133' : '#909399' } }, [item.trim(), idx < items.length - 1 ? h('span', { style: { margin: '0 4px', color: 'var(--text-placeholder)' } }, p.separator || '/') : null])
      ))
    }

    case 'alert':
      return h('div', { style: { padding: '12px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', ...getAlertStyle(p.type) } }, [
        p.showIcon ? h('span', null, getAlertIcon(p.type)) : null,
        h('div', null, [
          h('div', { style: { fontWeight: '500' } }, p.title || '提示'),
          p.description ? h('div', { style: { fontSize: '12px', marginTop: '4px', opacity: 0.8 } }, p.description) : null,
        ]),
      ])

    case 'card':
      return h('div', { style: { border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden', boxShadow: p.shadow === 'hover' ? 'none' : '0 2px 12px rgba(0,0,0,0.1)' } }, [
        h('div', { style: { padding: '12px 20px', borderBottom: '1px solid var(--border-light)', fontWeight: '600', fontSize: '14px' } }, p.title || '卡片'),
        h('div', { style: { padding: p.padding || '20px' } }, renderSlot()),
      ])

    case 'collapse': {
      const items = (p.items || '').split(',').filter(Boolean)
      return h('div', { style: { border: '1px solid var(--border-light)', borderRadius: '4px' } }, items.map((item, idx) =>
        h('div', { style: { borderBottom: idx < items.length - 1 ? '1px solid #e8e8e8' : 'none' } }, [
          h('div', { style: { padding: '12px 16px', fontSize: '14px', fontWeight: '500', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' } }, [item.trim(), h('span', null, '▸')]),
        ])
      ))
    }

    case 'timeline': {
      const items = (p.items || '').split(',').filter(Boolean)
      const timestamps = (p.timestamp || '').split(',').filter(Boolean)
      return h('div', { style: { padding: '8px 0' } }, items.map((item, idx) =>
        h('div', { style: { display: 'flex', gap: '16px', paddingBottom: '16px', position: 'relative' } }, [
          h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } }, [
            h('div', { style: { width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? 'var(--color-primary)' : 'var(--border-light)' } }),
            idx < items.length - 1 ? h('div', { style: { width: '2px', flex: 1, background: 'var(--border-light)', marginTop: '4px' } }) : null,
          ]),
          h('div', null, [
            h('div', { style: { fontSize: '14px', color: 'var(--text-primary)' } }, item.trim()),
            timestamps[idx] ? h('div', { style: { fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' } }, timestamps[idx].trim()) : null,
          ]),
        ])
      ))
    }

    case 'empty':
      return h('div', { style: { textAlign: 'center', padding: '32px', color: 'var(--text-placeholder)' } }, [
        h('div', { style: { fontSize: `${p.imageSize || 100}px`, lineHeight: 1 } }, '📭'),
        h('div', { style: { fontSize: '14px', color: 'var(--text-secondary)', marginTop: '12px' } }, p.description || '暂无数据'),
      ])

    case 'badge':
      return h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } }, [
        h('div', { style: { width: '40px', height: '40px', background: 'var(--bg-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, '📦'),
        h('sup', { style: { position: 'relative', top: '-16px', right: '4px', background: p.type === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)', color: '#fff', fontSize: '10px', padding: '0 5px', borderRadius: '8px', lineHeight: '16px' } }, p.isDot ? '' : (p.value > (p.max || 99) ? `${p.max}+` : p.value)),
      ])

    default:
      return h('div', { style: { padding: '12px', background: 'var(--bg-color)', borderRadius: '4px', color: 'var(--text-secondary)', textAlign: 'center' } }, `未知组件: ${type}`)
  }
}

function renderSlot() {
  return []
}

const thStyle = {
  padding: '10px 12px',
  background: 'var(--bg-color)',
  fontWeight: '600',
  textAlign: 'left',
  borderBottom: '2px solid var(--border-lighter)',
  fontSize: '13px',
  color: 'var(--text-secondary)',
}

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--border-lighter)',
  fontSize: '13px',
  color: 'var(--text-regular)',
}

function getTagStyle(type, effect) {
  const colors = {
    '': { bg: '#ecf5ff', color: 'var(--color-primary)', border: '#d9ecff' },
    success: { bg: '#f0f9eb', color: '#67c23a', border: '#e1f3d8' },
    warning: { bg: '#fdf6ec', color: '#e6a23c', border: '#faecd8' },
    danger: { bg: '#fef0f0', color: 'var(--color-danger)', border: '#fde2e2' },
    info: { bg: '#f4f4f5', color: 'var(--text-secondary)', border: '#e9e9eb' },
  }
  const c = colors[type] || colors['']
  if (effect === 'dark') return { background: c.color, color: '#fff', border: 'none' }
  if (effect === 'plain') return { background: 'var(--bg-white)', color: c.color, border: `1px solid ${c.border}` }
  return { background: c.bg, color: c.color, border: `1px solid ${c.border}` }
}

function getAlertStyle(type) {
  const styles = {
    success: { background: '#f0f9eb', color: '#67c23a' },
    warning: { background: '#fdf6ec', color: '#e6a23c' },
    info: { background: '#f4f4f5', color: 'var(--text-secondary)' },
    error: { background: '#fef0f0', color: 'var(--color-danger)' },
  }
  return styles[type] || styles.info
}

function getAlertIcon(type) {
  const icons = { success: '✅', warning: '⚠️', info: 'ℹ️', error: '❌' }
  return icons[type] || 'ℹ️'
}

function onSelect() {
  emit('select', props.component.id)
}

function onMouseEnter() {}

function onMouseLeave() {}

function onCompDragOver(event) {
  if (props.component.isContainer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function onCompDragLeave() {}

function onCompDrop(event) {
  if (props.component.isContainer) {
    emit('drop-component', {
      targetId: props.component.id,
      position: 'inside',
      event,
    })
  }
}
</script>

<style scoped>
.component-renderer {
  position: relative;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 24px;
}

.component-renderer:hover {
  outline: 1px dashed #409eff;
  outline-offset: 2px;
}

.component-renderer.selected {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.component-renderer.is-container {
  min-height: 60px;
}

.container-placeholder {
  padding: 20px;
  text-align: center;
  color: var(--text-placeholder);
  font-size: 13px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  background: rgba(64, 158, 255, 0.02);
}

.selection-border {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid #409eff;
  border-radius: 2px;
  pointer-events: none;
  z-index: 10;
}

.selection-label {
  position: absolute;
  top: -20px;
  left: 0;
  background: #409eff;
  color: #fff;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 2px 2px 0 0;
  white-space: nowrap;
}

.hover-border {
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  bottom: -1px;
  border: 1px dashed #409eff;
  border-radius: 2px;
  pointer-events: none;
  z-index: 5;
}

.render-form-item {
  margin-bottom: 16px;
}
</style>
