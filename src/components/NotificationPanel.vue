<template>
  <Transition name="slide-down">
    <div v-if="notificationStore.panelVisible" class="notification-panel">
      <div class="panel-header">
        <h3>通知中心</h3>
        <div class="header-actions">
          <el-button v-if="notificationStore.unreadCount > 0" text size="small" @click="notificationStore.markAllAsRead">
            全部已读
          </el-button>
          <el-icon class="close-btn" @click="notificationStore.closePanel">
            <Close />
          </el-icon>
        </div>
      </div>

      <div class="panel-tabs">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: notificationStore.activeTab === tab.key }"
          @click="notificationStore.activeTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
        </span>
      </div>

      <div v-loading="notificationStore.loading" class="panel-body">
        <template v-if="notificationStore.filteredNotifications.length">
          <div
            v-for="item in notificationStore.filteredNotifications"
            :key="item.id"
            class="notification-item"
            :class="{ unread: !item.read }"
            @click="handleClick(item)"
          >
            <div class="unread-dot" v-if="!item.read"></div>
            <div class="item-icon">
              <el-icon :size="18">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <div class="item-content">
              <div class="item-title">
                <span class="type-tag" :class="`type-${item.type}`">{{ item.typeName }}</span>
                {{ item.title }}
              </div>
              <div class="item-meta">
                <span class="status-tag" :class="`status-${item.status}`">{{ item.statusText }}</span>
                <span class="time">{{ formatTime(item.createTime) }}</span>
              </div>
            </div>
          </div>
        </template>
        <el-empty v-else description="暂无通知" :image-size="60" />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useNotificationStore } from '@/stores/modules/notification'
import { useRouter } from 'vue-router'

const router = useRouter()
const notificationStore = useNotificationStore()

const tabs = computed(() => [
  { key: 'all', label: '全部', count: notificationStore.unreadCount },
  { key: 'ai', label: 'AI内容', count: notificationStore.filteredNotifications.filter(n => n.type === 'ai' && !n.read).length },
  { key: 'app', label: '应用', count: notificationStore.filteredNotifications.filter(n => n.type === 'app' && !n.read).length },
  { key: 'system', label: '系统', count: notificationStore.filteredNotifications.filter(n => n.type === 'system' && !n.read).length },
])

function handleClick(item) {
  notificationStore.markAsRead(item.id)
  notificationStore.closePanel()
  if (item.link) {
    router.push(item.link)
  }
}

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.notification-panel {
  position: fixed;
  top: 60px;
  right: 24px;
  width: 400px;
  max-height: 520px;
  background: var(--bg-white, #fff);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-lighter, #ebeef5);

    h3 {
      margin: 0;
      font-size: 16px;
      color: var(--text-primary, #303133);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close-btn {
      cursor: pointer;
      color: var(--text-secondary, #909399);
      transition: color 0.2s;
      &:hover { color: var(--color-primary, #409eff); }
    }
  }

  .panel-tabs {
    display: flex;
    padding: 8px 20px;
    gap: 16px;
    border-bottom: 1px solid var(--border-extra-light, #f0f0f0);

    .tab-item {
      font-size: 13px;
      color: var(--text-secondary, #909399);
      cursor: pointer;
      padding-bottom: 6px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;

      &.active {
        color: var(--color-primary, #409eff);
        border-bottom-color: var(--color-primary, #409eff);
      }

      &:hover { color: var(--color-primary, #409eff); }

      .tab-badge {
        font-size: 10px;
        background: var(--color-danger, #f56c6c);
        color: #fff;
        border-radius: 10px;
        padding: 0 5px;
        min-width: 16px;
        height: 16px;
        line-height: 16px;
        text-align: center;
      }
    }
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .notification-item {
    display: flex;
    gap: 12px;
    padding: 12px 20px;
    cursor: pointer;
    transition: background-color 0.2s;
    position: relative;

    &:hover { background-color: var(--fill-light, #f5f7fa); }

    &.unread {
      background-color: var(--color-primary-light-9, #ecf5ff);
      &:hover { background-color: var(--color-primary-light-8, #d9ecff); }
    }

    .unread-dot {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-primary, #409eff);
    }

    .item-icon {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--color-primary-light-9, #f0f5ff);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--color-primary, #409eff);
    }

    .item-content {
      flex: 1;
      min-width: 0;

      .item-title {
        font-size: 14px;
        color: var(--text-primary, #303133);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .item-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;

        .time {
          font-size: 12px;
          color: var(--text-placeholder, #c0c4cc);
        }
      }
    }
  }
}

.type-tag {
  flex-shrink: 0;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  &.type-ai { background: var(--color-primary-light-9, #f0e8fd); color: var(--color-primary, #7c3aed); }
  &.type-app { background: var(--color-success-light-9, #e8fde8); color: var(--color-success, #52c41a); }
  &.type-system { background: var(--color-warning-light-9, #fdf6e8); color: var(--color-warning, #fa8c16); }
}

.status-tag {
  font-size: 11px;
  &.status-completed, &.status-published, &.status-ready, &.status-deployed { color: var(--color-success, #52c41a); }
  &.status-draft { color: var(--text-secondary, #909399); }
  &.status-generating { color: var(--color-primary, #1890ff); }
  &.status-failed { color: var(--color-danger, #ff4d4f); }
  &.status-archived { color: var(--text-secondary, #909399); }
}
</style>
