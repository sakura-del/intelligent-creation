<template>
  <div class="prompt-library-page">
    <div class="page-header">
      <div class="breadcrumb">
        <span>首页</span>
        <el-icon>
          <ArrowRight />
        </el-icon>
        <span class="current">提示词工程</span>
      </div>
      <h1 class="page-title">提示词工程中心</h1>
      <p class="page-desc">构建、管理和优化你的AI提示词，提升生成效果</p>
    </div>

    <div class="library-container">
      <aside class="sidebar">
        <div class="nav-section">
          <h3 class="nav-title">导航</h3>
          <div class="nav-tabs">
            <button v-for="tab in tabs" :key="tab.value" class="nav-tab" :class="{ active: activeTab === tab.value }"
              @click="switchTab(tab.value)">
              <el-icon>
                <component :is="tab.icon" />
              </el-icon>
              <span>{{ tab.label }}</span>
              <el-badge v-if="tab.count" :value="tab.count" class="tab-badge" />
            </button>
          </div>
        </div>

        <div class="category-section">
          <h3 class="nav-title">分类</h3>
          <div class="category-list">
            <button v-for="cat in categories" :key="cat.value" class="category-item"
              :class="{ active: selectedCategory === cat.value }" @click="filterByCategory(cat.value)">
              {{ cat.label }}
              <span class="count">{{ cat.count || 0 }}</span>
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'recommend'" class="scene-section">
          <h3 class="nav-title">使用场景</h3>
          <div class="scene-list">
            <button v-for="scene in availableScenes" :key="scene.name" class="scene-item"
              :class="{ active: selectedScene === scene.name }" @click="filterByScene(scene.name)">
              {{ scene.label }}
            </button>
          </div>
        </div>

        <div class="stats-card" v-if="activeTab === 'mine'">
          <h4>我的统计</h4>
          <div class="stat-item">
            <span>总提示词</span>
            <strong>{{ myStats.total }}</strong>
          </div>
          <div class="stat-item">
            <span>公开的</span>
            <strong>{{ myStats.public }}</strong>
          </div>
          <div class="stat-item">
            <span>总使用量</span>
            <strong>{{ myStats.totalUses }}</strong>
          </div>
        </div>
      </aside>

      <main class="main-content">
        <div class="toolbar">
          <el-input v-model="searchQuery" placeholder="搜索提示词..." prefix-icon="Search" clearable class="search-input"
            @input="handleSearch" />
          <el-select v-model="sortBy" placeholder="排序方式" @change="fetchPrompts">
            <el-option label="最新创建" value="create_time" />
            <el-option label="最多使用" value="use_count" />
            <el-option label="最高评分" value="avg_rating" />
            <el-option label="标题A-Z" value="title" />
          </el-select>
          <el-button type="primary" @click="openCreateDialog">
            <el-icon>
              <Plus />
            </el-icon>
            新建提示词
          </el-button>
        </div>

        <div v-if="loading" class="loading-state">
          <el-icon class="is-loading" :size="40">
            <Loading />
          </el-icon>
          <p>加载中...</p>
        </div>

        <div v-else-if="prompts.length === 0" class="empty-state">
          <el-icon :size="64" color="#DCDFE6">
            <DocumentCopy />
          </el-icon>
          <h3>{{ activeTab === 'recommend' ? '暂无推荐' : activeTab === 'templates' ? '暂无模板' : '还没有提示词' }}</h3>
          <p>{{ activeTab === 'recommend' ? '使用更多提示词后，系统将为你智能推荐' : activeTab === 'templates' ? '系统预设模板正在加载...' :
            '点击"新建提示词"开始创建你的第一个提示词' }}</p>
        </div>

        <div v-else class="prompt-grid">
          <div v-for="prompt in prompts" :key="prompt.id" v-memo="[prompt.id, prompt.is_favorite, prompt.is_public]"
            class="prompt-card" @click="viewDetail(prompt)">
            <div class="card-header">
              <div class="card-title-row">
                <h4 class="card-title">{{ prompt.title }}</h4>
                <el-tag v-if="prompt.is_template" type="success" size="small" effect="dark">模板</el-tag>
                <el-tag v-else-if="prompt.is_public" type="primary" size="small" effect="dark">公开</el-tag>
                <el-tag v-else type="info" size="small">私有</el-tag>
              </div>
              <p class="card-category">{{ getCategoryLabel(prompt.category) }}</p>
            </div>

            <div class="card-body">
              <p class="card-content">{{ truncateText(prompt.content, 120) }}</p>
              <div v-if="prompt.variables?.length" class="card-variables">
                <el-tag v-for="v in prompt.variables.slice(0, 4)" :key="v.name" size="small" type="warning"
                  effect="plain">
                  {{ '{' + '{' + v.name + '}' + '}' }}
                </el-tag>
                <span v-if="prompt.variables.length > 4" class="more-vars">
                  +{{ prompt.variables.length - 4 }}
                </span>
              </div>
              <div v-if="prompt.tags?.length" class="card-tags">
                <el-tag v-for="tag in prompt.tags.slice(0, 3)" :key="tag" size="small" type="info" effect="plain">
                  {{ tag }}
                </el-tag>
                <span v-if="prompt.tags.length > 3" class="more-tags">
                  +{{ prompt.tags.length - 3 }}
                </span>
              </div>
            </div>

            <div class="card-footer">
              <div class="card-meta">
                <span class="meta-item">
                  <el-icon>
                    <View />
                  </el-icon>
                  {{ prompt.use_count || 0 }}
                </span>
                <span v-if="prompt.avg_rating" class="meta-item">
                  <el-icon>
                    <StarFilled />
                  </el-icon>
                  {{ prompt.avg_rating }}
                </span>
                <span class="meta-item">
                  <el-icon>
                    <Clock />
                  </el-icon>
                  {{ formatTime(prompt.create_time) }}
                </span>
                <span v-if="prompt.version > 1" class="meta-item version-badge">
                  v{{ prompt.version }}
                </span>
              </div>
              <div class="card-actions" @click.stop>
                <el-tooltip content="使用此提示词" placement="top">
                  <el-button circle size="small" @click="usePrompt(prompt)">
                    <el-icon>
                      <Promotion />
                    </el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="Fork复制" placement="top"
                  v-if="activeTab === 'templates' || activeTab === 'recommend' || (prompt.is_public && prompt.user_id !== currentUserId)">
                  <el-button circle size="small" @click="forkPrompt(prompt)">
                    <el-icon>
                      <CopyDocument />
                    </el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="编辑" placement="top" v-if="canEdit(prompt)">
                  <el-button circle size="small" type="primary" @click="editPrompt(prompt)">
                    <el-icon>
                      <Edit />
                    </el-icon>
                  </el-button>
                </el-tooltip>
                <el-tooltip content="删除" placement="top" v-if="canDelete(prompt)">
                  <el-button circle size="small" type="danger" @click="deletePrompt(prompt)">
                    <el-icon>
                      <Delete />
                    </el-icon>
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>

        <div v-if="pagination.totalPages > 1" class="pagination-wrapper">
          <el-pagination v-model:current-page="pagination.page" :page-size="pagination.limit" :total="pagination.total"
            layout="prev, pager, next, total" @current-change="handlePageChange" />
        </div>
      </main>
    </div>

    <el-dialog v-model="showCreateDialog" :title="editingPrompt ? '编辑提示词' : '新建提示词'" width="750px" destroy-on-close>
      <el-form :model="formData" label-width="100px" :rules="formRules" ref="formRef">
        <el-form-item label="标题" prop="title">
          <el-input v-model="formData.title" placeholder="给你的提示词起个名字" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select v-model="formData.category" placeholder="选择分类">
            <el-option v-for="cat in categoryOptions" :key="cat.value" :label="cat.label" :value="cat.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <el-input v-model="formData.content" type="textarea" :rows="8"
            placeholder="输入提示词正文...&#10;使用 {{variable_name}} 定义变量，例如：&#10;Generate a photo of {{subject}} with {{style}} style"
            maxlength="5000" show-word-limit @input="onContentChange" />
          <div v-if="detectedVariables.length" class="detected-vars-hint">
            <el-icon>
              <InfoFilled />
            </el-icon>
            检测到变量：{{detectedVariables.map(v => '{' + '{' + v + '}' + '}').join(', ')}}
          </div>
        </el-form-item>

        <el-form-item v-if="formData.variables.length > 0" label="变量定义">
          <div class="variables-editor">
            <div v-for="(v, idx) in formData.variables" :key="idx" class="var-row">
              <el-input v-model="v.name" placeholder="变量名" size="small" style="width:120px" disabled />
              <el-input v-model="v.description" placeholder="描述" size="small" style="flex:1" />
              <el-input v-model="v.default_value" placeholder="默认值" size="small" style="width:140px" />
              <el-switch v-model="v.required" active-text="必填" inactive-text="" size="small" />
              <el-button type="danger" circle size="small" @click="formData.variables.splice(idx, 1)">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="formData.description" type="textarea" :rows="2" placeholder="简短描述这个提示词的用途（可选）"
            maxlength="500" show-word-limit />
        </el-form-item>

        <el-form-item label="标签">
          <div class="tags-input">
            <el-tag v-for="(tag, idx) in formData.tags" :key="idx" closable @close="formData.tags.splice(idx, 1)">
              {{ tag }}
            </el-tag>
            <el-input v-if="tagInputVisible" ref="tagInputRef" v-model="tagInputValue" size="small" style="width: 120px"
              @keyup.enter="addTag" @blur="addTag" />
            <el-button v-else size="small" @click="showTagInput">+ 添加标签</el-button>
          </div>
        </el-form-item>

        <el-form-item label="适用场景">
          <div class="tags-input">
            <el-tag v-for="(tag, idx) in formData.scene_tags" :key="idx" closable
              @close="formData.scene_tags.splice(idx, 1)" type="success">
              {{ tag }}
            </el-tag>
            <el-input v-if="sceneInputVisible" ref="sceneInputRef" v-model="sceneInputValue" size="small"
              style="width: 140px" @keyup.enter="addSceneTag" @blur="addSceneTag" />
            <el-button v-else size="small" @click="showSceneInput">+ 添加场景</el-button>
          </div>
        </el-form-item>

        <el-form-item label="使用难度">
          <el-radio-group v-model="formData.difficulty">
            <el-radio-button value="beginner">入门</el-radio-button>
            <el-radio-button value="intermediate">进阶</el-radio-button>
            <el-radio-button value="advanced">高级</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="editingPrompt" label="变更说明">
          <el-input v-model="formData.change_log" placeholder="描述本次修改的内容（可选）" maxlength="500" show-word-limit />
        </el-form-item>

        <el-form-item label="设为模板">
          <el-switch v-model="formData.is_template" active-text="是" inactive-text="否" />
          <span class="form-hint">模板会显示在模板市场中供其他用户使用</span>
        </el-form-item>

        <el-form-item label="公开">
          <el-switch v-model="formData.is_public" active-text="公开" inactive-text="私有" />
          <span class="form-hint">公开后其他用户可以查看和使用</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ editingPrompt ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetailDialog" title="提示词详情" width="850px">
      <div v-if="selectedPrompt" class="detail-content">
        <div class="detail-header">
          <h2>{{ selectedPrompt.title }}</h2>
          <div class="detail-meta">
            <el-tag :type="selectedPrompt.is_template ? 'success' : selectedPrompt.is_public ? 'primary' : 'info'"
              size="small">
              {{ selectedPrompt.is_template ? '模板' : selectedPrompt.is_public ? '公开' : '私有' }}
            </el-tag>
            <el-tag v-if="selectedPrompt.difficulty" size="small" effect="plain">
              {{ difficultyLabel(selectedPrompt.difficulty) }}
            </el-tag>
            <span class="author">{{ selectedPrompt.author_name }}</span>
            <span class="time">{{ formatTime(selectedPrompt.create_time) }}</span>
          </div>
        </div>

        <el-divider />

        <div class="detail-section">
          <h4>提示词内容</h4>
          <div class="code-block">
            <pre>{{ selectedPrompt.content }}</pre>
          </div>
          <div v-if="selectedPrompt.variables?.length" class="resolved-preview">
            <el-button size="small" type="primary" @click="showVariableFillDialog = true">
              <el-icon>
                <Edit />
              </el-icon>
              填充变量并预览
            </el-button>
          </div>
        </div>

        <div v-if="selectedPrompt.description" class="detail-section">
          <h4>描述</h4>
          <p>{{ selectedPrompt.description }}</p>
        </div>

        <div v-if="selectedPrompt.tags?.length" class="detail-section">
          <h4>标签</h4>
          <div class="detail-tags">
            <el-tag v-for="tag in selectedPrompt.tags" :key="tag" effect="plain">{{ tag }}</el-tag>
          </div>
        </div>

        <div v-if="selectedPrompt.scene_tags?.length" class="detail-section">
          <h4>适用场景</h4>
          <div class="detail-tags">
            <el-tag v-for="tag in selectedPrompt.scene_tags" :key="tag" type="success" effect="plain">{{ tag }}</el-tag>
          </div>
        </div>

        <div class="detail-section">
          <h4>统计数据</h4>
          <div class="stats-grid">
            <div class="stat-box">
              <strong>{{ selectedPrompt.stats?.totalUses || 0 }}</strong>
              <span>使用次数</span>
            </div>
            <div class="stat-box">
              <strong>{{ selectedPrompt.use_count }}</strong>
              <span>直接调用</span>
            </div>
            <div class="stat-box">
              <strong>{{ selectedPrompt.avg_rating || '-' }}</strong>
              <span>平均评分</span>
            </div>
            <div class="stat-box">
              <strong>v{{ selectedPrompt.version }}</strong>
              <span>当前版本</span>
            </div>
          </div>
        </div>

        <div v-if="selectedPrompt.recentRatings?.length" class="detail-section">
          <h4>最近评价</h4>
          <div class="ratings-list">
            <div v-for="r in selectedPrompt.recentRatings" :key="r.create_time" class="rating-item">
              <div class="rating-header">
                <span class="rating-user">{{ r.username || '匿名用户' }}</span>
                <el-rate v-model="r.rating" disabled size="small" />
                <span class="rating-time">{{ formatTime(r.create_time) }}</span>
              </div>
              <p v-if="r.feedback" class="rating-feedback">{{ r.feedback }}</p>
            </div>
          </div>
        </div>

        <div v-if="selectedPrompt.versions?.length > 1" class="detail-section">
          <h4>版本历史</h4>
          <el-timeline>
            <el-timeline-item v-for="ver in selectedPrompt.versions" :key="ver.id"
              :timestamp="formatTime(ver.create_time)" placement="top">
              <div class="version-item">
                <span>版本 {{ ver.version }} - {{ ver.title }}</span>
                <span v-if="ver.change_log" class="version-change-log">{{ ver.change_log }}</span>
                <div class="version-actions">
                  <el-button v-if="ver.id !== selectedPrompt.id && canEdit(selectedPrompt)" size="small" type="primary"
                    link @click="showVersionDiff(selectedPrompt.id, ver.id)">
                    对比
                  </el-button>
                  <el-button v-if="ver.id !== selectedPrompt.id && canEdit(selectedPrompt)" size="small" type="warning"
                    link @click="rollbackVersion(selectedPrompt.id, ver.id, ver.version)">
                    回滚
                  </el-button>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <div class="rating-section">
            <span class="rating-label">我的评分：</span>
            <el-rate v-model="myRating" allow-half @change="handleRate" :texts="['很差', '差', '一般', '好', '很好']"
              show-text />
          </div>
          <div class="dialog-actions">
            <el-button @click="usePrompt(selectedPrompt)" type="primary">
              <el-icon>
                <Promotion />
              </el-icon>
              使用此提示词
            </el-button>
            <el-button v-if="canEdit(selectedPrompt)" @click="editFromDetail(selectedPrompt)">编辑</el-button>
            <el-button v-if="selectedPrompt.is_public && !canEdit(selectedPrompt)" @click="forkPrompt(selectedPrompt)">
              Fork 复制
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showVariableFillDialog" title="填充变量" width="650px" destroy-on-close>
      <div v-if="selectedPrompt" class="variable-fill-content">
        <div class="var-fill-row" v-for="v in selectedPrompt.variables" :key="v.name">
          <label class="var-label">
            {{ '{' + '{' + v.name + '}' + '}' }}
            <span v-if="v.required" class="required-mark">*</span>
          </label>
          <el-input v-model="variableValues[v.name]" :placeholder="v.description || v.default_value || `请输入${v.name}的值`"
            size="default" />
          <span v-if="v.default_value" class="var-default">默认: {{ v.default_value }}</span>
        </div>
        <el-divider />
        <div class="preview-section">
          <h4>预览结果</h4>
          <div class="code-block">
            <pre>{{ resolvedPreviewContent }}</pre>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showVariableFillDialog = false">取消</el-button>
        <el-button type="primary" @click="usePromptWithVariables">
          <el-icon>
            <Promotion />
          </el-icon>
          使用此提示词
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDiffDialog" title="版本对比" width="800px" destroy-on-close>
      <div v-if="diffData" class="diff-content">
        <div class="diff-headers">
          <div class="diff-col">
            <h4>v{{ diffData.fromVersion.version }} - {{ diffData.fromVersion.title }}</h4>
            <p class="diff-meta">{{ diffData.fromVersion.change_log || '无变更说明' }} · {{
              formatTime(diffData.fromVersion.create_time) }}</p>
          </div>
          <div class="diff-col">
            <h4>v{{ diffData.toVersion.version }} - {{ diffData.toVersion.title }}</h4>
            <p class="diff-meta">{{ diffData.toVersion.change_log || '无变更说明' }} · {{
              formatTime(diffData.toVersion.create_time) }}</p>
          </div>
        </div>
        <el-divider />
        <div v-if="diffData.diff.length === 0" class="no-changes">两个版本无差异</div>
        <div v-else class="diff-items">
          <div v-for="item in diffData.diff" :key="item.field" class="diff-item">
            <h5 class="diff-field-name">{{ fieldLabel(item.field) }}</h5>
            <div class="diff-values">
              <div class="diff-from">
                <span class="diff-label">旧</span>
                <pre>{{ item.from }}</pre>
              </div>
              <div class="diff-to">
                <span class="diff-label">新</span>
                <pre>{{ item.to }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="showFeedbackDialog" title="提交评价" width="450px" destroy-on-close>
      <div class="feedback-content">
        <div class="feedback-rating">
          <span>评分：</span>
          <el-rate v-model="feedbackRating" allow-half :texts="['很差', '差', '一般', '好', '很好']" show-text />
        </div>
        <el-input v-model="feedbackText" type="textarea" :rows="4" placeholder="分享你使用这个提示词的体验和建议（可选）" maxlength="500"
          show-word-limit />
      </div>
      <template #footer>
        <el-button @click="showFeedbackDialog = false">取消</el-button>
        <el-button type="primary" @click="submitFeedback">提交评价</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight, Plus, Search, Loading, DocumentCopy,
  View, StarFilled, Clock, Promotion, CopyDocument,
  Edit, Delete, MagicStick, FolderOpened, Collection,
  InfoFilled
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const tabs = [
  { label: '模板市场', value: 'templates', icon: 'Collection', count: 0 },
  { label: '我的提示词', value: 'mine', icon: 'FolderOpened', count: 0 },
  { label: '智能推荐', value: 'recommend', icon: 'MagicStick', count: 0 },
]

const categories = [
  { label: '全部', value: '' },
  { label: '头像', value: 'avatar' },
  { label: '人像', value: 'portrait' },
  { label: '风景', value: 'landscape' },
  { label: '广告横版', value: 'ad_horizontal' },
  { label: '广告竖版', value: 'ad_vertical' },
  { label: '设计稿', value: 'design' },
  { label: '图标', value: 'icon' },
  { label: '通用', value: 'general' },
  { label: '文案', value: 'text' },
  { label: '营销', value: 'marketing' },
  { label: '社交', value: 'social' },
  { label: '商务', value: 'business' },
  { label: '创意', value: 'creative' },
]

const categoryOptions = categories.filter(c => c.value)

const activeTab = ref('templates')
const selectedCategory = ref('')
const selectedScene = ref('')
const searchQuery = ref('')
const sortBy = ref('create_time')
const loading = ref(false)
const prompts = ref([])
const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
})

