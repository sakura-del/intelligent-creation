import { ref, reactive } from 'vue'

let idCounter = 0

function generateId() {
  return `comp_${Date.now()}_${++idCounter}`
}

export function useDragDrop() {
  const dragState = reactive({
    isDragging: false,
    dragType: null,
    dragData: null,
    sourceId: null,
    dropTargetId: null,
    dropPosition: null,
    ghostElement: null,
  })

  const dragOverId = ref(null)
  const dropIndicator = reactive({
    parentId: null,
    index: -1,
    position: null,
  })

  function startDrag(event, componentDef, sourceId = null) {
    dragState.isDragging = true
    dragState.dragType = sourceId ? 'move' : 'new'
    dragState.dragData = componentDef
    dragState.sourceId = sourceId

    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = sourceId ? 'move' : 'copy'
      event.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          type: componentDef.type,
          sourceId,
        }),
      )
    }
  }

  function endDrag() {
    dragState.isDragging = false
    dragState.dragType = null
    dragState.dragData = null
    dragState.sourceId = null
    dragOverId.value = null
    dropIndicator.parentId = null
    dropIndicator.index = -1
    dropIndicator.position = null
  }

  function onDragOver(event, componentId, isContainer = false) {
    if (!dragState.isDragging) return

    event.preventDefault()
    event.dataTransfer.dropEffect = dragState.dragType === 'move' ? 'move' : 'copy'

    dragOverId.value = componentId

    if (isContainer) {
      dropIndicator.parentId = componentId
      dropIndicator.position = 'inside'
      dropIndicator.index = -1
    } else {
      const rect = event.currentTarget.getBoundingClientRect()
      const y = event.clientY - rect.top
      const threshold = rect.height / 3

      if (y < threshold) {
        dropIndicator.position = 'before'
      } else if (y > rect.height - threshold) {
        dropIndicator.position = 'after'
      } else {
        dropIndicator.position = 'inside'
      }
    }
  }

  function onDragLeave() {
    dragOverId.value = null
  }

  function onCanvasDragOver(event) {
    if (!dragState.isDragging) return
    event.preventDefault()
    event.dataTransfer.dropEffect = dragState.dragType === 'move' ? 'move' : 'copy'
    dropIndicator.parentId = 'canvas'
    dropIndicator.position = 'inside'
  }

  function createComponentInstance(componentDef, overrides = {}) {
    const instance = {
      id: generateId(),
      type: componentDef.type,
      name: componentDef.name,
      props: { ...componentDef.defaultProps },
      children: [],
      isContainer: !!componentDef.isContainer,
      ...overrides,
    }

    if (componentDef.propsSchema) {
      componentDef.propsSchema.forEach((schema) => {
        if (!(schema.key in instance.props)) {
          instance.props[schema.key] = schema.default
        }
      })
    }

    return instance
  }

  function findComponent(tree, id) {
    for (const comp of tree) {
      if (comp.id === id) return comp
      if (comp.children?.length) {
        const found = findComponent(comp.children, id)
        if (found) return found
      }
    }
    return null
  }

  function findParent(tree, id, parent = null) {
    for (const comp of tree) {
      if (comp.id === id) return parent
      if (comp.children?.length) {
        const found = findParent(comp.children, id, comp)
        if (found !== undefined) return found
      }
    }
    return undefined
  }

  function removeComponent(tree, id) {
    const index = tree.findIndex((c) => c.id === id)
    if (index !== -1) {
      return tree.splice(index, 1)[0]
    }
    for (const comp of tree) {
      if (comp.children?.length) {
        const removed = removeComponent(comp.children, id)
        if (removed) return removed
      }
    }
    return null
  }

  function insertComponent(tree, component, targetId, position = 'after') {
    if (targetId === 'canvas' || !targetId) {
      tree.push(component)
      return true
    }

    if (position === 'inside') {
      const target = findComponent(tree, targetId)
      if (target && target.isContainer) {
        target.children.push(component)
        return true
      }
    }

    const parent = findParent(tree, targetId)
    const siblings = parent ? parent.children : tree
    const index = siblings.findIndex((c) => c.id === targetId)

    if (index !== -1) {
      const insertIndex = position === 'before' ? index : index + 1
      siblings.splice(insertIndex, 0, component)
      return true
    }

    return false
  }

  function moveComponent(tree, sourceId, targetId, position = 'after') {
    const source = findComponent(tree, sourceId)
    if (!source) return false

    if (isDescendant(source, targetId)) return false

    const removed = removeComponent(tree, sourceId)
    if (!removed) return false

    return insertComponent(tree, removed, targetId, position)
  }

  function isDescendant(parent, childId) {
    if (!parent.children?.length) return false
    for (const child of parent.children) {
      if (child.id === childId) return true
      if (isDescendant(child, childId)) return true
    }
    return false
  }

  function duplicateComponent(tree, id) {
    const source = findComponent(tree, id)
    if (!source) return null

    const clone = JSON.parse(JSON.stringify(source))
    reassignIds(clone)

    const parent = findParent(tree, id)
    const siblings = parent ? parent.children : tree
    const index = siblings.findIndex((c) => c.id === id)
    siblings.splice(index + 1, 0, clone)

    return clone
  }

  function reassignIds(component) {
    component.id = generateId()
    if (component.children?.length) {
      component.children.forEach(reassignIds)
    }
  }

  function getComponentPath(tree, id, path = []) {
    for (const comp of tree) {
      if (comp.id === id) return [...path, comp]
      if (comp.children?.length) {
        const result = getComponentPath(comp.children, id, [...path, comp])
        if (result) return result
      }
    }
    return null
  }

  function countComponents(tree) {
    let count = 0
    for (const comp of tree) {
      count++
      if (comp.children?.length) {
        count += countComponents(comp.children)
      }
    }
    return count
  }

  return {
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
    findParent,
    removeComponent,
    insertComponent,
    moveComponent,
    duplicateComponent,
    getComponentPath,
    countComponents,
    isDescendant,
  }
}
