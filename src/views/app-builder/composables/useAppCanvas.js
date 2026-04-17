import { ref, computed } from 'vue'
import { useDragDrop } from './useDragDrop.js'
import { getComponentByType } from '../data/presetComponents.js'

export function useAppCanvas() {
  const components = ref([])
  const selectedId = ref(null)
  const hoveredId = ref(null)
  const history = ref([])
  const historyIndex = ref(-1)
  const maxHistory = 50

  const {
    dragState,
    dragOverId,
    dropIndicator,
    startDrag,
    endDrag,
    onDragOver,
    onDragLeave,
    onCanvasDragOver,
    createComponentInstance,
    findComponent,
    removeComponent,
    insertComponent,
    moveComponent,
    duplicateComponent,
    countComponents,
  } = useDragDrop()

  const selectedComponent = computed(() => {
    if (!selectedId.value) return null
    return findComponent(components.value, selectedId.value)
  })

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  function saveSnapshot() {
    const snapshot = JSON.parse(JSON.stringify(components.value))
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(snapshot)
    if (history.value.length > maxHistory) {
      history.value.shift()
    }
    historyIndex.value = history.value.length - 1
  }

  function undo() {
    if (!canUndo.value) return
    historyIndex.value--
    components.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  function redo() {
    if (!canRedo.value) return
    historyIndex.value++
    components.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]))
  }

  function addComponent(componentDef, targetId = null, position = 'after') {
    const instance = createComponentInstance(componentDef)
    if (targetId) {
      insertComponent(components.value, instance, targetId, position)
    } else {
      components.value.push(instance)
    }
    selectedId.value = instance.id
    saveSnapshot()
    return instance
  }

  function addComponentToCanvas(componentDef) {
    const instance = createComponentInstance(componentDef)
    components.value.push(instance)
    selectedId.value = instance.id
    saveSnapshot()
    return instance
  }

  function selectComponent(id) {
    selectedId.value = id
  }

  function deleteComponent(id) {
    if (selectedId.value === id) {
      selectedId.value = null
    }
    removeComponent(components.value, id)
    saveSnapshot()
  }

  function updateComponentProps(id, props) {
    const comp = findComponent(components.value, id)
    if (comp) {
      comp.props = { ...comp.props, ...props }
      saveSnapshot()
    }
  }

  function duplicateComp(id) {
    const clone = duplicateComponent(components.value, id)
    if (clone) {
      selectedId.value = clone.id
      saveSnapshot()
    }
    return clone
  }

  function moveComp(sourceId, targetId, position = 'after') {
    if (moveComponent(components.value, sourceId, targetId, position)) {
      saveSnapshot()
    }
  }

  function clearCanvas() {
    components.value = []
    selectedId.value = null
    saveSnapshot()
  }

  function handleDrop(event, targetId = null, position = 'after') {
    event.preventDefault()

    try {
      let dragInfo
      try {
        const data = event.dataTransfer.getData('text/plain')
        dragInfo = JSON.parse(data)
      } catch {
        dragInfo = null
      }

      if (dragState.dragType === 'move' && dragState.sourceId) {
        const target = targetId || 'canvas'
        const pos = target === 'canvas' ? 'inside' : position
        moveComp(dragState.sourceId, target, pos)
      } else if (dragInfo?.type || dragState.dragData?.type) {
        const compType = dragInfo?.type || dragState.dragData?.type
        const compDef = getComponentByType(compType)
        if (compDef) {
          if (targetId && targetId !== 'canvas') {
            addComponent(compDef, targetId, position)
          } else {
            addComponentToCanvas(compDef)
          }
        }
      }
    } catch (error) {
      console.error('Drop error:', error)
    }

    endDrag()
  }

  function exportSchema() {
    return {
      version: '1.0',
      components: JSON.parse(JSON.stringify(components.value)),
      metadata: {
        componentCount: countComponents(components.value),
        exportTime: new Date().toISOString(),
      },
    }
  }

  function importSchema(schema) {
    if (schema?.version === '1.0' && Array.isArray(schema?.components)) {
      components.value = schema.components
      selectedId.value = null
      saveSnapshot()
      return true
    }
    return false
  }

  function generateCode() {
    function renderComponent(comp, indent = 2) {
      const spaces = ' '.repeat(indent)
      let code = ''

      if (comp.type === 'container') {
        const style = buildStyleString(comp.props)
        code += `${spaces}<div style="${style}">\n`
        if (comp.children?.length) {
          comp.children.forEach((child) => {
            code += renderComponent(child, indent + 2)
          })
        }
        code += `${spaces}</div>\n`
      } else if (comp.type === 'row') {
        const style = `display:flex;gap:${comp.props.gap || '12px'};align-items:${comp.props.alignItems || 'center'};${comp.props.wrap ? 'flex-wrap:wrap;' : ''}`
        code += `${spaces}<div style="${style}">\n`
        if (comp.children?.length) {
          comp.children.forEach((child) => {
            code += renderComponent(child, indent + 2)
          })
        }
        code += `${spaces}</div>\n`
      } else if (comp.type === 'column') {
        const style = `display:flex;flex-direction:column;gap:${comp.props.gap || '12px'};align-items:${comp.props.alignItems || 'stretch'};`
        code += `${spaces}<div style="${style}">\n`
        if (comp.children?.length) {
          comp.children.forEach((child) => {
            code += renderComponent(child, indent + 2)
          })
        }
        code += `${spaces}</div>\n`
      } else if (comp.type === 'heading') {
        const tag = `h${comp.props.level || 2}`
        const style = `color:${comp.props.color || '#303133'};text-align:${comp.props.textAlign || 'left'};${comp.props.fontSize ? 'font-size:' + comp.props.fontSize + ';' : ''}font-weight:${comp.props.fontWeight || 'bold'};`
        code += `${spaces}<${tag} style="${style}">${escapeHtml(comp.props.text || '')}</${tag}>\n`
      } else if (comp.type === 'text') {
        const style = `color:${comp.props.color || '#606266'};font-size:${comp.props.fontSize || '14px'};line-height:${comp.props.lineHeight || '1.6'};text-align:${comp.props.textAlign || 'left'};`
        code += `${spaces}<p style="${style}">${escapeHtml(comp.props.text || '')}</p>\n`
      } else if (comp.type === 'button') {
        code += `${spaces}<el-button type="${comp.props.type}" size="${comp.props.size}"${comp.props.plain ? ' plain' : ''}${comp.props.round ? ' round' : ''}${comp.props.disabled ? ' disabled' : ''}${comp.props.fullWidth ? ' style="width:100%"' : ''}>${escapeHtml(comp.props.text || '按钮')}</el-button>\n`
      } else if (comp.type === 'image') {
        const style = `width:${comp.props.width || '100%'};height:${comp.props.height || 'auto'};object-fit:${comp.props.fit || 'cover'};border-radius:${comp.props.borderRadius || '0'};`
        code += `${spaces}<img src="${escapeHtml(comp.props.src || '')}" alt="${escapeHtml(comp.props.alt || '')}" style="${style}" />\n`
      } else if (comp.type === 'input') {
        code += `${spaces}<el-form-item label="${escapeHtml(comp.props.label || '')}"${comp.props.required ? ' required' : ''}>\n`
        code += `${spaces}  <el-input placeholder="${escapeHtml(comp.props.placeholder || '')}"${comp.props.clearable ? ' clearable' : ''}${comp.props.disabled ? ' disabled' : ''}${comp.props.maxlength ? ' maxlength="' + comp.props.maxlength + '"' : ''} />\n`
        code += `${spaces}</el-form-item>\n`
      } else if (comp.type === 'select') {
        const options = (comp.props.options || '').split(',').filter(Boolean)
        code += `${spaces}<el-form-item label="${escapeHtml(comp.props.label || '')}"${comp.props.required ? ' required' : ''}>\n`
        code += `${spaces}  <el-select placeholder="${escapeHtml(comp.props.placeholder || '')}"${comp.props.clearable ? ' clearable' : ''}${comp.props.multiple ? ' multiple' : ''}${comp.props.disabled ? ' disabled' : ''}>\n`
        options.forEach((opt) => {
          code += `${spaces}    <el-option label="${escapeHtml(opt.trim())}" value="${escapeHtml(opt.trim())}" />\n`
        })
        code += `${spaces}  </el-select>\n`
        code += `${spaces}</el-form-item>\n`
      } else if (comp.type === 'table') {
        const columns = (comp.props.columns || '').split(',').filter(Boolean)
        code += `${spaces}<el-table${comp.props.stripe ? ' stripe' : ''}${comp.props.border ? ' border' : ''} size="${comp.props.size || 'default'}">\n`
        if (comp.props.showIndex) {
          code += `${spaces}  <el-table-column type="index" />\n`
        }
        columns.forEach((col) => {
          code += `${spaces}  <el-table-column prop="${escapeHtml(col.trim())}" label="${escapeHtml(col.trim())}" />\n`
        })
        code += `${spaces}</el-table>\n`
      } else if (comp.type === 'card') {
        code += `${spaces}<el-card shadow="${comp.props.shadow || 'hover'}">\n`
        code += `${spaces}  <template #header><span>${escapeHtml(comp.props.title || '')}</span></template>\n`
        if (comp.children?.length) {
          comp.children.forEach((child) => {
            code += renderComponent(child, indent + 2)
          })
        }
        code += `${spaces}</el-card>\n`
      } else if (comp.type === 'statistic') {
        code += `${spaces}<el-statistic title="${escapeHtml(comp.props.title || '')}" :value="${comp.props.value || 0}"${comp.props.prefix ? ' prefix="' + escapeHtml(comp.props.prefix) + '"' : ''}${comp.props.suffix ? ' suffix="' + escapeHtml(comp.props.suffix) + '"' : ''}${comp.props.precision ? ' :precision="' + comp.props.precision + '"' : ''} />\n`
      } else if (comp.type === 'progress') {
        code += `${spaces}<el-progress :percentage="${comp.props.percentage || 0}"${comp.props.status ? ' status="' + comp.props.status + '"' : ''}${comp.props.strokeWidth ? ' :stroke-width="' + comp.props.strokeWidth + '"' : ''}${comp.props.textInside ? ' text-inside' : ''}${comp.props.color ? ' color="' + comp.props.color + '"' : ''} />\n`
      } else if (comp.type === 'alert') {
        code += `${spaces}<el-alert title="${escapeHtml(comp.props.title || '')}" type="${comp.props.type || 'info'}"${comp.props.showIcon ? ' show-icon' : ''}${comp.props.closable ? ' closable' : ''}${comp.props.center ? ' center' : ''}${comp.props.description ? ' description="' + escapeHtml(comp.props.description) + '"' : ''} />\n`
      } else if (comp.type === 'divider') {
        code += `${spaces}<el-divider${comp.props.contentPosition !== 'center' ? ' content-position="' + comp.props.contentPosition + '"' : ''}${comp.props.borderStyle !== 'solid' ? ' border-style="' + comp.props.borderStyle + '"' : ''}>${escapeHtml(comp.props.text || '')}</el-divider>\n`
      } else if (comp.type === 'tag') {
        code += `${spaces}<el-tag${comp.props.type ? ' type="' + comp.props.type + '"' : ''} effect="${comp.props.effect || 'light'}"${comp.props.closable ? ' closable' : ''}${comp.props.round ? ' round' : ''}>${escapeHtml(comp.props.text || '标签')}</el-tag>\n`
      } else if (comp.type === 'menu') {
        const items = (comp.props.items || '').split(',').filter(Boolean)
        code += `${spaces}<el-menu mode="${comp.props.mode || 'vertical'}" background-color="${comp.props.backgroundColor || '#545c64'}" text-color="${comp.props.textColor || '#fff'}" active-text-color="${comp.props.activeTextColor || '#ffd04b'}">\n`
        items.forEach((item, idx) => {
          code += `${spaces}  <el-menu-item index="${idx}">${escapeHtml(item.trim())}</el-menu-item>\n`
        })
        code += `${spaces}</el-menu>\n`
      } else if (comp.type === 'tabs') {
        const items = (comp.props.items || '').split(',').filter(Boolean)
        code += `${spaces}<el-tabs${comp.props.type ? ' type="' + comp.props.type + '"' : ''}${comp.props.tabPosition !== 'top' ? ' tab-position="' + comp.props.tabPosition + '"' : ''}>\n`
        items.forEach((item, idx) => {
          code += `${spaces}  <el-tab-pane label="${escapeHtml(item.trim())}" name="${idx}">内容区域</el-tab-pane>\n`
        })
        code += `${spaces}</el-tabs>\n`
      } else if (comp.type === 'breadcrumb') {
        const items = (comp.props.items || '').split(',').filter(Boolean)
        code += `${spaces}<el-breadcrumb separator="${comp.props.separator || '/'}">\n`
        items.forEach((item) => {
          code += `${spaces}  <el-breadcrumb-item>${escapeHtml(item.trim())}</el-breadcrumb-item>\n`
        })
        code += `${spaces}</el-breadcrumb>\n`
      } else if (comp.type === 'timeline') {
        const items = (comp.props.items || '').split(',').filter(Boolean)
        const timestamps = (comp.props.timestamp || '').split(',').filter(Boolean)
        code += `${spaces}<el-timeline${comp.props.reverse ? ' reverse' : ''}>\n`
        items.forEach((item, idx) => {
          code += `${spaces}  <el-timeline-item timestamp="${escapeHtml(timestamps[idx] || '')}">${escapeHtml(item.trim())}</el-timeline-item>\n`
        })
        code += `${spaces}</el-timeline>\n`
      } else {
        code += `${spaces}<div><!-- ${comp.type} component --></div>\n`
      }

      return code
    }

    function buildStyleString(props) {
      const parts = []
      if (props.padding) parts.push(`padding:${props.padding}`)
      if (props.background) parts.push(`background:${props.background}`)
      if (props.borderRadius) parts.push(`border-radius:${props.borderRadius}`)
      if (props.border) parts.push(`border:${props.border}`)
      if (props.direction === 'row') parts.push('display:flex;flex-direction:row')
      else if (props.direction === 'column') parts.push('display:flex;flex-direction:column')
      if (props.gap) parts.push(`gap:${props.gap}`)
      if (props.alignItems) parts.push(`align-items:${props.alignItems}`)
      const shadowMap = {
        none: 'none',
        sm: '0 1px 3px rgba(0,0,0,0.1)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.15)',
      }
      if (props.shadow && shadowMap[props.shadow])
        parts.push(`box-shadow:${shadowMap[props.shadow]}`)
      return parts.join(';')
    }

    function escapeHtml(str) {
      if (!str) return ''
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    let html = '<template>\n  <div class="app-page">\n'
    components.value.forEach((comp) => {
      html += renderComponent(comp, 4)
    })
    html += '  </div>\n</template>\n'

    return html
  }

  saveSnapshot()

  return {
    components,
    selectedId,
    hoveredId,
    selectedComponent,
    canUndo,
    canRedo,
    dragState,
    dragOverId,
    dropIndicator,
    startDrag,
    endDrag,
    onDragOver,
    onDragLeave,
    onCanvasDragOver,
    selectComponent,
    addComponent,
    addComponentToCanvas,
    deleteComponent,
    updateComponentProps,
    duplicateComp,
    moveComp,
    clearCanvas,
    handleDrop,
    findComponent,
    undo,
    redo,
    exportSchema,
    importSchema,
    generateCode,
    countComponents,
  }
}
