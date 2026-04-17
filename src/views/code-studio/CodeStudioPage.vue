???<template>
  <div class="code-studio-page">
    <div class="page-header">
      <div class="breadcrumb">
        <span>��ҳ</span>
        <el-icon>
          <ArrowRight />
        </el-icon>
        <span>���빤��</span>
      </div>
      <h1 class="page-title">??? AI ���빤��</h1>
      <p class="page-desc">д���롢��Ч����һ������ | AI���� + רҵģ�� | ��ÿ���˶��ܴ���רҵ��ҳ</p>
    </div>

    <div class="studio-toolbar">
      <div class="toolbar-left">
        <el-radio-group v-model="userMode" size="default">
          <el-radio-button value="smart">
            ?? ����ģʽ
          </el-radio-button>
          <el-radio-button value="expert">
            ?? ר��ģʽ
          </el-radio-button>
        </el-radio-group>

        <el-select v-if="userMode === 'smart'" v-model="selectedTemplate" placeholder="ѡ��ģ��" size="default"
          style="width: 220px; margin-left: 16px;" @change="loadTemplate">
          <el-option label="?? ˫11�񻶴���ҳ" value="double11" />
          <el-option label="?? ��Ʒ����Ԥ��ҳ" value="newProduct" />
          <el-option label="?? APP��������ҳ" value="appDownload" />
          <el-option label="?? �հ�ҳ��" value="blank" />
        </el-select>

        <div v-if="userMode === 'smart' && templateFields.length > 0" class="template-config">
          <el-popover placement="bottom" :width="380" trigger="click">
            <template #reference>
              <el-button type="primary" size="default" plain>
                ?? ���ò��� ({{ templateFields.length }}��)
              </el-button>
            </template>

            <div class="config-panel">
              <h4 style="margin: 0 0 16px;">?? ҳ���������</h4>
              <el-form :model="templateValues" label-position="top" size="small">
                <el-form-item v-for="field in templateFields" :key="field.key" :label="field.label">
                  <el-input v-if="field.type === 'text'" v-model="templateValues[field.key]"
                    :placeholder="field.placeholder || ''" />
                  <el-select v-else-if="field.type === 'select'" v-model="templateValues[field.key]">
                    <el-option v-for="opt in field.options" :key="opt" :label="opt" :value="opt" />
                  </el-select>
                  <el-color-picker v-else-if="field.type === 'color'" v-model="templateValues[field.key]" />
                  <el-date-picker v-else-if="field.type === 'date'" v-model="templateValues[field.key]" type="date"
                    placeholder="ѡ������" style="width: 100%;" />
                </el-form-item>
              </el-form>
              <el-button type="primary" @click="applyTemplateValues" style="width: 100%;">
                ? Ӧ�õ�����
              </el-button>
            </div>
          </el-popover>
        </div>
      </div>

      <div class="toolbar-right">
        <el-button type="warning" @click="showAIDialog = true" plain>
          ?? AI���ɴ���
        </el-button>

        <el-divider direction="vertical" />

        <el-button @click="handleSaveProject" type="primary" plain :loading="isSaving">
          ?? ������Ʒ
        </el-button>
        <el-button @click="showProjectDrawer = true" plain>
          ?? �ҵ���Ʒ ({{ projectCount }})
        </el-button>

        <el-divider direction="vertical" />

        <el-button-group>
          <el-button @click="handleDownloadZip" type="success" :loading="isPackaging">
            ?? ����ZIP
          </el-button>
          <el-button @click="handleDownloadHTML">
            ?? ����HTML
          </el-button>
          <el-button @click="handleCopyCode">
            ?? ���ƴ���
          </el-button>
        </el-button-group>

        <el-divider direction="vertical" />

        <el-button @click="showShareDialog = true" plain>
          ?? ����
        </el-button>
        <el-button @click="showVersionDrawer = true" plain :disabled="!currentProjectId">
          ?? �汾
        </el-button>
        <el-button @click="showTemplateDialog = true" plain>
          ?? ģ���
        </el-button>
      </div>
    </div>

    <div class="workspace">
      <div class="editor-pane">
        <MultiFileEditor v-model="files" :can-add-file="true" @file-change="onFileChange" />
      </div>

      <div class="preview-pane">
        <PreviewPanel :files="files" :changed-file="lastChangedFile" ref="previewRef" />
      </div>
    </div>

    <el-dialog v-model="showAIDialog" title="?? AI ������������" width="680px" :close-on-click-modal="false">
      <div class="ai-dialog-content">
        <el-alert type="info" :closable="false" show-icon style="margin-bottom: 20px;">
          <template #title>
            ����Ȼ������������Ҫ����ҳ��AI���Զ�����������HTML/CSS/JS����
          </template>
        </el-alert>

        <div class="ai-style-selector">
          <label
            style="font-weight: 600; font-size: 14px; color: var(--text-primary); margin-bottom: 8px; display: block;">
            ѡ����
          </label>
          <el-radio-group v-model="aiStyle" size="small">
            <el-radio-button value="modern">�ִ���Լ</el-radio-button>
            <el-radio-button value="luxury">�ݻ��߶�</el-radio-button>
            <el-radio-button value="minimal">��������</el-radio-button>
            <el-radio-button value="playful">����Ȥζ</el-radio-button>
            <el-radio-button value="corporate">��ҵ����</el-radio-button>
          </el-radio-group>
        </div>

        <el-input v-model="aiPrompt" type="textarea" :rows="5"
          placeholder="���磺����һ����Ʒ��½ҳ������Ӣ����������չʾ���û����ۺ͵ײ�CTA��ť����ɫʹ����ɫϵ��Ҫ�й�������Ч��..." resize="vertical"
          style="margin-top: 16px;" />

        <div class="ai-examples" style="margin-top: 12px;">
          <span style="font-size: 13px; color: var(--text-secondary);">����ʾ����</span>
          <el-tag v-for="(example, idx) in aiExamples" :key="idx" size="small"
            style="margin-left: 6px; cursor: pointer;" @click="aiPrompt = example">
            {{ example.length > 20 ? example.slice(0, 20) + '...' : example }}
          </el-tag>
        </div>
      </div>

      <template #footer>
        <el-button @click="showAIDialog = false">ȡ��</el-button>
        <el-button type="primary" @click="handleAIGenerate" :loading="isAIGenerating" :disabled="!aiPrompt.trim()">
          {{ isAIGenerating ? '? AI��������...' : '?? ��ʼ����' }}
        </el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="showProjectDrawer" title="?? �ҵ���Ʒ" direction="rtl" size="420px">
      <div class="project-drawer-content">
        <div class="project-search">
          <el-input v-model="projectSearchKeyword" placeholder="������Ʒ..." prefix-icon="Search" clearable
            size="default" />
        </div>

        <div v-if="isLoadingProjects" class="loading-state" style="padding: 40px 0; text-align: center;">
          <el-icon class="is-loading" :size="32">
            <Loading />
          </el-icon>
          <p style="margin-top: 12px; color: var(--text-secondary);">������...</p>
        </div>

        <div v-else-if="projectList.length === 0" class="empty-state" style="padding: 40px 0; text-align: center;">
          <el-empty description="���ޱ������Ʒ" :image-size="100">
            <el-button type="primary" @click="handleSaveProject">���浱ǰ��Ʒ</el-button>
          </el-empty>
        </div>

        <div v-else class="project-list">
          <div v-for="project in filteredProjectList" :key="project.id" class="project-card"
            :class="{ active: currentProjectId === project.id }" @click="handleLoadProject(project)">
            <div class="project-card-header">
              <h4>{{ project.title || 'δ������Ʒ' }}</h4>
              <el-tag size="small" :type="getSourceTypeTagType(project.source_type)">
                {{ getSourceTypeLabel(project.source_type) }}
              </el-tag>
            </div>
            <p class="project-card-desc">{{ project.description || '������' }}</p>
            <div class="project-card-meta">
              <span>{{ project.file_count || 0 }} ���ļ�</span>
              <span>{{ formatTime(project.updated_at || project.last_modified) }}</span>
            </div>
            <div class="project-card-actions">
              <el-button size="small" text type="primary" @click.stop="handleLoadProject(project)">
                ��
              </el-button>
              <el-button size="small" text type="danger" @click.stop="handleDeleteProject(project.id)">
                ɾ��
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="projectList.length > 0" class="pagination-wrapper" style="margin-top: 16px; text-align: center;">
          <el-pagination v-model:current-page="projectPage" :page-size="10" :total="projectTotal"
            layout="prev, pager, next" small @current-change="fetchProjects" />
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="showSaveDialog" title="?? ������Ʒ" width="480px">
      <el-form :model="saveForm" label-width="80px" size="default">
        <el-form-item label="����">
          <el-input v-model="saveForm.title" placeholder="����Ʒ�������..." />
        </el-form-item>
        <el-form-item label="����">
          <el-input v-model="saveForm.description" type="textarea" :rows="3" placeholder="������һ�������Ʒ����ѡ��..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSaveDialog = false">ȡ��</el-button>
        <el-button type="primary" @click="confirmSaveProject" :loading="isSaving">
          ȷ�ϱ���
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showShareDialog" title="?? ���������Ʒ" width="560px">
      <ShareDialog :project-id="currentProjectId" :share-token="currentProjectShareToken"
        :is-project-public="isProjectPublic" @share-updated="handleShareUpdated" />
    </el-dialog>

    <el-drawer v-model="showVersionDrawer" title="?? �汾��ʷ" direction="rtl" size="420px">
      <VersionHistory :project-id="currentProjectId" :current-version="currentVersionNumber"
        @restore="handleRestoreVersion" @created="handleVersionCreated" />
    </el-drawer>

    <el-dialog v-model="showTemplateDialog" title="?? ��Ŀģ���" width="720px">
      <TemplateGallery :local-templates="localTemplateList" @select="handleTemplateSelect" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Loading, Search } from '@element-plus/icons-vue'