const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showVariableFillDialog = ref(false)
const showDiffDialog = ref(false)
const showFeedbackDialog = ref(false)
const editingPrompt = ref(null)
const selectedPrompt = ref(null)
const submitting = ref(false)
const formRef = ref(null)
const myRating = ref(0)
const feedbackRating = ref(0)
const feedbackText = ref('')
const diffData = ref(null)
const availableScenes = ref([])

const variableValues = reactive({})

const formData = reactive({
  title: '',
  content: '',
  description: '',
  category: 'general',
  tags: [],
  variables: [],
  scene_tags: [],
  difficulty: 'beginner',
  is_template: false,
  is_public: false,
  change_log: '',
})

const formRules = {
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    { min: 2, max: 200, message: '标题长度在2到200个字符之间', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请输入提示词内容', trigger: 'blur' },
    { min: 10, max: 5000, message: '内容长度在10到5000个字符之间', trigger: 'blur' },
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' },
  ],
}

const tagInputVisible = ref(false)
const tagInputValue = ref('')
const tagInputRef = ref(null)

const sceneInputVisible = ref(false)
const sceneInputValue = ref('')
const sceneInputRef = ref(null)

const myStats = reactive({
  total: 0,
  public: 0,
  totalUses: 0,
})

const currentUserId = computed(() => {
  const userStore = JSON.parse(localStorage.getItem('user') || '{}')
  return userStore?.id
})

