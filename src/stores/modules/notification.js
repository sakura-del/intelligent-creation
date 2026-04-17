import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { aiApi } from '@/api/ai'
import { appApi } from '@/api/app'
import request from '@/utils/request'

export const useNotificationStore = defineStore('notification', () => {
  const panelVisible = ref(false)
  const activeTab = ref('all')
  const aiHistories = ref([])
  const applications = ref([])
  const notifications = ref([])
  const loading = ref(false)
  const lastFetchTime = ref(null)

  const allNotifications = computed(() => {
    const list = []

    aiHistories.value.forEach((h) => {
      list.push({
        id: `ai-${h.id}`,
        sourceId: h.id,
        type: 'ai',
        typeName: 'AI内容',
        icon: 'MagicStick',
        title: (h.prompt || '').substring(0, 40) + ((h.prompt || '').length > 40 ? '...' : ''),
        status: h.result ? 'completed' : 'failed',
        statusText: h.result ? '已完成' : '失败',
        createTime: h.create_time || h.createTime,
        link: '/ai-content',
        read: isRead(`ai-${h.id}`),
      })
    })

    applications.value.forEach((a) => {
      list.push({
        id: `app-${a.id}`,
        sourceId: a.id,
        type: 'app',
        typeName: '应用',
        icon: 'Grid',
        title: a.name || '未命名应用',
        status: a.status,
        statusText: {
          draft: '草稿', generating: '生成中', ready: '就绪',
          deployed: '已部署', failed: '失败',
        }[a.status] || a.status,
        createTime: a.create_time || a.createTime,
        link: '/app-builder',
        read: isRead(`app-${a.id}`),
      })
    })

    notifications.value.forEach((n) => {
      if (!list.find((l) => l.id === n.id)) {
        list.push({
          ...n,
          read: isRead(n.id),
        })
      }
    })

    list.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    return list
  })

  const filteredNotifications = computed(() => {
    if (activeTab.value === 'all') return allNotifications.value
    return allNotifications.value.filter((n) => n.type === activeTab.value)
  })

  const unreadCount = computed(() => allNotifications.value.filter((n) => !n.read).length)

  function isRead(id) {
    try {
      const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]')
      return readIds.includes(id)
    } catch {
      return false
    }
  }

  function markAsRead(id) {
    try {
      const readIds = JSON.parse(localStorage.getItem('readNotifications') || '[]')
      if (!readIds.includes(id)) {
        readIds.push(id)
        if (readIds.length > 500) readIds.splice(0, readIds.length - 500)
        localStorage.setItem('readNotifications', JSON.stringify(readIds))
      }
    } catch {
      // ignore
    }
  }

  function markAllAsRead() {
    const readIds = allNotifications.value.map((n) => n.id)
    localStorage.setItem('readNotifications', JSON.stringify(readIds))
  }

  function togglePanel() {
    panelVisible.value = !panelVisible.value
    if (panelVisible.value && !loading.value) {
      fetchAll()
    }
  }

  function closePanel() {
    panelVisible.value = false
  }

  function addNotification(notification) {
    const item = {
      id: notification.id || `push-${Date.now()}`,
      type: notification.type || 'system',
      typeName: notification.typeName || '系统通知',
      icon: notification.icon || 'Bell',
      title: notification.title || '',
      status: notification.status || 'info',
      statusText: notification.statusText || '',
      createTime: notification.createTime || new Date().toISOString(),
      link: notification.link || '',
      read: false,
    }
    notifications.value.unshift(item)
    if (notifications.value.length > 100) {
      notifications.value.splice(100)
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      const [aiRes, appRes] = await Promise.allSettled([
        aiApi.getHistory(),
        appApi.getList(),
      ])
      if (aiRes.status === 'fulfilled' && aiRes.value?.data) {
        aiHistories.value = Array.isArray(aiRes.value.data) ? aiRes.value.data : []
      }
      if (appRes.status === 'fulfilled' && appRes.value?.data) {
        applications.value = Array.isArray(appRes.value.data) ? appRes.value.data : []
      }
      lastFetchTime.value = Date.now()
    } catch (err) {
      console.error('获取通知失败:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchServerNotifications() {
    try {
      const res = await request.get('/notifications', {
        params: { limit: 20 },
      })
      if (res?.items) {
        notifications.value = res.items
      }
    } catch {
      // notification API may not exist yet
    }
  }

  return {
    panelVisible,
    activeTab,
    aiHistories,
    applications,
    notifications,
    loading,
    lastFetchTime,
    allNotifications,
    filteredNotifications,
    unreadCount,
    togglePanel,
    closePanel,
    fetchAll,
    fetchServerNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
  }
})