import MultiFileEditor from './components/MultiFileEditor.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import ShareDialog from './components/ShareDialog.vue'
import VersionHistory from './components/VersionHistory.vue'
import TemplateGallery from './components/TemplateGallery.vue'
import { useCodePackager } from './composables/useCodePackager.js'
import { double11Template } from './data/double11Template.js'
import { newProductTemplate } from './data/NewProductTemplate.js'
import { appDownloadTemplate } from './data/AppDownloadTemplate.js'
import { aiApi } from '@/api/ai'
import { projectsApi } from '@/api/projects'

const userMode = ref('expert')
const selectedTemplate = ref('')
const isPackaging = ref(false)
const previewRef = ref(null)
const lastChangedFile = ref('')

const showAIDialog = ref(false)
const isAIGenerating = ref(false)
const aiPrompt = ref('')
const aiStyle = ref('modern')
const aiExamples = [
  '����һ���Ƽ���Ʒ���ҳ����ɫ���⣬�����Ӷ�������',
  '��һ����ʳ������ҳ��ůɫ������Ƭʽ����',
  '���һ�����˼���ҳ�棬���רҵ����ҳ����',
  '����һ�������ҳ�棬��������ʱ�ͱ���',
]

const showProjectDrawer = ref(false)
const showSaveDialog = ref(false)
const isSaving = ref(false)
const isLoadingProjects = ref(false)
const projectList = ref([])
const projectTotal = ref(0)
const projectPage = ref(1)
const projectSearchKeyword = ref('')
const currentProjectId = ref(null)
const currentProjectShareToken = ref('')
const currentVersionNumber = ref(0)
const isProjectPublic = ref(false)
const saveForm = ref({
  title: '',
  description: '',
})