const detectedVariables = computed(() => {
  const regex = /\{\{(\w+)\}\}/g
  const names = new Set()
  let match
  while ((match = regex.exec(formData.content)) !== null) {
    names.add(match[1])
  }
  return Array.from(names)
})

const resolvedPreviewContent = computed(() => {
  if (!selectedPrompt.value) return ''
  let content = selectedPrompt.value.content
  if (selectedPrompt.value.variables) {
    for (const v of selectedPrompt.value.variables) {
      const val = variableValues[v.name] || v.default_value || `{{${v.name}}}`
      content = content.replace(new RegExp(`\\{\\{${v.name}\\}\\}`, 'g'), val)
    }
  }
  return content
})

function onContentChange() {
  const currentNames = formData.variables.map(v => v.name)
  const newNames = detectedVariables.value.filter(n => !currentNames.includes(n))
  const removedNames = currentNames.filter(n => !detectedVariables.value.includes(n))

  for (const name of newNames) {
    formData.variables.push({ name, description: '', default_value: '', required: false })
  }

  for (const name of removedNames) {
    const idx = formData.variables.findIndex(v => v.name === name)
    if (idx !== -1) formData.variables.splice(idx, 1)
  }
}

function difficultyLabel(d) {
  const map = { beginner: '入门', intermediate: '进阶', advanced: '高级' }
  return map[d] || d
}

