<template>
  <div class="code-editor-wrapper">
    <MonacoEditor v-model:value="code" :language="language" :theme="theme" :options="editorOptions"
      @mount="handleEditorMount" @change="handleChange" :height="height" />
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'

const props = defineProps({
  modelValue: { type: String, default: '' },
  language: { type: String, default: 'html' },
  theme: { type: String, default: 'vs-dark' },
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

watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

watch(code, (newVal) => {
  emit('update:modelValue', newVal)
  emit('change', newVal)
})

function handleEditorMount(editor) {
  editorInstance.value = editor
  emit('mount', editor)
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