const showShareDialog = ref(false)
const showVersionDrawer = ref(false)
const showTemplateDialog = ref(false)

const files = ref([
  {
    name: 'index.html',
    content: '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>��ʼ��д��ĵ�һ����ҳ...</p>\n  \n  <' + 'script src="script.js"><' + '/script>\n</body>\n</html>',
    language: 'html',
  },
  {
    name: 'style.css',
    content: `/* �������дCSS��ʽ */\n* {\n margin: 0;\n padding: 0;\n box-sizing: border-box;\n}\n\nbody {\n font-family:
-apple-system, BlinkMacSystemFont, sans-serif;\n display: flex;\n align-items: center;\n justify-content: center;\n
min-height: 100vh;\n background: linear-gradient(135deg, #667eea, #764ba2);\n color: white;\n}\n`,
    language: 'css',
  },
  {
    name: 'script.js',
    content: `// �������дJavaScript\ndocument.addEventListener('DOMContentLoaded', function() {\n \n})\n`,
    language: 'javascript',
  },
])

const allTemplates = {
  double11: double11Template,
  newProduct: newProductTemplate,
  appDownload: appDownloadTemplate,
}

const localTemplateList = computed(() => [
  { value: 'double11', name: '?? ˫11�񻶴���ҳ', label: '?? ˫11�񻶴���ҳ', description: '���̴����ҳ��ģ��', category: 'marketing', icon: '??', features: ['����ʱ', '�Ż�ȯ', '��Ʒ�б�'] },
  { value: 'newProduct', name: '?? ��Ʒ����Ԥ��ҳ', label: '?? ��Ʒ����Ԥ��ҳ', description: '��Ʒ����Ԥ��ҳ��ģ��', category: 'landing', icon: '??', features: ['����', '����ʱ', 'ԤԼ����'] },
  { value: 'appDownload', name: '?? APP��������ҳ', label: '?? APP��������ҳ', description: 'APP��������ҳ��ģ��', category: 'landing', icon: '??', features: ['���ذ�ť', '����չʾ', '��ͼ�ֲ�'] },
  { value: 'blank', name: '?? �հ�ҳ��', label: '?? �հ�ҳ��', description: '���㿪ʼ����', category: 'other', icon: '??', features: [] },
])

