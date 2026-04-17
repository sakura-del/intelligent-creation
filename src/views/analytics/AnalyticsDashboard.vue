<template>
  <div class="analytics-dashboard">
    <div class="dashboard-header">
      <h2>数据分析中心</h2>
      <div class="header-actions">
        <el-select v-model="dateRange" size="default" style="width: 120px">
          <el-option label="近7天" value="7d" />
          <el-option label="近30天" value="30d" />
          <el-option label="近90天" value="90d" />
        </el-select>
        <el-button :loading="loading" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6" v-for="card in overviewCards" :key="card.key">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-info">
              <div class="stat-label">{{ card.label }}</div>
              <div class="stat-value">{{ formatNumber(card.value) }}</div>
            </div>
            <el-icon :size="40" :class="['stat-icon', card.iconClass]">
              <component :is="card.icon" />
            </el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>访问趋势</span>
              <el-radio-group v-model="trendMetric" size="small">
                <el-radio-button value="users">用户</el-radio-button>
                <el-radio-button value="events">事件</el-radio-button>
                <el-radio-button value="sessions">会话</el-radio-button>
                <el-radio-button value="pageViews">浏览</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <v-chart :option="trendChartOption" autoresize style="height: 350px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card>
          <template #header><span>热门页面 TOP10</span></template>
          <div class="page-list">
            <div v-for="(page, idx) in topPages" :key="page.path" class="page-item">
              <span class="page-rank" :class="{ 'top-three': idx < 3 }">{{ idx + 1 }}</span>
              <span class="page-path">{{ formatPath(page.path) }}</span>
              <span class="page-views">{{ page.views }}次</span>
            </div>
            <el-empty v-if="topPages.length === 0" description="暂无数据" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header><span>AI 调用分析</span></template>
          <div v-if="aiStats.summary" class="ai-summary">
            <el-row :gutter="12">
              <el-col :span="8">
                <div class="ai-stat-item">
                  <div class="ai-stat-value">{{ formatNumber(aiStats.summary.totalCalls) }}</div>
                  <div class="ai-stat-label">总调用次数</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="ai-stat-item">
                  <div class="ai-stat-value success">{{ aiStats.summary.successRate }}%</div>
                  <div class="ai-stat-label">成功率</div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="ai-stat-item">
                  <div class="ai-stat-value">${{ aiStats.summary.totalCost.toFixed(4) }}</div>
                  <div class="ai-stat-label">预估成本</div>
                </div>
              </el-col>
            </el-row>
          </div>
          <v-chart :option="aiModelChartOption" autoresize style="height: 280px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header><span>功能使用排行</span></template>
          <v-chart :option="featureUsageChartOption" autoresize style="height: 320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-section">
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>转化漏斗</span>
              <el-button text type="primary" size="small" @click="showFunnelDialog = true">
                自定义漏斗
              </el-button>
            </div>
          </template>
          <v-chart :option="funnelChartOption" autoresize style="height: 360px" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card>
          <template #header><span>点击热力图预览</span></template>
          <div class="heatmap-container">
            <canvas ref="heatmapCanvas" width="600" height="400"></canvas>
            <div v-if="heatmapData.length === 0" class="heatmap-empty">
              <el-empty description="暂无点击数据" :image-size="100" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="showFunnelDialog" title="自定义转化漏斗" width="500px">
      <el-form label-width="80px">
        <el-form-item label="漏斗名称">
          <el-input v-model="customFunnel.name" placeholder="例如：内容创作漏斗" />
        </el-form-item>
        <el-form-item label="步骤定义">
          <div v-for="(step, idx) in customFunnel.steps" :key="idx" class="funnel-step-item">
            <el-input v-model="step.name" placeholder="步骤名称" style="flex: 1" />
            <el-input v-model="step.event" placeholder="事件名(逗号分隔)" style="flex: 2; margin-left: 8px" />
            <el-button type="danger" :icon="Delete" circle size="small" style="margin-left: 8px"
              @click="customFunnel.steps.splice(idx, 1)" />
          </div>
          <el-button type="primary" plain size="small" @click="addFunnelStep">+ 添加步骤</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showFunnelDialog = false">取消</el-button>
        <el-button type="primary" :loading="funnelLoading" @click="queryCustomFunnel">查询</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, FunnelChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import {
  Refresh,
  User,
  View,
  Timer,
  Cpu,
  DataAnalysis,
  Delete,
} from '@element-plus/icons-vue'
import axios from 'axios'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  FunnelChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const loading = ref(false)
const dateRange = ref('7d')
const trendMetric = ref('users')
const showFunnelDialog = ref(false)
const funnelLoading = ref(false)
const heatmapCanvas = ref(null)

