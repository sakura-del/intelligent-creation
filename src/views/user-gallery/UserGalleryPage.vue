<template>
  <div class="user-gallery-page">
    <div class="page-header">
      <div class="breadcrumb">
        <span>首页</span>
        <el-icon>
          <ArrowRight />
        </el-icon>
        <span class="current">我的作品库</span>
      </div>
      <h1 class="page-title">我的作品库</h1>
      <p class="page-desc">管理你的AI创作成果，随时查看和分享</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
          <el-icon :size="28">
            <Picture />
          </el-icon>
        </div>
        <div class="stat-info">
          <h3>{{ stats.totalWorks || 0 }}</h3>
          <p>总作品数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb, #f5576c)">
          <el-icon :size="28">
            <Edit />
          </el-icon>
        </div>
        <div class="stat-info">
          <h3>{{ stats.editedImages || 0 }}</h3>
          <p>编辑作品</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a, #fee140)">
          <el-icon :size="28">
            <Star />
          </el-icon>
        </div>
        <div class="stat-info">
          <h3>{{ stats.favorites || 0 }}</h3>
          <p>收藏作品</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe, #00f2fe)">
          <el-icon :size="28">
            <View />
          </el-icon>
        </div>
        <div class="stat-info">
          <h3>{{ formatNumber(stats.totalViews) }}</h3>
          <p>总浏览量</p>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <el-select v-model="filterCategory" placeholder="分类筛选" clearable @change="fetchWorks">
          <el-option label="全部分类" value="" />
          <el-option v-for="cat in categories" :key="cat.slug" :label="`${cat.name} (${cat.count})`"
            :value="cat.slug" />
        </el-select>
        <el-select v-model="filterType" placeholder="类型筛选" clearable @change="fetchWorks">
          <el-option label="全部类型" value="" />
          <el-option label="原始生成" value="image" />
          <el-option label="编辑后" value="edited_image" />
        </el-select>
        <el-select v-model="filterFavorite" placeholder="收藏" clearable @change="fetchWorks">
          <el-option label="全部" value="" />
          <el-option label="已收藏" value="true" />
        </el-select>
        <el-input v-model="searchKeyword" placeholder="搜索标题、提示词、标签..." clearable style="width: 240px"
          @keyup.enter="fetchWorks" @clear="fetchWorks">
          <template #prefix><el-icon>
              <Search />
            </el-icon></template>
        </el-input>
        <el-select v-model="sortBy" placeholder="排序" @change="fetchWorks">
          <el-option label="最新创建" value="create_time" />
          <el-option label="最多浏览" value="view_count" />
          <el-option label="最多下载" value="download_count" />
          <el-option label="标题A-Z" value="title" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <template v-if="selectedIds.length > 0">
          <el-button type="primary" @click="showBatchUpdateDialog = true">
            <el-icon>
              <FolderOpened />
            </el-icon>
            批量操作 ({{ selectedIds.length }})
          </el-button>
          <el-button type="danger" @click="batchDeleteWorks">
            <el-icon>
              <Delete />
            </el-icon>
            删除选中
          </el-button>
        </template>
      </div>
    </div>

    <div v-if="popularTags.length" class="popular-tags">
      <span class="tags-label">热门标签：</span>
      <el-tag v-for="tag in popularTags" :key="tag.name" :effect="filterTag === tag.name ? 'dark' : 'plain'"
        :type="filterTag === tag.name ? 'primary' : 'info'" size="small" class="popular-tag"
        @click="toggleTagFilter(tag.name)">
        {{ tag.name }} ({{ tag.count }})
      </el-tag>
      <el-tag v-if="filterTag" size="small" type="danger" effect="dark" closable @close="filterTag = ''; fetchWorks()">
        清除筛选
      </el-tag>
    </div>

    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="40">
        <Loading />
      </el-icon>
      <p>加载中...</p>
    </div>

    <div v-else-if="works.length === 0" class="empty-state">
      <el-icon :size="64" color="#DCDFE6">
        <FolderOpened />
      </el-icon>
      <h3>还没有作品</h3>
      <p>在AI图片生成页面创作后，点击保存按钮将作品添加到这里</p>
      <el-button type="primary" @click="$router.push('/ai-image')">去创作</el-button>
    </div>

    <div v-else class="works-grid">
      <div v-for="work in works" :key="work.id" v-memo="[work.id, work.is_favorite, work.is_public]" class="work-card"
        :class="{ selected: selectedIds.includes(work.id) }" @click="viewDetail(work)">
        <div class="card-image-wrapper">
          <AppImage :src="work.thumbnailUrl || work.fileUrl" :alt="work.title || 'AI Generated'" fit="cover"
            aspect-ratio="1" />
          <div class="card-overlay">
            <div class="overlay-actions">
              <el-button circle size="small" @click.stop="toggleFavorite(work)"
                :type="work.is_favorite ? 'warning' : 'default'">
                <el-icon>
                  <Star />
                </el-icon>
              </el-button>
              <el-button circle size="small" type="primary" @click.stop="downloadWork(work)">
                <el-icon>
                  <Download />
                </el-icon>
              </el-button>
              <el-button circle size="small" type="success" @click.stop="openShareDialog(work)">
                <el-icon>
                  <Share />
                </el-icon>
              </el-button>
              <el-button circle size="small" @click.stop="togglePublic(work)">
                <el-icon>
                  <component :is="work.is_public ? 'Unlock' : 'Lock'" />
                </el-icon>
              </el-button>
              <el-button circle size="small" type="danger" @click.stop="deleteWork(work)">
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
          </div>
          <div class="card-checkbox" @click.stop="toggleSelect(work.id)">
            <el-checkbox :model-value="selectedIds.includes(work.id)" />
          </div>
          <el-tag v-if="work.type === 'edited_image'" class="edit-tag" type="warning" effect="dark"
            size="small">已编辑</el-tag>
          <el-tag v-if="work.is_public" class="public-tag" type="success" effect="dark" size="small">公开</el-tag>
          <el-tag v-if="work.is_favorite" class="favorite-tag" type="warning" effect="dark" size="small">★</el-tag>
        </div>
        <div class="card-info">
          <h4 class="card-title">{{ work.title || `作品 ${work.id}` }}</h4>
          <div v-if="work.category" class="card-category">
            <el-tag size="small" effect="plain">{{ getCategoryName(work.category) }}</el-tag>
          </div>
          <div v-if="work.tags && work.tags.length" class="card-tags">
            <el-tag v-for="tag in work.tags.slice(0, 3)" :key="tag" size="small" type="info" effect="plain">{{ tag
            }}</el-tag>
            <span v-if="work.tags.length > 3" class="more-tags">+{{ work.tags.length - 3 }}</span>
          </div>
          <div class="card-meta">
            <span><el-icon>
                <View />
              </el-icon> {{ work.view_count || 0 }}</span>
            <span><el-icon>
                <Download />
              </el-icon> {{ work.download_count || 0 }}</span>
            <span v-if="work.share_count"><el-icon>
                <Share />
              </el-icon> {{ work.share_count }}</span>
            <span class="time">{{ formatTime(work.create_time) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pagination.totalPages > 1" class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" :page-size="pagination.limit" :total="pagination.total"
        layout="prev, pager, next, total" @current-change="handlePageChange" />
    </div>

    <el-dialog v-model="showDetailDialog" title="作品详情" width="800px" destroy-on-close>
      <div v-if="selectedWork" class="detail-content">
        <div class="detail-image">
          <AppImage :src="selectedWork.fileUrl" alt="Work detail" fit="contain" />
        </div>
        <el-divider />
        <div class="detail-info">
          <div class="info-row">
            <label>标题</label>
            <el-input v-model="selectedWork.title" size="small" @blur="updateWorkField(selectedWork, 'title')" />
          </div>
          <div class="info-row">
            <label>描述</label>
            <el-input v-model="selectedWork.description" type="textarea" :rows="2" size="small" placeholder="添加描述..."
              @blur="updateWorkField(selectedWork, 'description')" />
          </div>
          <div class="info-row">
            <label>类型</label>
            <el-tag :type="selectedWork.type === 'edited_image' ? 'warning' : ''">
              {{ selectedWork.type === 'edited_image' ? '编辑后' : '原始生成' }}
            </el-tag>
          </div>
          <div class="info-row">
            <label>分类</label>
            <el-select v-model="selectedWork.category" size="small" placeholder="选择分类" clearable
              @change="updateWorkCategory(selectedWork)">
              <el-option v-for="cat in categories" :key="cat.slug" :label="cat.name" :value="cat.slug" />
            </el-select>
          </div>
          <div class="info-row">
            <label>标签</label>
            <div class="tags-editor">
              <el-tag v-for="tag in (selectedWork.tags || [])" :key="tag" closable size="small"
                @close="removeWorkTag(selectedWork, tag)">{{ tag }}</el-tag>
              <el-input v-if="detailTagInputVisible" ref="detailTagInputRef" v-model="detailTagInputValue" size="small"
                style="width: 100px" @keyup.enter="addWorkTag(selectedWork)" @blur="addWorkTag(selectedWork)" />
              <el-button v-else size="small" @click="showDetailTagInput">+ 添加</el-button>
            </div>
          </div>
          <div class="info-row" v-if="selectedWork.metadata">
            <label>尺寸</label>
            <span>{{ selectedWork.metadata.width }} × {{ selectedWork.metadata.height }}</span>
          </div>
          <div class="info-row">
            <label>文件大小</label>
            <span>{{ formatFileSize(selectedWork.file_size) }}</span>
          </div>
          <div class="info-row" v-if="selectedWork.prompt_text">
            <label>提示词</label>
            <p class="prompt-text">{{ selectedWork.prompt_text }}</p>
          </div>
          <div class="info-row">
            <label>统计</label>
            <div class="info-stats">
              <span>👁 {{ selectedWork.view_count || 0 }} 浏览</span>
              <span>⬇️ {{ selectedWork.download_count || 0 }} 下载</span>
              <span>❤️ {{ selectedWork.like_count || 0 }} 点赞</span>
              <span>🔗 {{ selectedWork.share_count || 0 }} 分享</span>
            </div>
          </div>
          <div class="info-row">
            <label>创建时间</label>
            <span>{{ formatTimeFull(selectedWork.create_time) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="toggleFavorite(selectedWork)" :type="selectedWork?.is_favorite ? 'warning' : 'default'">
            {{ selectedWork?.is_favorite ? '取消收藏' : '收藏' }}
          </el-button>
          <el-button @click="togglePublic(selectedWork)" :type="selectedWork?.is_public ? 'warning' : 'success'">
            {{ selectedWork?.is_public ? '设为私有' : '设为公开' }}
          </el-button>
          <el-button type="success" @click="openShareDialog(selectedWork)">
            <el-icon>
              <Share />
            </el-icon> 分享
          </el-button>
          <el-button type="primary" @click="downloadWork(selectedWork)">下载</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="showShareDialog" title="分享作品" width="550px" destroy-on-close>
      <div v-if="shareWork" class="share-content">
        <el-form label-width="100px" size="default">
          <el-form-item label="分享标题">
            <el-input v-model="shareForm.title" :placeholder="shareWork.title || '作品分享'" />
          </el-form-item>
          <el-form-item label="分享描述">
            <el-input v-model="shareForm.description" type="textarea" :rows="2" placeholder="描述你的作品（可选）" />
          </el-form-item>
          <el-form-item label="允许下载">
            <el-switch v-model="shareForm.allow_download" />
          </el-form-item>
          <el-form-item label="访问密码">
            <el-input v-model="shareForm.password" placeholder="留空则无需密码" maxlength="32" show-word-limit />
          </el-form-item>
          <el-form-item label="有效期">
            <el-select v-model="shareForm.expires_hours" placeholder="选择有效期">
              <el-option label="永久有效" :value="0" />
              <el-option label="1小时" :value="1" />
              <el-option label="24小时" :value="24" />
              <el-option label="7天" :value="168" />
              <el-option label="30天" :value="720" />
            </el-select>
          </el-form-item>
          <el-form-item label="浏览上限">
            <el-input-number v-model="shareForm.max_views" :min="0" :max="10000" :step="100" />
            <span class="form-hint">0表示无限制</span>
          </el-form-item>
        </el-form>

        <div v-if="shareResult" class="share-result">
          <el-divider />
          <h4>分享链接已创建</h4>
          <div class="share-link-row">
            <el-input :model-value="shareResult.shareUrl" readonly size="default">
              <template #append>
                <el-button @click="copyToClipboard(shareResult.shareUrl)">复制</el-button>
              </template>
            </el-input>
          </div>
          <div v-if="shareResult.embedCode" class="share-link-row">
            <label>嵌入代码：</label>
            <el-input :model-value="shareResult.embedCode" type="textarea" :rows="2" readonly size="small" />
            <el-button size="small" @click="copyToClipboard(shareResult.embedCode)"
              style="margin-top: 6px">复制嵌入代码</el-button>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showShareDialog = false">{{ shareResult ? '关闭' : '取消' }}</el-button>
        <el-button v-if="!shareResult" type="primary" :loading="shareLoading" @click="createShare">创建分享链接</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showBatchUpdateDialog" title="批量操作" width="500px" destroy-on-close>
      <p class="batch-info">已选中 {{ selectedIds.length }} 个作品</p>
      <el-form label-width="100px" size="default">
        <el-form-item label="设置分类">
          <el-select v-model="batchForm.category" placeholder="选择分类" clearable style="width: 100%">
            <el-option v-for="cat in categories" :key="cat.slug" :label="cat.name" :value="cat.slug" />
          </el-select>
        </el-form-item>
        <el-form-item label="设为公开">
          <el-select v-model="batchForm.is_public" placeholder="不修改" clearable style="width: 100%">
            <el-option label="公开" :value="true" />
            <el-option label="私有" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="添加标签">
          <div class="batch-tags-input">
            <el-tag v-for="tag in batchForm.add_tags" :key="tag" closable
              @close="batchForm.add_tags = batchForm.add_tags.filter(t => t !== tag)">{{ tag }}</el-tag>
            <el-input v-if="batchTagInputVisible" ref="batchTagInputRef" v-model="batchTagInputValue" size="small"
              style="width: 120px" @keyup.enter="addBatchTag" @blur="addBatchTag" />
            <el-button v-else size="small"
              @click="batchTagInputVisible = true; nextTick(() => batchTagInputRef?.focus())">+
              添加</el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBatchUpdateDialog = false">取消</el-button>
        <el-button type="primary" :loading="batchUpdating" @click="executeBatchUpdate">执行批量更新</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight, Picture, Edit, View, Download, Star, Search,
  Loading, FolderOpened, Delete, Lock, Unlock, Share
} from '@element-plus/icons-vue'
import { galleryApi } from '@/api/ai'
import AppImage from '@/components/AppImage.vue'

const loading = ref(false)
const works = ref([])
const categories = ref([])
const popularTags = ref([])
const selectedIds = ref([])
const stats = reactive({
  totalWorks: 0,
  editedImages: 0,
  favorites: 0,
  totalViews: 0,
  totalDownloads: 0,
})

const filterType = ref('')
const filterCategory = ref('')
const filterFavorite = ref('')
const filterTag = ref('')
const searchKeyword = ref('')
const sortBy = ref('create_time')

const pagination = reactive({ page: 1, limit: 12, total: 0, totalPages: 0 })

const showDetailDialog = ref(false)
const selectedWork = ref(null)
const detailTagInputVisible = ref(false)
const detailTagInputValue = ref('')
const detailTagInputRef = ref(null)

const showShareDialog = ref(false)
const shareWork = ref(null)
const shareLoading = ref(false)
const shareResult = ref(null)
const shareForm = reactive({
  title: '',
  description: '',
  allow_download: true,
  password: '',
  expires_hours: 0,
  max_views: 0,
})

const showBatchUpdateDialog = ref(false)
const batchUpdating = ref(false)
const batchForm = reactive({ category: '', is_public: undefined, add_tags: [] })
const batchTagInputVisible = ref(false)
const batchTagInputValue = ref('')
const batchTagInputRef = ref(null)

async function fetchStats() {
  try {
    const res = await galleryApi.getStats()
    Object.assign(stats, res)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  }
}

async function fetchCategories() {
  try {
    const res = await galleryApi.getCategories()
    categories.value = res?.categories || []
  } catch (error) {
    console.error('Failed to fetch categories:', error)
  }
}

async function fetchWorks() {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort_by: sortBy.value,
    }

    if (filterType.value) params.type = filterType.value
    if (filterCategory.value) params.category = filterCategory.value
    if (filterFavorite.value) params.is_favorite = filterFavorite.value
    if (searchKeyword.value.trim()) params.search = searchKeyword.value.trim()
    if (filterTag.value) params.tag = filterTag.value

    const res = await galleryApi.getList(params)

    works.value = res.items || []
    pagination.total = res.pagination?.total || 0
    pagination.totalPages = res.pagination?.totalPages || 0

    if (res.stats) Object.assign(stats, res.stats)
    if (res.popularTags) popularTags.value = res.popularTags
  } catch (error) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

function getCategoryName(slug) {
  const cat = categories.value.find((c) => c.slug === slug)
  return cat ? cat.name : slug
}

function toggleTagFilter(tagName) {
  filterTag.value = filterTag.value === tagName ? '' : tagName
  fetchWorks()
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(id)
  }
}

function viewDetail(work) {
  selectedWork.value = { ...work }
  showDetailDialog.value = true
}

async function downloadWork(work) {
  if (!work?.fileUrl) return
  try {
    await galleryApi.recordDownload(work.id)
    const response = await fetch(work.fileUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = work.title || `work-${work.id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
    fetchWorks()
  } catch (error) {
    ElMessage.error('下载失败')
  }
}

async function togglePublic(work) {
  if (!work) return
  try {
    await galleryApi.togglePublic(work.id)
    work.is_public = !work.is_public
    ElMessage.success(work.is_public ? '已设为公开' : '已设为私有')
    fetchWorks()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

async function toggleFavorite(work) {
  if (!work) return
  try {
    await galleryApi.toggleFavorite(work.id)
    work.is_favorite = !work.is_favorite
    ElMessage.success(work.is_favorite ? '已收藏' : '已取消收藏')
    fetchWorks()
    fetchStats()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  }
}

async function deleteWork(work) {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${work.title || `作品 ${work.id}`}"吗？删除后无法恢复。`,
      '确认删除',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    await galleryApi.delete(work.id)
    ElMessage.success('删除成功')
    fetchWorks()
    fetchStats()
    if (showDetailDialog.value && selectedWork.value?.id === work.id) {
      showDetailDialog.value = false
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
  }
}

async function batchDeleteWorks() {
  if (selectedIds.value.length === 0) return
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedIds.value.length} 个作品吗？删除后无法恢复。`,
      '批量删除确认',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
    )
    await galleryApi.batchDelete(selectedIds.value)
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个作品`)
    selectedIds.value = []
    fetchWorks()
    fetchStats()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '批量删除失败')
  }
}

