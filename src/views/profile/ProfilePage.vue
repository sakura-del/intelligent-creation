<template>
  <div class="profile-page">
    <div class="page-header">
      <div class="user-profile-card">
        <el-avatar :size="80" class="avatar" :src="userStore.avatar">
          {{ userStore.nickname?.charAt(0) || 'U' }}
        </el-avatar>
        <div class="user-info">
          <h2>{{ userStore.nickname || '用户' }}</h2>
          <p class="email">{{ userStore.email || '未设置邮箱' }}</p>
          <div class="tags">
            <el-tag size="small" :type="userStore.isVip ? 'warning' : 'primary'">
              {{ userStore.isVip ? 'VIP用户' : '普通版' }}
            </el-tag>
            <el-tag size="small" type="success">已认证</el-tag>
          </div>
        </div>
        <el-button type="primary" plain @click="showEditDialog = true">
          <el-icon>
            <EditPen />
          </el-icon> 编辑资料
        </el-button>
      </div>
    </div>

    <div class="tabs-container">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="使用概览" name="overview">
          <div v-loading="statsLoading" class="stats-grid">
            <div class="stat-card" v-for="(stat, index) in statsData" :key="index">
              <div class="stat-icon" :style="{ background: stat.color }">
                <el-icon :size="24" color="#fff">
                  <component :is="stat.icon" />
                </el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
          </div>

          <div class="chart-section card mt-20">
            <h3>近30天使用趋势</h3>
            <div class="chart-container">
              <div v-if="chartData.length > 0" class="bar-chart">
                <div v-for="(day, index) in chartData" :key="index" class="bar-item"
                  :style="{ height: getBarHeight(day.value) + '%' }"
                  :class="{ active: day.isToday }"
                  :title="`${day.label}: ${day.value}次`">
                  <span class="bar-label">{{ formatChartLabel(day.label) }}</span>
                </div>
              </div>
              <div v-else class="empty-chart">
                <el-empty description="暂无使用数据" />
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="历史记录" name="history">
          <div class="history-filters card mb-20">
            <el-select v-model="historyFilter.type" placeholder="筛选类型" clearable
              @change="handleHistoryFilter" style="width: 150px;">
              <el-option label="全部类型" value="" />
              <el-option label="文章写作" value="article" />
              <el-option label="营销文案" value="marketing" />
              <el-option label="社交媒体" value="social" />
              <el-option label="内容摘要" value="summary" />
              <el-option label="商业文档" value="business" />
              <el-option label="创意写作" value="creative" />
              <el-option label="图片生成" value="image" />
              <el-option label="代码生成" value="code" />
            </el-select>
          </div>

          <div v-loading="historyLoading" class="history-table card">
            <el-table v-if="historyData.length > 0" :data="historyData" style="width: 100%">
              <el-table-column prop="date" label="日期" width="160">
                <template #default="{ row }">
                  {{ formatDate(row.date) }}
                </template>
              </el-table-column>
              <el-table-column prop="typeName" label="类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.typeColor" size="small">{{ row.typeName }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="title" label="标题" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.status === '完成' ? 'success' : 'warning'" size="small">
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button text type="primary" size="small" @click="viewHistoryDetail(row)">查看</el-button>
                  <el-button text type="danger" size="small" @click="deleteHistoryItem(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-else class="empty-history">
              <el-empty description="暂无历史记录" />
            </div>

            <div v-if="historyTotal > historyPageSize" class="pagination-wrapper">
              <el-pagination
                v-model:current-page="historyPage"
                v-model:page-size="historyPageSize"
                :total="historyTotal"
                layout="prev, pager, next"
                @current-change="fetchHistoryData"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="账号设置" name="settings">
          <div class="settings-form card">
            <el-form label-width="100px" style="max-width: 600px;" :model="form">
              <el-form-item label="用户名">
                <el-input v-model="form.username" disabled />
              </el-form-item>
              <el-form-item label="昵称">
                <el-input v-model="form.nickname" />
              </el-form-item>
              <el-form-item label="邮箱">
                <el-input v-model="form.email" />
              </el-form-item>
              <el-form-item label="手机号">
                <el-input v-model="form.phone" placeholder="请输入手机号（选填）" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" :loading="saveLoading" @click="handleSaveSettings">保存修改</el-button>
              </el-form-item>
            </el-form>

            <el-divider />

            <div class="security-settings">
              <h4>安全设置</h4>
              <div class="setting-item">
                <div>
                  <strong>修改密码</strong>
                  <p class="desc">定期修改密码可以保护账号安全</p>
                </div>
                <el-button type="primary" plain @click="showChangePasswordDialog = true">修改密码</el-button>
              </div>
              <div class="setting-item">
                <div>
                  <strong>两步验证</strong>
                  <p class="desc">启用后登录需要额外验证码</p>
                </div>
                <el-switch v-model="twoFactorEnabled" disabled />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="showEditDialog" title="编辑资料" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" :loading="updateLoading" @click="handleUpdateProfile">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showChangePasswordDialog" title="修改密码" width="450px">
      <el-form :model="passwordForm" label-width="100px">
        <el-form-item label="原密码">
          <el-input v-model="passwordForm.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码（至少8位）" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showChangePasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="changePasswordLoading" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showDetailDialog" title="操作详情" width="700px">
      <div v-if="selectedHistory" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="操作类型">
            <el-tag :type="selectedHistory.typeColor" size="small">{{ selectedHistory.typeName }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">{{ formatDate(selectedHistory.date) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="selectedHistory.status === '完成' ? 'success' : 'warning'" size="small">
              {{ selectedHistory.status }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedHistory.metadata?.modelUsed" label="使用模型">
            {{ selectedHistory.metadata.modelUsed }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedHistory.metadata?.tokenCount" label="Token消耗">
            {{ selectedHistory.metadata.tokenCount }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedHistory.metadata?.generationTime" label="生成耗时">
            {{ selectedHistory.metadata.generationTime }}ms
          </el-descriptions-item>
        </el-descriptions>
        <div class="detail-title-section">
          <h4>内容标题</h4>
          <p>{{ selectedHistory.title }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/modules/user'
import { userApi } from '@/api/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  MagicStick,
  EditPen,
  Grid,
  Calendar,
  TrendCharts,
} from '@element-plus/icons-vue'
import { eventBus } from '@/utils/eventBus'

const userStore = useUserStore()
const activeTab = ref('overview')
const showEditDialog = ref(false)
const showChangePasswordDialog = ref(false)
const showDetailDialog = ref(false)
const twoFactorEnabled = ref(false)

const statsLoading = ref(false)
const historyLoading = ref(false)
const saveLoading = ref(false)
const updateLoading = ref(false)
const changePasswordLoading = ref(false)

const form = reactive({
  username: userStore.username || '',
  nickname: userStore.nickname || '',
  email: userStore.email || '',
  phone: ''
})

const editForm = reactive({
  nickname: userStore.nickname || '',
  email: userStore.email || ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const statisticsData = ref(null)
const historyData = ref([])
const selectedHistory = ref(null)
const historyPage = ref(1)
const historyPageSize = ref(20)
const historyTotal = ref(0)
const historyFilter = reactive({
  type: ''
})

const statsData = computed(() => {
  if (!statisticsData.value) return []

  return [
    {
      icon: MagicStick,
      value: statisticsData.value.todayAiCalls?.toString() || '0',
      label: '今日AI调用次数',
      color: '#409EFF',
    },
    {
      icon: EditPen,
      value: statisticsData.value.totalContentGenerated?.toString() || '0',
      label: '内容生成总数',
      color: '#E6A23C',
    },
    {
      icon: Grid,
      value: statisticsData.value.appCount?.toString() || '0',
      label: '应用搭建数',
      color: '#F56C6C',
    },
    {
      icon: Calendar,
      value: statisticsData.value.consecutiveDays?.toString() || '0',
      label: '连续使用天数',
      color: '#909399',
    },
    {
      icon: TrendCharts,
      value: `${statisticsData.value.resumeCount || 0}`,
      label: '简历创建数',
      color: '#67C23A',
    },
  ]
})

const chartData = computed(() => {
  return statisticsData.value?.chartData || []
})

function getBarHeight(value) {
  const maxVal = Math.max(...chartData.value.map(d => d.value), 1)
  return Math.max((value / maxVal) * 100, 5)
}

function formatChartLabel(label) {
  if (!label) return ''
  const date = new Date(label)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchStatistics() {
  statsLoading.value = true
  try {
    const res = await userApi.getStatistics()
    statisticsData.value = res.data || res
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.warning('统计数据加载失败')
  } finally {
    statsLoading.value = false
  }
}

async function fetchHistoryData() {
  historyLoading.value = true
  try {
    const params = {
      page: historyPage.value,
      limit: historyPageSize.value,
    }
    if (historyFilter.type) {
      params.type = historyFilter.type
    }
    const res = await userApi.getHistory(params)
    const data = res.data || res
    historyData.value = data.list || []
    historyTotal.value = data.total || 0
  } catch (error) {
    console.error('获取历史记录失败:', error)
    ElMessage.warning('历史记录加载失败')
  } finally {
    historyLoading.value = false
  }
}

function handleTabChange(tab) {
  if (tab === 'overview' && !statisticsData.value) {
    fetchStatistics()
  }
  if (tab === 'history' && historyData.value.length === 0) {
    fetchHistoryData()
  }
}

function handleHistoryFilter() {
  historyPage.value = 1
  fetchHistoryData()
}

async function handleSaveSettings() {
  saveLoading.value = true
  try {
    await userApi.updateUser({
      nickname: form.nickname,
      email: form.email,
    })
    await userStore.fetchUserInfo()
    ElMessage.success('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saveLoading.value = false
  }
}

async function handleUpdateProfile() {
  updateLoading.value = true
  try {
    await userApi.updateUser({
      nickname: editForm.nickname,
      email: editForm.email,
    })
    await userStore.fetchUserInfo()
    showEditDialog.value = false
    ElMessage.success('资料更新成功')
  } catch (error) {
    console.error('更新资料失败:', error)
    ElMessage.error(error.response?.data?.message || '更新失败')
  } finally {
    updateLoading.value = false
  }
}

async function handleChangePassword() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    return ElMessage.warning('请填写完整信息')
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    return ElMessage.error('两次输入的密码不一致')
  }
  if (passwordForm.newPassword.length < 8) {
    return ElMessage.error('新密码长度不能少于8位')
  }

  changePasswordLoading.value = true
  try {
    await userApi.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    showChangePasswordDialog.value = false
    Object.assign(passwordForm, {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
    ElMessage.success('密码修改成功，请重新登录')
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error(error.response?.data?.message || '修改失败')
  } finally {
    changePasswordLoading.value = false
  }
}

function viewHistoryDetail(row) {
  selectedHistory.value = row
  showDetailDialog.value = true
}

async function deleteHistoryItem(row) {
  try {
    await ElMessageBox.confirm('确定要删除这条记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    ElMessage.info('删除功能开发中')
  } catch {
    // 用户取消删除
  }
}

onMounted(() => {
  fetchStatistics()

  Object.assign(form, {
    username: userStore.username || '',
    nickname: userStore.nickname || '',
    email: userStore.email || '',
  })

  Object.assign(editForm, {
    nickname: userStore.nickname || '',
    email: userStore.email || '',
  })

  eventBus.on(eventBus.events.HISTORY_REFRESH_REQUIRED, handleHistoryRefresh)
  eventBus.on(eventBus.events.STATISTICS_REFRESH_REQUIRED, handleStatisticsRefresh)
})

onUnmounted(() => {
  eventBus.off(eventBus.events.HISTORY_REFRESH_REQUIRED, handleHistoryRefresh)
  eventBus.off(eventBus.events.STATISTICS_REFRESH_REQUIRED, handleStatisticsRefresh)
})

function handleHistoryRefresh() {
  if (activeTab.value === 'history') {
    fetchHistoryData()
  }
}

function handleStatisticsRefresh() {
  if (activeTab.value === 'overview') {
    fetchStatistics()
  }
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 28px;

  .user-profile-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 32px;
    display: flex;
    align-items: center;
    gap: 24px;
    color: #fff;

    .avatar {
      background: rgba(255, 255, 255, 0.2);
      font-size: 32px;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .user-info {
      flex: 1;

      h2 {
        font-size: 26px;
        margin: 0 0 6px;
        font-weight: 700;
      }

      .email {
        opacity: 0.9;
        margin: 0 0 10px;
        font-size: 14px;
      }

      .tags {
        display: flex;
        gap: 8px;
      }
    }

    .el-button {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.3);
      color: #fff;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    }
  }
}

.tabs-container {
  .card {
    background: var(--bg-white);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-light);

    h3 {
      font-size: 18px;
      color: var(--text-primary);
      margin: 0 0 20px;
      font-weight: 600;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;

  .stat-card {
    background: var(--bg-white);
    border-radius: 12px;
    padding: 24px;
    box-shadow: var(--shadow-light);
    display: flex;
    align-items: center;
    gap: 16px;

    .stat-icon {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--text-primary);
        line-height: 1.2;
      }

      .stat-label {
        font-size: 13px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
    }
  }
}

.chart-section {
  .chart-container {
    height: 300px;

    .bar-chart {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 100%;
      padding: 20px 0;

      .bar-item {
        flex: 1;
        background: var(--color-primary-light-9);
        border-radius: 4px 4px 0 0;
        position: relative;
        min-height: 20px;
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
          background: #409EFF;
        }

        &.active {
          background: #409EFF;
        }

        .bar-label {
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 11px;
          color: var(--text-secondary);
          white-space: nowrap;
        }
      }
    }

    .empty-chart {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }
}

.history-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-table {
  overflow-x: auto;

  .empty-history {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .pagination-wrapper {
    margin-top: 20px;
    display: flex;
    justify-content: center;
  }
}

.settings-form {
  .security-settings {
    h4 {
      font-size: 16px;
      color: var(--text-primary);
      margin: 0 0 16px;
    }

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid var(--border-lighter);

      strong {
        display: block;
        font-size: 15px;
        color: var(--text-primary);
        margin-bottom: 4px;
      }

      .desc {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }
    }
  }
}

.detail-content {
  .detail-title-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-lighter);

    h4 {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 8px;
    }

    p {
      font-size: 15px;
      color: var(--text-primary);
      line-height: 1.6;
      margin: 0;
    }
  }
}
</style>