const overview = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalEvents: 0,
  totalSessions: 0,
  pageViews: 0,
  avgSessionDuration: 0,
})

const trendData = ref([])
const topPages = ref([])
const aiStats = ref({ summary: null, byModel: [], dailyTrend: [] })
const featureUsage = ref({ features: [], dailyTrend: [] })
const funnelData = ref([])
const heatmapData = ref([])

const customFunnel = ref({
  name: '',
  steps: [{ name: '第一步', event: 'page_view' }],
})

const overviewCards = computed(() => [
  {
    key: 'totalUsers',
    label: '总用户数',
    value: overview.value.totalUsers,
    icon: User,
    iconClass: 'icon-blue',
  },
  {
    key: 'activeUsers',
    label: '活跃用户',
    value: overview.value.activeUsers,
    icon: DataAnalysis,
    iconClass: 'icon-green',
  },
  {
    key: 'totalEvents',
    label: '总事件数',
    value: overview.value.totalEvents,
    icon: View,
    iconClass: 'icon-orange',
  },
  {
    key: 'avgSessionDuration',
    label: '平均会话时长',
    value: `${overview.value.avgSessionDuration}s`,
    icon: Timer,
    iconClass: 'icon-purple',
  },
])

const trendChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trendData.value.map((d) => d.date),
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      smooth: true,
      data: trendData.value.map((d) => d.value),
      areaStyle: { opacity: 0.3 },
      lineStyle: { width: 3 },
      itemStyle: { color: '#409EFF' },
    },
  ],
}))

const aiModelChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: ['文本生成', '代码生成', '图片生成'] },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: aiStats.value.byModel.map((m) => m.model) },
  yAxis: { type: 'value' },
  series: ['text', 'code', 'image'].map((type) => ({
    name: { text: '文本生成', code: '代码生成', image: '图片生成' }[type],
    type: 'bar',
    stack: 'total',
    data: aiStats.value.byModel
      .filter((m) => m.call_type === type)
      .map((m) => m.calls || 0),
  })),
}))

const featureUsageChartOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
  xAxis: {
    type: 'category',
    data: featureUsage.value.features.slice(0, 10).map((f) => f.feature),
    axisLabel: { rotate: 30, fontSize: 11 },
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'bar',
      data: featureUsage.value.features.slice(0, 10).map((f) => f.usage_count),
      itemStyle: {
        color: (params) => {
          const colors = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de']
          return colors[params.dataIndex % colors.length]
        },
      },
    },
  ],
}))

const funnelChartOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  series: [
    {
      type: 'funnel',
      left: '10%',
      top: 60,
      bottom: 60,
      width: '80%',
      min: 0,
      max: funnelData.value[0]?.users || 1,
      minSize: '0%',
      maxSize: '100%',
      sort: 'descending',
      gap: 2,
      label: {
        show: true,
        position: 'inside',
        formatter: (p) => `${p.name}\n${p.value}人 (${p.data?.conversionRate || 0}%)`,
        fontSize: 12,
      },
      labelLine: { show: false },
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      data: funnelData.value.map((f, i) => ({
        name: f.step,
        value: f.users,
        conversionRate: f.conversionRate,
        itemStyle: {
          color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'][i % 5],
        },
      })),
    },
  ],
}))

async function fetchOverview() {
  const res = await axios.get('/api/analytics/stats/overview', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    overview.value = res.data.data
  }
}