const templateFields = computed(() => {
  const template = allTemplates[selectedTemplate.value]
  return template?.customizableFields || []
})

const templateValues = ref({})

const shareUrl = computed(() => {
  if (currentProjectShareToken.value) {
    return `${window.location.origin}/share/${currentProjectShareToken.value}`
  }
  return `${window.location.origin}/preview/${Date.now()}`
})

const projectCount = computed(() => projectTotal.value)

const filteredProjectList = computed(() => {
  if (!projectSearchKeyword.value) return projectList.value
  const keyword = projectSearchKeyword.value.toLowerCase()
  return projectList.value.filter(p =>
    (p.title && p.title.toLowerCase().includes(keyword)) ||
    (p.description && p.description.toLowerCase().includes(keyword))
  )
})

const { packAndDownload, exportSingleFile, copyToClipboard } = useCodePackager({
  defaultFileName: 'my-page',
})

function loadTemplate(templateId) {
  if (templateId === 'blank') {
    resetToBlank()
    return
  }

  const template = allTemplates[templateId]
  if (!template) return

  files.value = template.baseFiles.map(f => ({ ...f }))

  templateValues.value = {}
  template.customizableFields.forEach(field => {
    templateValues.value[field.key] = field.default
  })

  ElMessage.success(`�Ѽ���ģ�壺${template.name}`)
}

function applyTemplateValues() {
  if (!selectedTemplate.value) return

  let newFiles = [...files.value]

  newFiles = newFiles.map(file => ({
    ...file,
    content: replaceTemplateVariables(file.content, templateValues.value),
  }))

  files.value = newFiles

  ElMessage.success('? ������Ӧ�õ����룡')
}

function replaceTemplateVariables(content, values) {
  let result = content
  Object.entries(values).forEach(([key, value]) => {
    result = result.replaceAll(`{{${key}}}`, value)
  })
  return result
}

function resetToBlank() {
  files.value = [
    {
      name: 'index.html',
      content: `<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Hello World!</h1>\n  <p>��ʼ��д�����ҳ...</p>\n  <script src="script.js"><\\/script>\n</body>\n</html>`,
      language: 'html',
    },
    {
      name: 'style.css',
      content: `/* CSS */\n* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: sans-serif; }`,
      language: 'css',
    },
    {
      name: 'script.js',
      content: `// JS\ndocument.addEventListener('DOMContentLoaded', () => {})`,
      language: 'javascript',
    },
  ]

  selectedTemplate.value = ''
  templateValues.value = {}
  currentProjectId.value = null
}

async function handleTemplateSelect({ type, template }) {
  if (type === 'local') {
    if (template.value === 'blank') {
      resetToBlank()
    } else {
      loadTemplate(template.value)
    }
  } else if (type === 'database') {
    try {
      const res = await projectsApi.getTemplateDetail(template.id)
      if (res?.files_data) {
        let filesData = res.files_data
        if (typeof filesData === 'string') {
          filesData = JSON.parse(filesData)
        }
        if (Array.isArray(filesData)) {
          files.value = filesData.map(f => ({
            name: f.name,
            content: f.content,
            language: f.language || getLanguageFromName(f.name),
          }))
          ElMessage.success(`�Ѽ���ģ�壺${template.name}`)
        }
      }
    } catch (e) {
      console.error('����ģ��ʧ��:', e)
      ElMessage.error('����ģ��ʧ��')
    }
  }
  showTemplateDialog.value = false
}