function fieldLabel(f) {
  const map = { title: '标题', content: '内容', description: '描述', category: '分类', tags: '标签', variables: '变量' }
  return map[f] || f
}

function switchTab(tab) {
  activeTab.value = tab
  pagination.page = 1
  selectedScene.value = ''
  if (tab === 'recommend') {
    fetchRecommendations()
  } else {
    fetchPrompts()
  }
}

function filterByCategory(category) {
  selectedCategory.value = category
  pagination.page = 1
  if (activeTab.value === 'recommend') {
    fetchRecommendations()
  } else {
    fetchPrompts()
  }
}

function filterByScene(scene) {
  selectedScene.value = selectedScene.value === scene ? '' : scene
  pagination.page = 1
  if (activeTab.value === 'recommend') {
    fetchRecommendations()
  } else {
    fetchPrompts()
  }
}

function handleSearch() {
  pagination.page = 1
  fetchPrompts()
}

function handlePageChange(page) {
  pagination.page = page
  fetchPrompts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function fetchPrompts() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort_by: sortBy.value,
    }

    if (activeTab.value === 'templates') {
      params.is_template = true
      params.is_public = true
    } else if (activeTab.value === 'mine') {
      params.user_id = currentUserId.value
    }

    if (selectedCategory.value) {
      params.category = selectedCategory.value
    }

    if (selectedScene.value) {
      params.scene = selectedScene.value
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const res = await request.get('/prompts', { params })

    prompts.value = res.items || []
    pagination.total = res.pagination?.total || 0
    pagination.totalPages = res.pagination?.totalPages || 0

    if (res.categories) {
      res.categories.forEach(cat => {
        const catItem = categories.find(c => c.value === cat.value)
        if (catItem) catItem.count = cat.count
      })
    }
  } catch (error) {
    console.error('Failed to fetch prompts:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function fetchRecommendations() {
  loading.value = true
  try {
    const params = { limit: 12 }
    if (selectedCategory.value) params.category = selectedCategory.value
    if (selectedScene.value) params.scene = selectedScene.value

    const res = await request.get('/prompts/recommend', { params })
    prompts.value = res.recommendations || []
    pagination.total = prompts.value.length
    pagination.totalPages = 1
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    ElMessage.error('加载推荐失败')
  } finally {
    loading.value = false
  }
}

async function fetchScenes() {
  try {
    const res = await request.get('/prompts/scenes')
    availableScenes.value = res.scenes || []
  } catch (_e) {
    // ignore
  }
}

async function viewDetail(prompt) {
  try {
    const res = await request.get(`/prompts/${prompt.id}`)
    selectedPrompt.value = res
    myRating.value = res.myRating?.rating || 0
    showDetailDialog.value = true

    if (res.variables?.length) {
      for (const v of res.variables) {
        if (!variableValues[v.name]) {
          variableValues[v.name] = v.default_value || ''
        }
      }
    }
  } catch (error) {
    ElMessage.error('加载详情失败')
  }
}

function usePrompt(prompt) {
  if (prompt.variables?.length > 0) {
    showVariableFillDialog.value = true
    for (const v of prompt.variables) {
      if (!variableValues[v.name]) {
        variableValues[v.name] = v.default_value || ''
      }
    }
    return
  }

  navigateWithPrompt(prompt.content, prompt)
}

function usePromptWithVariables() {
  if (!selectedPrompt.value) return
  const content = resolvedPreviewContent.value
  navigateWithPrompt(content, selectedPrompt.value)
  showVariableFillDialog.value = false
}

function navigateWithPrompt(content, prompt) {
  const promptData = {
    id: prompt.id,
    title: prompt.title,
    content: content,
    category: prompt.category,
  }

  localStorage.setItem('selectedPrompt', JSON.stringify(promptData))

  try {
    window.postMessage({ type: 'USE_PROMPT', ...promptData }, '*')
  } catch (e) {
    console.warn('postMessage failed:', e)
  }

  const isImageCategory = ['avatar', 'portrait', 'landscape', 'ad_horizontal', 'ad_vertical', 'ad_square', 'design', 'icon'].includes(prompt.category)

  if (isImageCategory) {
    router.push({ name: 'AIImage', query: { promptId: prompt.id, useImmediately: 'true' } })
  } else {
    router.push({ name: 'AIContent', query: { promptId: prompt.id, useImmediately: 'true' } })
  }

  ElMessage.success(`已加载提示词：${prompt.title}`)
}

function canEdit(prompt) {
  return prompt.user_id === currentUserId.value
}

function canDelete(prompt) {
  return prompt.user_id === currentUserId.value
}

function openCreateDialog() {
  editingPrompt.value = null
  resetForm()
  showCreateDialog.value = true
}

function editPrompt(prompt) {
  editingPrompt.value = prompt
  Object.assign(formData, {
    title: prompt.title,
    content: prompt.content,
    description: prompt.description || '',
    category: prompt.category,
    tags: [...(prompt.tags || [])],
    variables: (prompt.variables || []).map(v => ({ ...v })),
    scene_tags: [...(prompt.scene_tags || [])],
    difficulty: prompt.difficulty || 'beginner',
    is_template: !!prompt.is_template,
    is_public: !!prompt.is_public,
    change_log: '',
  })
  showCreateDialog.value = true
}

function editFromDetail(prompt) {
  showDetailDialog.value = false
  editPrompt(prompt)
}

async function deletePrompt(prompt) {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${prompt.title}"吗？删除后无法恢复。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )

    await request.delete(`/prompts/${prompt.id}`)
    ElMessage.success('删除成功')
    fetchPrompts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

async function forkPrompt(prompt) {
  try {
    await request.post(`/prompts/${prompt.id}/fork`)
    ElMessage.success('Fork成功！已添加到我的提示词')
    if (activeTab.value === 'mine') {
      fetchPrompts()
    }
  } catch (error) {
    ElMessage.error(error.message || 'Fork失败')
  }
}

async function handleRate(rating) {
  if (!selectedPrompt.value) return
  feedbackRating.value = rating
  showFeedbackDialog.value = true
}

async function submitFeedback() {
  if (!selectedPrompt.value) return
  try {
    await request.post(`/prompts/${selectedPrompt.value.id}/rate`, {
      rating: feedbackRating.value,
      feedback: feedbackText.value,
    })
    ElMessage.success('评价提交成功')
    showFeedbackDialog.value = false
    feedbackText.value = ''
  } catch (error) {
    ElMessage.error('评价提交失败')
  }
}

async function showVersionDiff(promptId, versionId) {
  try {
    const res = await request.get(`/prompts/${promptId}/diff`, {
      params: { from: versionId },
    })
    diffData.value = res
    showDiffDialog.value = true
  } catch (error) {
    ElMessage.error('加载版本对比失败')
  }
}

async function rollbackVersion(promptId, versionId, versionNum) {
  try {
    await ElMessageBox.confirm(
      `确定要回滚到版本 v${versionNum} 吗？当前版本将被保存为历史版本。`,
      '确认回滚',
      { confirmButtonText: '确定回滚', cancelButtonText: '取消', type: 'warning' }
    )

    await request.post(`/prompts/${promptId}/rollback/${versionId}`)
    ElMessage.success('回滚成功')
    showDetailDialog.value = false
    fetchPrompts()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '回滚失败')
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const payload = { ...formData }
      if (editingPrompt.value) {
        await request.put(`/prompts/${editingPrompt.value.id}`, payload)
        ElMessage.success('更新成功')
      } else {
        await request.post('/prompts', payload)
        ElMessage.success('创建成功')
      }
      showCreateDialog.value = false
      resetForm()
      fetchPrompts()
    } catch (error) {
      ElMessage.error(error.message || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

function resetForm() {
  editingPrompt.value = null
  Object.assign(formData, {
    title: '',
    content: '',
    description: '',
    category: 'general',
    tags: [],
    variables: [],
    scene_tags: [],
    difficulty: 'beginner',
    is_template: false,
    is_public: false,
    change_log: '',
  })
}

function showTagInput() {
  tagInputVisible.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

function addTag() {
  if (tagInputValue.value && !formData.tags.includes(tagInputValue.value)) {
    if (formData.tags.length >= 10) {
      ElMessage.warning('最多添加10个标签')
      return
    }
    formData.tags.push(tagInputValue.value.trim())
  }
  tagInputVisible.value = false
  tagInputValue.value = ''
}

function showSceneInput() {
  sceneInputVisible.value = true
  nextTick(() => {
    sceneInputRef.value?.focus()
  })
}

function addSceneTag() {
  if (sceneInputValue.value && !formData.scene_tags.includes(sceneInputValue.value)) {
    if (formData.scene_tags.length >= 10) {
      ElMessage.warning('最多添加10个场景标签')
      return
    }
    formData.scene_tags.push(sceneInputValue.value.trim())
  }
  sceneInputVisible.value = false
  sceneInputValue.value = ''
}

function truncateText(text, length) {
  if (!text) return ''
  return text.length > length ? text.substring(0, length) + '...' : text
}

function getCategoryLabel(category) {
  const cat = categories.find(c => c.value === category)
  return cat?.label || category
}

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`

  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  if (route.query.tab) {
    activeTab.value = route.query.tab
  }
  fetchPrompts()
  fetchScenes()
})
</script>

<style lang="scss" scoped>
.prompt-library-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;

  .breadcrumb {
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .current {
      color: var(--color-primary);
    }
  }

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 8px;
  }

  .page-desc {
    color: var(--text-regular);
    font-size: 15px;
    margin: 0;
  }
}

.library-container {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: var(--shadow-light);
  overflow: hidden;
}

.sidebar {
  background: var(--fill-lighter);
  border-right: 1px solid var(--border-lighter);
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: fit-content;
  position: sticky;
  top: 80px;

  .nav-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0 0 12px;
  }
}

.nav-tabs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-tab {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-regular);
  transition: all 0.25s;
  position: relative;

  &:hover {
    background: var(--fill-base);
    color: var(--text-primary);
  }

  &.active {
    background: var(--color-primary-light-9);
    color: var(--color-primary);
    font-weight: 600;
  }

  .tab-badge {
    margin-left: auto;
  }
}

.category-list,
.scene-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item,
.scene-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-regular);
  transition: all 0.2s;

  &:hover {
    background: var(--fill-base);
  }

  &.active {
    background: var(--color-primary-light-9);
    color: var(--color-primary);
    font-weight: 500;
  }
}

.category-item .count {
  font-size: 11px;
  color: var(--text-placeholder);
}

.stats-card {
  background: var(--bg-white);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-lighter);

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 12px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
    color: var(--text-secondary);

    strong {
      color: var(--text-primary);
      font-weight: 600;
    }
  }
}

.main-content {
  padding: 24px;
  min-height: 600px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;

  .search-input {
    flex: 1;
    max-width: 320px;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-placeholder);

  h3 {
    margin: 16px 0 8px;
    font-size: 18px;
    color: var(--text-secondary);
  }

  p {
    margin: 0;
    font-size: 14px;
    max-width: 400px;
    text-align: center;
  }
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.prompt-card {
  background: var(--bg-white);
  border: 1px solid var(--border-lighter);
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    border-color: var(--text-placeholder);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .card-header {
    margin-bottom: 12px;
  }

  .card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-category {
    font-size: 12px;
    color: var(--text-secondary);
    margin: 0;
  }

  .card-body {
    margin-bottom: 16px;
  }

  .card-content {
    font-size: 13px;
    color: var(--text-regular);
    line-height: 1.6;
    margin: 0 0 10px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-variables {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
    align-items: center;

    .more-vars {
      font-size: 12px;
      color: var(--color-warning);
    }
  }

  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;

    .more-tags {
      font-size: 12px;
      color: var(--text-placeholder);
    }
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--border-lighter);
  }

  .card-meta {
    display: flex;
    gap: 16px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .version-badge {
    background: var(--fill-base);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--text-regular);
  }

  .card-actions {
    display: flex;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .card-actions {
    opacity: 1;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-lighter);
}

.detail-content {
  .detail-header {
    h2 {
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 12px;
    }

    .detail-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 13px;
      color: var(--text-secondary);

      .author {
        color: var(--text-regular);
        font-weight: 500;
      }
    }
  }

  .detail-section {
    margin-bottom: 24px;

    h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 12px;
    }
  }

  .code-block {
    background: var(--bg-color);
    border-radius: 8px;
    padding: 16px;
    overflow-x: auto;

    pre {
      margin: 0;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      line-height: 1.6;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-all;
    }
  }

  .resolved-preview {
    margin-top: 10px;
  }

  .detail-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }

  .stat-box {
    background: var(--bg-color);
    border-radius: 8px;
    padding: 16px;
    text-align: center;

    strong {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: var(--color-primary);
      margin-bottom: 4px;
    }

    span {
      font-size: 13px;
      color: var(--text-secondary);
    }
  }

  .ratings-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .rating-item {
    background: var(--bg-color);
    border-radius: 8px;
    padding: 12px;

    .rating-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;

      .rating-user {
        font-weight: 500;
        color: var(--text-primary);
        font-size: 13px;
      }

      .rating-time {
        font-size: 12px;
        color: var(--text-placeholder);
        margin-left: auto;
      }
    }

    .rating-feedback {
      font-size: 13px;
      color: var(--text-regular);
      margin: 0;
      line-height: 1.5;
    }
  }

  .version-item {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .version-change-log {
      font-size: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }

    .version-actions {
      display: flex;
      gap: 4px;
      margin-left: auto;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .rating-section {
    display: flex;
    align-items: center;
    gap: 8px;

    .rating-label {
      font-size: 14px;
      color: var(--text-regular);
    }
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
  }
}

.tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.form-hint {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-left: 12px;
}

.detected-vars-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-warning);
}

.variables-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;

  .var-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.variable-fill-content {
  .var-fill-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;

    .var-label {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      color: var(--color-warning);
      min-width: 120px;
      font-weight: 600;

      .required-mark {
        color: var(--color-danger);
      }
    }

    .var-default {
      font-size: 12px;
      color: var(--text-placeholder);
      white-space: nowrap;
    }
  }

  .preview-section {
    h4 {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 10px;
    }
  }
}

.diff-content {
  .diff-headers {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    .diff-col {
      h4 {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px;
      }

      .diff-meta {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
      }
    }
  }

  .no-changes {
    text-align: center;
    padding: 40px;
    color: var(--text-secondary);
    font-size: 15px;
  }

  .diff-items {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .diff-item {
    .diff-field-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
    }

    .diff-values {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .diff-from,
    .diff-to {
      position: relative;

      .diff-label {
        position: absolute;
        top: 6px;
        left: 8px;
        font-size: 11px;
        font-weight: 600;
        padding: 1px 6px;
        border-radius: 3px;
      }

      pre {
        margin: 0;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 12px;
        line-height: 1.5;
        padding: 12px;
        border-radius: 6px;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .diff-from {
      .diff-label {
        background: var(--color-danger-light-9);
        color: var(--color-danger);
      }

      pre {
        background: var(--color-danger-light-8);
        border: 1px solid #FDE2E2;
        color: var(--color-danger);
      }
    }

    .diff-to {
      .diff-label {
        background: var(--color-success-light-8);
        color: var(--color-success);
      }

      pre {
        background: var(--color-success-light-9);
        border: 1px solid #E1F3D8;
        color: var(--color-success);
      }
    }
  }
}

.feedback-content {
  .feedback-rating {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    span {
      font-size: 14px;
      color: var(--text-regular);
    }
  }
}

@media (max-width: 1024px) {
  .library-container {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 16px;
    padding: 16px;
    border-right: none;
    border-bottom: 1px solid var(--border-lighter);
  }

  .nav-tabs {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .category-list,
  .scene-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .stats-card {
    display: none;
  }
}

@media (max-width: 768px) {
  .prompt-grid {
    grid-template-columns: 1fr;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;

    .search-input {
      max-width: none;
    }
  }

  .detail-content .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .diff-content .diff-headers,
  .diff-content .diff-values {
    grid-template-columns: 1fr;
  }
}
</style>
