﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="template-gallery">
    <div class="gallery-header">
      <h3>📦 项目模板库</h3>
      <p>选择一个模板快速开始，或从数据库加载更多模板</p>
    </div>

    <div class="gallery-tabs">
      <el-radio-group v-model="activeCategory" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="landing">着陆页</el-radio-button>
        <el-radio-button value="marketing">营销页</el-radio-button>
        <el-radio-button value="portfolio">作品集</el-radio-button>
        <el-radio-button value="other">其他</el-radio-button>
      </el-radio-group>
    </div>

    <div class="template-grid">
      <div v-for="tpl in filteredTemplates" :key="tpl.id || tpl.value" class="template-card"
        :class="{ selected: selectedTemplate === (tpl.id || tpl.value) }"
        @click="selectTemplate(tpl)">
        <div class="template-preview">
          <div class="preview-icon">{{ tpl.icon || '📄' }}</div>
          <div v-if="tpl.features && tpl.features.length" class="template-features">
            <span v-for="feat in tpl.features.slice(0, 3)" :key="feat" class="feature-tag">{{ feat }}</span>
          </div>
        </div>
        <div class="template-info">
          <h4>{{ tpl.name || tpl.label }}</h4>
          <p>{{ tpl.description || '' }}</p>
          <div v-if="tpl.usage_count" class="template-meta">
            <span>🔥 {{ tpl.usage_count }} 次使用</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="dbTemplates.length > 0" class="db-templates-section">
      <el-divider>数据库模板</el-divider>
      <div class="template-grid">
        <div v-for="tpl in filteredDbTemplates" :key="tpl.id" class="template-card db-template"
          :class="{ selected: selectedTemplate === tpl.id }"
          @click="selectDbTemplate(tpl)">
          <div class="template-preview">
            <div class="preview-icon">{{ tpl.icon || '📦' }}</div>
          </div>
          <div class="template-info">
            <h4>{{ tpl.name }}</h4>
            <p>{{ tpl.description || '无描述' }}</p>
            <div class="template-meta">
              <span>🔥 {{ tpl.usage_count || 0 }} 次使用</span>
              <el-tag size="small" type="info">{{ tpl.category }}</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoadingDb" class="loading-state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>加载模板中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { projectsApi } from '@/api/projects'

const props = defineProps({
  localTemplates: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

const activeCategory = ref('all')
const selectedTemplate = ref(null)
const dbTemplates = ref([])
const isLoadingDb = ref(false)

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'all') return props.localTemplates
  return props.localTemplates.filter(t => t.category === activeCategory.value)
})

const filteredDbTemplates = computed(() => {
  if (activeCategory.value === 'all') return dbTemplates.value
  return dbTemplates.value.filter(t => t.category === activeCategory.value)
})

function selectTemplate(tpl) {
  selectedTemplate.value = tpl.id || tpl.value
  emit('select', { type: 'local', template: tpl })
}

function selectDbTemplate(tpl) {
  selectedTemplate.value = tpl.id
  emit('select', { type: 'database', template: tpl })
}

async function loadDbTemplates() {
  isLoadingDb.value = true
  try {
    const res = await projectsApi.getTemplates({ category: activeCategory.value === 'all' ? undefined : activeCategory.value })
    if (res?.templates) {
      dbTemplates.value = res.templates
    } else if (Array.isArray(res)) {
      dbTemplates.value = res
    }
  } catch (e) {
    console.error('加载数据库模板失败:', e)
  } finally {
    isLoadingDb.value = false
  }
}

onMounted(() => {
  loadDbTemplates()
})
</script>

<style scoped>
.template-gallery {
  padding: 8px 0;
}

.gallery-header {
  margin-bottom: 16px;
}

.gallery-header h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: var(--text-primary);
}

.gallery-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.gallery-tabs {
  margin-bottom: 16px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.template-card {
  background: var(--fill-lighter);
  border: 2px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light-9);
}

.template-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.preview-icon {
  font-size: 36px;
  line-height: 1;
}

.template-features {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.feature-tag {
  background: var(--color-primary-light-9);
  color: var(--color-primary);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
}

.template-info h4 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}

.template-info p {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-placeholder);
}

.db-templates-section {
  margin-top: 8px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