async function fetchTrend() {
  const res = await axios.get('/api/analytics/stats/trend', {
    params: { range: dateRange.value, metric: trendMetric.value },
  })
  if (res.data.code === 200) {
    trendData.value = res.data.data
  }
}

async function fetchTopPages() {
  const res = await axios.get('/api/analytics/stats/pages', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    topPages.value = res.data.data
  }
}

async function fetchAIStats() {
  const res = await axios.get('/api/analytics/ai/stats', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    aiStats.value = res.data.data
  }
}

async function fetchFeatures() {
  const res = await axios.get('/api/analytics/features', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    featureUsage.value = res.data.data
  }
}

async function fetchFunnel() {
  const res = await axios.get('/api/analytics/funnel/default', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    funnelData.value = res.data.data
  }
}

async function fetchHeatmap() {
  const res = await axios.get('/api/analytics/heatmap/clicks', { params: { range: dateRange.value } })
  if (res.data.code === 200) {
    heatmapData.value = res.data.data
    renderHeatmap()
  }
}

function renderHeatmap() {
  if (!heatmapCanvas.value || heatmapData.value.length === 0) return

  const canvas = heatmapCanvas.value
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  ctx.clearRect(0, 0, w, h)

  const maxWeight = Math.max(...heatmapData.value.map((d) => d.weight), 1)

  heatmapData.value.forEach((point) => {
    const x = (point.x / window.innerWidth) * w
    const y = (point.y / window.innerHeight) * h
    const radius = Math.max(5, Math.min(30, (point.weight / maxWeight) * 25))
    const alpha = Math.max(0.2, Math.min(0.8, point.weight / maxWeight))

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(255, 87, 51, ${alpha})`)
    gradient.addColorStop(0.5, `rgba(255, 159, 64, ${alpha * 0.6})`)
    gradient.addColorStop(1, 'rgba(255, 195, 18, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

function addFunnelStep() {
  customFunnel.value.steps.push({
    name: `第${customFunnel.value.steps.length + 1}步`,
    event: '',
  })
}

async function queryCustomFunnel() {
  funnelLoading.value = true
  try {
    const res = await axios.post('/api/analytics/funnel/custom', {
      name: customFunnel.value.name,
      steps: customFunnel.value.steps,
      range: dateRange.value,
    })
    if (res.data.code === 200) {
      funnelData.value = res.data.data.steps
      showFunnelDialog.value = false
    }
  } finally {
    funnelLoading.value = false
  }
}

function formatNumber(num) {
  if (!num && num !== 0) return '0'
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatPath(path) {
  if (!path) return '/'
  return path.replace(/^\//, '').split('/')[0] || '/'
}

async function refreshData() {
  loading.value = true
  try {
    await Promise.all([fetchOverview(), fetchTrend(), fetchTopPages(), fetchAIStats(), fetchFeatures(), fetchFunnel(), fetchHeatmap()])
  } finally {
    loading.value = false
  }
}

watch(dateRange, () => refreshData())
watch(trendMetric, () => fetchTrend())

onMounted(async () => {
  await refreshData()
})
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
  background: var(--bg-color);
  min-height: calc(100vh - 120px);
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.dashboard-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
.stats-cards {
  margin-bottom: 20px;
}
.stat-card {
  height: 100%;
}
.stat-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 8px;
}
.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
}
.stat-icon {
  opacity: 0.15;
}
.icon-blue { color: #409EFF; }
.icon-green { color: #67C23A; }
.icon-orange { color: #E6A23C; }
.icon-purple { color: #9B59B6; }

.chart-section {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-list {
  max-height: 340px;
  overflow-y: auto;
}
.page-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
}
.page-rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
  font-size: 13px;
  font-weight: 600;
  margin-right: 12px;
}
.page-rank.top-three {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #fff;
}
.page-path {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.page-views {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.ai-summary {
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}
.ai-stat-item {
  text-align: center;
}
.ai-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}
.ai-stat-value.success {
  color: #67C23A;
}
.ai-stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.heatmap-container {
  position: relative;
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.heatmap-container canvas {
  max-width: 100%;
  height: auto;
}
.heatmap-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.funnel-step-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>