async function handleAIGenerate() {
  if (!aiPrompt.value.trim()) {
    ElMessage.warning('��������������')
    return
  }

  isAIGenerating.value = true

  try {
    let res = await aiApi.codeGenerate({
      prompt: aiPrompt.value,
      style: aiStyle.value,
      features: ['responsive', 'animation'],
    })

    if (typeof res === 'string') {
      try { res = JSON.parse(res) }
      catch (e) {
        console.warn('[AI CodeGen] ��JSON�ַ�������ΪHTML����')
        res = { html: res }
      }
    }

    if (res?.data && !res?.files && !res?.html) {
      res = res.data
    }

    if (typeof res === 'string') {
      try { res = JSON.parse(res) }
      catch (e) { res = { html: res } }
    }

    function tryParseFileContent(content, fileName) {
      if (!content || typeof content !== 'string') return content

      let trimmed = content.trim()

      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
          trimmed = JSON.parse(trimmed)
          if (typeof trimmed === 'string') {
            return tryParseFileContent(trimmed, fileName)
          }
        } catch (e) {
        }
      }

      if (typeof trimmed === 'string' && (trimmed.startsWith('{"') || trimmed.startsWith('{')) && trimmed.length > 10) {
        try {
          const possibleJSON = JSON.parse(trimmed)
          if (possibleJSON && typeof possibleJSON === 'object') {
            const extracted = possibleJSON.html || possibleJSON.css || possibleJSON.js
              || possibleJSON.content || possibleJSON.code || content
            return extracted
          }
        } catch (e) {
          console.warn(`[AI CodeGen] JSON����ʧ��: ${e.message}`)
        }
      }

      return content
    }

    let generatedFiles = []

    if (res?.files && Array.isArray(res.files)) {
      generatedFiles = res.files.map(f => {
        let fileContent = f.content || ''
        fileContent = tryParseFileContent(fileContent, f.name)

        if (typeof fileContent === 'string' && (fileContent.includes('\\n') || fileContent.includes('\\t'))) {
          console.warn(`[AI CodeGen] ${f.name} �м�⵽������ת���ַ������ڻ�ԭ...`)
          fileContent = fileContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\"/g, '"')
        }

        return {
          name: f.name || 'index.html',
          content: fileContent,
          language: f.language || getLanguageFromName(f.name),
        }
      })
    } else if (res?.html || res?.css || res?.js) {
      if (res.html) {
        let htmlContent = res.html
        htmlContent = tryParseFileContent(htmlContent, 'index.html')
        generatedFiles.push({ name: 'index.html', content: htmlContent, language: 'html' })
      }
      if (res.css) {
        let cssContent = res.css
        cssContent = tryParseFileContent(cssContent, 'style.css')
        generatedFiles.push({ name: 'style.css', content: cssContent, language: 'css' })
      }
      if (res.js) {
        let jsContent = res.js
        jsContent = tryParseFileContent(jsContent, 'script.js')
        generatedFiles.push({ name: 'script.js', content: jsContent, language: 'javascript' })
      }
    } else if (typeof res === 'object' && res !== null && Object.keys(res).length > 0) {
      const possibleHtml = res.content || res.code || res.text

      if (possibleHtml && (possibleHtml.includes('<') || possibleHtml.includes('html'))) {
        let htmlContent = possibleHtml
        htmlContent = tryParseFileContent(htmlContent, 'index.html')
        generatedFiles.push({
          name: 'index.html',
          content: htmlContent,
          language: 'html',
        })
        } else {
        console.error('[AI CodeGen] ����ģʽʧ�ܣ�δ�ҵ���ЧHTML����')
        throw new Error('AI���ص����ݸ�ʽ����ȷ��δ��ȡ����Ч�ļ���')
      }
    }

    if (generatedFiles.length > 0) {
      files.value = generatedFiles
      userMode.value = 'expert'
      selectedTemplate.value = ''

      ElMessage.success(`? AI������${generatedFiles.length}���ļ���`)
      showAIDialog.value = false
      aiPrompt.value = ''
    } else {
      throw new Error('AI���ص����ݸ�ʽ����ȷ��δ��ȡ����Ч�ļ���ԭʼ����: ' + JSON.stringify(res).slice(0, 200))
    }
  } catch (error) {
    console.error('AI�������ɴ���:', error)
    ElMessage.error('AI����ʧ�ܣ�' + (error.message || 'δ֪����'))
  } finally {
    isAIGenerating.value = false
  }
}