async function updateWorkCategory(work) {
  try {
    await galleryApi.updateCategory(work.id, work.category)
    ElMessage.success('分类更新成功')
    fetchWorks()
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

async function updateWorkField(work, field) {
  try {
    await galleryApi.update(work.id, { [field]: work[field] })
    ElMessage.success('更新成功')
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

async function removeWorkTag(work, tag) {
  const newTags = (work.tags || []).filter((t) => t !== tag)
  work.tags = newTags
  try {
    await galleryApi.updateTags(work.id, newTags)
    ElMessage.success('标签已移除')
    fetchWorks()
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  }
}

function showDetailTagInput() {
  detailTagInputVisible.value = true
  nextTick(() => detailTagInputRef.value?.focus())
}

async function addWorkTag(work) {
  const val = detailTagInputValue.value.trim()
  if (val && !(work.tags || []).includes(val) && (work.tags || []).length < 10) {
    const newTags = [...(work.tags || []), val]
    work.tags = newTags
    try {
      await galleryApi.updateTags(work.id, newTags)
      ElMessage.success('标签已添加')
      fetchWorks()
    } catch (error) {
      ElMessage.error(error.message || '更新失败')
    }
  }
  detailTagInputVisible.value = false
  detailTagInputValue.value = ''
}

function openShareDialog(work) {
  shareWork.value = work
  shareResult.value = null
  Object.assign(shareForm, {
    title: work.title || '',
    description: work.description || '',
    allow_download: true,
    password: '',
    expires_hours: 0,
    max_views: 0,
  })
  showShareDialog.value = true
}

async function createShare() {
  if (!shareWork.value) return
  shareLoading.value = true
  try {
    const res = await galleryApi.share(shareWork.value.id, { ...shareForm })
    shareResult.value = res
    ElMessage.success('分享链接已创建')
    fetchWorks()
  } catch (error) {
    ElMessage.error(error.message || '创建分享失败')
  } finally {
    shareLoading.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('已复制到剪贴板')
  })
}

function addBatchTag() {
  const val = batchTagInputValue.value.trim()
  if (val && !batchForm.add_tags.includes(val)) {
    batchForm.add_tags.push(val)
  }
  batchTagInputVisible.value = false
  batchTagInputValue.value = ''
}

async function executeBatchUpdate() {
  batchUpdating.value = true
  try {
    const updates = {}
    if (batchForm.category) updates.category = batchForm.category
    if (batchForm.is_public !== undefined && batchForm.is_public !== null) updates.is_public = batchForm.is_public
    if (batchForm.add_tags.length > 0) updates.add_tags = batchForm.add_tags

    if (Object.keys(updates).length === 0) {
      ElMessage.warning('请至少选择一项操作')
      return
    }

    await galleryApi.batchUpdate(selectedIds.value, updates)
    ElMessage.success(`成功更新 ${selectedIds.value.length} 个作品`)
    showBatchUpdateDialog.value = false
    selectedIds.value = []
    batchForm.category = ''
    batchForm.is_public = undefined
    batchForm.add_tags = []
    fetchWorks()
  } catch (error) {
    ElMessage.error(error.message || '批量更新失败')
  } finally {
    batchUpdating.value = false
  }
}

function handlePageChange(page) {
  pagination.page = page
  fetchWorks()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatNumber(num) {
  if (!num) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

function formatTimeFull(timeStr) {
  if (!timeStr) return ''
  return new Date(timeStr).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchStats()
  fetchCategories()
  fetchWorks()
})
</script>

<style lang="scss" scoped>
.user-gallery-page {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
}

.stat-card {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-light);
  transition: transform 0.25s;

  &:hover {
    transform: translateY(-4px);
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .stat-info {
    h3 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 4px;
    }

    p {
      font-size: 13px;
      color: var(--text-secondary);
      margin: 0;
    }
  }
}

.toolbar {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: var(--shadow-light);
  flex-wrap: wrap;
  gap: 12px;

  .toolbar-left {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }
}

.popular-tags {
  background: var(--bg-white);
  border-radius: 12px;
  padding: 12px 20px;
  margin-bottom: 24px;
  box-shadow: var(--shadow-light);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .tags-label {
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .popular-tag {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.05);
    }
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: var(--bg-white);
  border-radius: 12px;
  box-shadow: var(--shadow-light);

  h3 {
    margin: 16px 0 8px;
    font-size: 18px;
    color: var(--text-secondary);
  }

  p {
    margin: 0 0 20px;
    font-size: 14px;
    color: var(--text-placeholder);
    max-width: 400px;
    text-align: center;
  }
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.work-card {
  background: var(--bg-white);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: var(--shadow-light);

  &.selected {
    box-shadow: 0 0 0 3px #409EFF;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

    .card-overlay {
      opacity: 1;
    }

    .card-checkbox {
      opacity: 1;
    }
  }

  .card-image-wrapper {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    background: var(--bg-color);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }

    &:hover img {
      transform: scale(1.05);
    }

    .card-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s;

      .overlay-actions {
        display: flex;
        gap: 8px;
      }
    }

    .card-checkbox {
      position: absolute;
      top: 10px;
      right: 10px;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 5;
    }

    .edit-tag,
    .public-tag,
    .favorite-tag {
      position: absolute;
      top: 10px;
      left: 10px;
    }

    .public-tag {
      left: auto;
      right: 10px;
    }

    .favorite-tag {
      top: auto;
      bottom: 10px;
      left: 10px;
      font-size: 14px;
    }
  }

  .card-info {
    padding: 14px;

    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-category {
      margin-bottom: 6px;
    }

    .card-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 8px;

      .more-tags {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 22px;
      }
    }

    .card-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      color: var(--text-secondary);

      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .time {
        margin-left: auto;
      }
    }
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 32px;
  padding-top: 24px;
}

.detail-content {
  .detail-image {
    text-align: center;
    background: var(--bg-color);
    border-radius: 8px;
    padding: 20px;

    img {
      max-width: 100%;
      max-height: 500px;
      object-fit: contain;
      border-radius: 4px;
    }
  }

  .detail-info {
    .info-row {
      display: flex;
      margin-bottom: 16px;
      align-items: flex-start;

      label {
        width: 80px;
        font-size: 13px;
        color: var(--text-secondary);
        flex-shrink: 0;
        padding-top: 6px;
      }

      span {
        flex: 1;
        color: var(--text-primary);
        font-size: 14px;
      }

      .prompt-text {
        background: var(--bg-color);
        padding: 12px;
        border-radius: 6px;
        font-family: monospace;
        line-height: 1.6;
        margin: 0;
        word-break: break-all;
      }

      .info-stats {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }

      .tags-editor {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
        flex: 1;
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.share-content {
  .share-result {
    h4 {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 12px;
    }

    .share-link-row {
      margin-bottom: 12px;

      label {
        font-size: 13px;
        color: var(--text-secondary);
        display: block;
        margin-bottom: 6px;
      }
    }
  }
}

.batch-info {
  font-size: 14px;
  color: var(--text-regular);
  margin: 0 0 16px;
  padding: 10px 16px;
  background: var(--color-primary-light-9);
  border-radius: 6px;
}

.batch-tags-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.form-hint {
  font-size: 12px;
  color: var(--text-placeholder);
  margin-left: 8px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .works-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
  }
}
</style>
