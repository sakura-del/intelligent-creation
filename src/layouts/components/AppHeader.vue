<template>
  <header class="app-header" role="banner">
    <div class="header-left">
      <button v-if="userStore.isLoggedIn" class="sidebar-toggle" @click="themeStore.toggleSidebar()"
        :aria-label="themeStore.sidebarCollapsed ? $t('a11y.sidebarExpand') : $t('a11y.sidebarCollapse')">
        <el-icon :size="18">
          <Fold v-if="!themeStore.sidebarCollapsed" />
          <Expand v-else />
        </el-icon>
      </button>
      <div class="logo" @click="$router.push('/')" role="img" aria-label="AI创作平台">
        <el-icon :size="24">
          <MagicStick />
        </el-icon>
        <span class="logo-text">{{ $t('common.appName') }}</span>
      </div>
    </div>

    <div class="header-right">
      <button class="theme-toggle icon-btn" @click="themeStore.toggleDark()"
        :aria-label="themeStore.isDark ? $t('common.lightMode') : $t('common.darkMode')"
        :title="themeStore.isDark ? $t('common.lightMode') : $t('common.darkMode')">
        <el-icon :size="18">
          <Sunny v-if="themeStore.isDark" />
          <Moon v-else />
        </el-icon>
      </button>

      <el-dropdown @command="handleLocaleChange" trigger="click" class="locale-dropdown">
        <button class="icon-btn" :aria-label="$t('common.language')" :title="$t('common.language')">
          <el-icon :size="18">
            <Location />
          </el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="zh-CN" :class="{ active: themeStore.locale === 'zh-CN' }">中文</el-dropdown-item>
            <el-dropdown-item command="en-US"
              :class="{ active: themeStore.locale === 'en-US' }">English</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="notification-badge" @click="handleNotificationClick" role="button" tabindex="0"
        :aria-label="$t('common.more')" @keydown.enter="handleNotificationClick"
        @keydown.space.prevent="handleNotificationClick">
        <el-badge :value="notificationStore.unreadCount" :max="99" :hidden="notificationStore.unreadCount === 0">
          <el-icon :size="20" class="icon-btn">
            <Bell />
          </el-icon>
        </el-badge>
      </div>

      <template v-if="userStore.isLoggedIn">
        <el-dropdown @command="handleCommand">
          <div class="user-info" role="button" tabindex="0" :aria-label="$t('common.profile')"
            @keydown.enter="($event.target.click && $event.target.click())">
            <el-avatar :size="32" :src="userStore.avatar || undefined">
              {{ userStore.nickname?.charAt(0) || 'U' }}
            </el-avatar>
            <span class="username">{{ userStore.nickname || $t('common.profile') }}</span>
            <el-icon>
              <ArrowDown />
            </el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon>
                  <User />
                </el-icon>{{ $t('common.profile') }}
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon>
                  <Setting />
                </el-icon>{{ $t('common.settings') }}
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon>
                  <SwitchButton />
                </el-icon>{{ $t('common.logout') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>

      <template v-else>
        <el-button type="primary" @click="$router.push('/login')">{{ $t('common.login') }}</el-button>
      </template>
    </div>
  </header>
  <NotificationPanel />
</template>

<script setup>
import {   Fold, Expand, MagicStick,        // 左侧 logo/菜单按钮
  Sunny, Moon,                     // 主题切换
  Location,                        // 语言切换
  Bell,                             // 通知
  User, Setting, SwitchButton,      // 用户菜单
  ArrowDown  } from '@element-plus/icons-vue'
import { onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/modules/notification'
import { useThemeStore } from '@/stores/modules/theme'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/modules/user'
import { ElMessageBox, ElMessage, ElNotification } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { useWebSocket } from '@/composables/useWebSocket'
import { setUserContext, clearUserContext } from '@/utils/sentry'

const router = useRouter()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const themeStore = useThemeStore()
const { locale, t } = useI18n()
const { on: onWsMessage, off: offWsMessage } = useWebSocket()

function handleWsNotification(data) {
  notificationStore.addNotification(data)
  ElNotification({
    title: data.typeName || '系统通知',
    message: data.title,
    type: data.status === 'failed' ? 'error' : 'info',
    duration: 5000,
    onClick: () => {
      if (data.link) router.push(data.link)
    },
  })
}

onMounted(() => {
  onWsMessage('notification', handleWsNotification)
})

onUnmounted(() => {
  offWsMessage('notification', handleWsNotification)
})

function handleNotificationClick() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  notificationStore.togglePanel()
}

function handleLocaleChange(lang) {
  themeStore.setLocale(lang)
  locale.value = lang
}

function handleCommand(command) {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/profile?tab=settings')
      break
    case 'logout':
      ElMessageBox.confirm(t('auth.confirmLogout'), t('common.confirm'), {
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        center: true,
      }).then(() => {
        clearUserContext()
        userStore.logout()
        ElMessage.success(t('auth.logoutSuccess'))
        router.push('/')
      }).catch(() => { })
      break
  }
}
</script>

<style lang="scss" scoped>
.app-header {
  height: var(--header-height);
  background: var(--bg-white);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: var(--shadow-light);
  z-index: var(--z-index-header);
  transition: background-color var(--transition-duration) var(--transition-ease),
    border-color var(--transition-duration) var(--transition-ease);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;

  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--border-radius-base);
    color: var(--text-regular);
    cursor: pointer;
    transition: all var(--transition-duration) var(--transition-ease);

    &:hover {
      background: var(--fill-light);
      color: var(--color-primary);
    }
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    color: var(--color-primary);

    .logo-text {
      font-size: 18px;
      font-weight: 600;
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: var(--border-radius-base);
    color: var(--text-regular);
    cursor: pointer;
    transition: all var(--transition-duration) var(--transition-ease);

    &:hover {
      background: var(--fill-light);
      color: var(--color-primary);
    }
  }

  .notification-badge {
    cursor: pointer;
  }

  .locale-dropdown {
    display: flex;
    align-items: center;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 4px 12px;
    border-radius: 20px;
    transition: background-color var(--transition-duration) var(--transition-ease);

    &:hover {
      background-color: var(--fill-light);
    }

    .username {
      font-size: 14px;
      color: var(--text-primary);
    }
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 12px;
  }

  .header-left .logo-text {
    display: none;
  }

  .header-right .username {
    display: none;
  }
}
</style>
