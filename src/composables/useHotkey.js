import { onMounted, onUnmounted } from 'vue'

const registeredShortcuts = []
let helpVisible = false
let helpListeners = []

function parseKeyCombo(combo) {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
  const result = { ctrl: false, meta: false, shift: false, alt: false, key: '' }
  for (const part of parts) {
    switch (part) {
      case 'ctrl':
      case 'control':
        result.ctrl = true
        break
      case 'meta':
      case 'cmd':
      case 'command':
        result.meta = true
        break
      case 'shift':
        result.shift = true
        break
      case 'alt':
      case 'option':
        result.alt = true
        break
      default:
        result.key = part
    }
  }
  return result
}

function matchEvent(event, combo) {
  const parsed = parseKeyCombo(combo)
  const ctrlMatch = parsed.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
  const shiftMatch = parsed.shift ? event.shiftKey : !event.shiftKey
  const altMatch = parsed.alt ? event.altKey : !event.altKey
  const keyMatch = event.key.toLowerCase() === parsed.key
  return ctrlMatch && shiftMatch && altMatch && keyMatch
}

export function useHotkey(shortcuts, options = {}) {
  const { scope = 'global', preventDefault = true } = options

  const entries = Object.entries(shortcuts).map(([combo, handler]) => ({
    combo,
    handler,
    scope,
    parsed: parseKeyCombo(combo),
  }))

  function onKeyDown(event) {
    if (isInputElement(event.target)) return

    for (const entry of entries) {
      if (matchEvent(event, entry.combo)) {
        if (preventDefault) event.preventDefault()
        entry.handler(event)
        return
      }
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
    for (const entry of entries) {
      const existing = registeredShortcuts.findIndex(
        (s) => s.combo === entry.combo && s.scope === entry.scope,
      )
      if (existing >= 0) {
        registeredShortcuts[existing] = entry
      } else {
        registeredShortcuts.push(entry)
      }
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    for (const entry of entries) {
      const idx = registeredShortcuts.findIndex(
        (s) => s.combo === entry.combo && s.scope === entry.scope,
      )
      if (idx >= 0) registeredShortcuts.splice(idx, 1)
    }
  })
}

function isInputElement(el) {
  if (!el) return false
  const tag = el.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el.isContentEditable) return true
  if (el.closest('.monaco-editor')) return true
  return false
}

export function getRegisteredShortcuts() {
  return [...registeredShortcuts]
}

export function toggleHelp() {
  helpVisible = !helpVisible
  helpListeners.forEach((fn) => fn(helpVisible))
}

export function onHelpToggle(fn) {
  helpListeners.push(fn)
  return () => {
    helpListeners = helpListeners.filter((f) => f !== fn)
  }
}

export function isHelpVisible() {
  return helpVisible
}