async function handleSaveProject() {
  saveForm.value = {
    title: '',
    description: '',
  }

  if (selectedTemplate.value && allTemplates[selectedTemplate.value]) {
    saveForm.value.title = allTemplates[selectedTemplate.value].name
  }

  showSaveDialog.value = true
}

async function confirmSaveProject() {
  if (!saveForm.value.title.trim()) {
    ElMessage.warning('��������Ʒ����')
    return
  }

  isSaving.value = true

  try {
    const payload = {
      title: saveForm.value.title.trim(),
      description: saveForm.value.description.trim(),
      source_type: selectedTemplate.value ? 'template' : (currentProjectId.value ? 'manual' : 'manual'),
      source_template_id: selectedTemplate.value || null,
      files_data: JSON.stringify(files.value.map(f => ({
        name: f.name,
        content: f.content,
        language: f.language,
      }))),
      template_values: Object.keys(templateValues.value).length > 0
        ? JSON.stringify(templateValues.value)
        : null,
      user_mode: userMode.value,
      file_count: files.value.length,
      total_size: files.value.reduce((sum, f) => sum + (f.content?.length || 0), 0),
      is_public: isProjectPublic.value,
    }

    let res
    if (currentProjectId.value) {
      res = await projectsApi.update(currentProjectId.value, payload)
    } else {
      res = await projectsApi.save(payload)
    }

    if (res?.id || res?.code === 200) {
      const projectId = res?.id || res?.data?.id
      const shareToken = res?.share_token || res?.data?.share_token

      currentProjectId.value = projectId
      currentProjectShareToken.value = shareToken

      ElMessage.success('? ��Ʒ����ɹ���')
      showSaveDialog.value = false
    } else {
      throw new Error(res?.message || '����ʧ��')
    }
  } catch (error) {
    console.error('������Ŀ����:', error)
    ElMessage.error('����ʧ�ܣ�' + (error.message || 'δ֪����'))
  } finally {
    isSaving.value = false
  }
}

async function fetchProjects() {
  isLoadingProjects.value = true

  try {
    const res = await projectsApi.getList({
      page: projectPage.value,
      page_size: 10,
      keyword: projectSearchKeyword.value || undefined,
    })

    if (Array.isArray(res)) {
      projectList.value = res
      projectTotal.value = res.length
    } else if (res?.items || res?.list || res?.data) {
      projectList.value = res.items || res.list || res.data || []
      projectTotal.value = res.pagination?.total || res.total || res.list?.length || 0
    }
  } catch (error) {
    console.error('��ȡ��Ŀ�б�����:', error)
    ElMessage.error('��ȡ��Ʒ�б�ʧ��')
  } finally {
    isLoadingProjects.value = false
  }
}

async function handleLoadProject(project) {
  try {
    const res = await projectsApi.getDetail(project.id)

    if (res?.files_data) {
      let filesData = res.files_data
      if (typeof filesData === 'string') {
        try {
          filesData = JSON.parse(filesData)
        } catch (e) {
          console.error('�����ļ�����ʧ��:', e)
        }
      }

      if (Array.isArray(filesData)) {
        files.value = filesData.map(f => ({
          name: f.name,
          content: f.content,
          language: f.language || getLanguageFromName(f.name),
        }))
      }

      currentProjectId.value = project.id
      currentProjectShareToken.value = project.share_token || ''
      currentVersionNumber.value = res.current_version || 0
      isProjectPublic.value = !!project.is_public

      if (res.template_values) {
        try {
          templateValues.value = typeof res.template_values === 'string'
            ? JSON.parse(res.template_values)
            : res.template_values
        } catch (e) {
          templateValues.value = {}
        }
      }

      userMode.value = res.user_mode || 'expert'

      ElMessage.success(`�Ѽ�����Ʒ��${project.title || 'δ����'}`)
      showProjectDrawer.value = false
    } else {
      throw new Error('��Ŀ���ݲ�����')
    }
  } catch (error) {
    console.error('������Ŀ����:', error)
    ElMessage.error('������Ʒʧ�ܣ�' + (error.message || 'δ֪����'))
  }
}

async function handleDeleteProject(projectId) {
  try {
    await ElMessageBox.confirm(
      'ȷ��Ҫɾ�������Ʒ��ɾ������ڻ���վ�ָ���',
      'ȷ��ɾ��',
      {
        confirmButtonText: 'ȷ��ɾ��',
        cancelButtonText: 'ȡ��',
        type: 'warning',
      }
    )

    await projectsApi.delete(projectId)

    projectList.value = projectList.value.filter(p => p.id !== projectId)
    projectTotal.value -= 1

    if (currentProjectId.value === projectId) {
      currentProjectId.value = null
      currentProjectShareToken.value = ''
    }

    ElMessage.success('��Ʒ��ɾ��')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('ɾ����Ŀ����:', error)
      ElMessage.error('ɾ��ʧ��')
    }
  }
}

function handleShareUpdated({ isPublic }) {
  isProjectPublic.value = isPublic
}

async function handleRestoreVersion(ver) {
  if (!currentProjectId.value) return

  try {
    const res = await projectsApi.getDetail(currentProjectId.value)
    if (res?.files_data) {
      let filesData = res.files_data
      if (typeof filesData === 'string') {
        filesData = JSON.parse(filesData)
      }
      if (Array.isArray(filesData)) {
        files.value = filesData.map(f => ({
          name: f.name,
          content: f.content,
          language: f.language || getLanguageFromName(f.name),
        }))
      }
      currentVersionNumber.value = ver.version_number
    }
  } catch (e) {
    console.error('�ָ��汾�����ʧ��:', e)
  }
}

function handleVersionCreated() {
}

function getLanguageFromName(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap = {
    html: 'html',
    htm: 'html',
    css: 'css',
    js: 'javascript',
    json: 'json',
    md: 'markdown',
  }
  return langMap[ext] || 'plaintext'
}

function getSourceTypeLabel(type) {
  const map = {
    ai_generated: 'AI����',
    template: 'ģ��',
    manual: '�ֶ�����',
  }
  return map[type] || type
}

function getSourceTypeTagType(type) {
  const map = {
    ai_generated: 'warning',
    template: 'success',
    manual: 'info',
  }
  return map[type] || 'info'
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '�ո�'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}����ǰ`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}Сʱǰ`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}��ǰ`
  return date.toLocaleDateString('zh-CN')
}

function onFileChange({ name, content }) {
  lastChangedFile.value = name
}

async function handleDownloadZip() {
  isPackaging.value = true
  try {
    await packAndDownload(files.value, 'my-h5-page')
    ElMessage.success('? ZIP�ļ������ɲ���ʼ���أ�')
  } catch (error) {
    ElMessage.error('���ʧ�ܣ�' + error.message)
  } finally {
    isPackaging.value = false
  }
}

async function handleDownloadHTML() {
  try {
    await exportSingleFile(files.value)
    ElMessage.success('? HTML�ļ������أ�')
  } catch (error) {
    ElMessage.error('����ʧ�ܣ�' + error.message)
  }
}

async function handleCopyCode() {
  try {
    const success = await copyToClipboard(files.value)
    if (success) {
      ElMessage.success('? �����Ѹ��Ƶ������壡')
    }
  } catch (error) {
    ElMessage.error('����ʧ�ܣ�' + error.message)
  }
}

watch(showProjectDrawer, (val) => {
  if (val) {
    fetchProjects()
  }
})

onMounted(() => {
  ElMessage.info('?? ��ʾ������AI���ɹ��ܣ�����Ȼ����������������������ҳ����')
})
</script>

<style scoped>
.code-studio-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--fill-base);
  overflow: hidden;
}

.page-header {
  background: var(--bg-white);
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.breadcrumb {
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.page-desc {
  color: var(--text-regular);
  font-size: 14px;
  margin: 0;
}

.studio-toolbar {
  background: var(--bg-white);
  padding: 12px 24px;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.template-config {
  margin-left: 8px;
}

.config-panel {
  max-height: 400px;
  overflow-y: auto;
}

.workspace {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
  min-height: 0;
}

.editor-pane,
.preview-pane {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-pane {
  border-right: 1px solid var(--border-light);
}

.ai-dialog-content {
  text-align: left;
}

.ai-style-selector {
  margin-bottom: 8px;
}

.project-drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.project-search {
  margin-bottom: 16px;
}

.project-list {
  flex: 1;
  overflow-y: auto;
}

.project-card {
  background: var(--fill-lighter);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.project-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.project-card.active {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
}

.project-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.project-card-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
}

.project-card-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-placeholder);
  margin-bottom: 8px;
}

.project-card-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid var(--border-lighter);
}

@media (max-width: 1024px) {
  .workspace {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }

  .editor-pane {
    border-right: none;
    border-bottom: 1px solid var(--border-light);
  }

  .studio-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
