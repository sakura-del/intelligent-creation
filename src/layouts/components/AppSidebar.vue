<template>
  <aside
    class="app-sidebar"
    :class="{ collapsed: themeStore.sidebarCollapsed, 'mobile-open': isMobileOpen }"
    role="navigation"
    :aria-label="$t('common.appName')"
  >
    <div class="sidebar-header">
      <h3 v-if="!themeStore.sidebarCollapsed">{{ $t('nav.aiContent') }}</h3>
    </div>

    <nav class="sidebar-nav">
      <router-link
        v-for="item in menuItems"
        :key="item.path"
        :to="item.path"
        class="menu-item"
        :class="{ active: isActive(item.path) }"
        :title="themeStore.sidebarCollapsed ? item.label : ''"
        :aria-current="isActive(item.path) ? 'page' : undefined"
        @click="handleMenuClick"
      >
        <el-icon :size="20">
          <component :is="item.icon" />
        </el-icon>
        <span class="menu-text">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar-footer" v-if="!themeStore.sidebarCollapsed">
      <div class="ai-quota">
        <div class="quota-label">{{ $t('nav.todayQuota') }}</div>
        <el-progress :percentage="75" :stroke-width="6" :show-text="false" />
        <div class="quota-text">78 / 100</div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/modules/theme'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const themeStore = useThemeStore()
const { t } = useI18n()

const isMobileOpen = computed(() => {
  return !themeStore.sidebarCollapsed
})

const menuItems = computed(() => [
  { path: '/ai-content', label: t('nav.aiContent'), icon: 'EditPen' },
  { path: '/ai-image', label: t('nav.aiImage'), icon: 'Picture' },
  { path: '/code-studio', label: t('nav.codeStudio'), icon: 'SetUp' },
  { path: '/prompt-library', label: t('nav.promptLibrary'), icon: 'MagicStick' },
  { path: '/gallery', label: t('nav.gallery'), icon: 'FolderOpened' },
  { path: '/app-builder', label: t('nav.appBuilder'), icon: 'Grid' },
  { path: '/profile', label: t('nav.profile'), icon: 'User' },
  { path: '/profile?tab=stats', label: t('nav.stats'), icon: 'DataAnalysis' },
  { path: '/profile?tab=history', label: t('nav.history'), icon: 'Clock' },
  { path: '/profile?tab=settings', label: t('nav.accountSettings'), icon: 'Setting' },
])

function isActive(path) {
  if (path.includes('?')) {
    const basePath = path.split('?')[0]
    return route.path === basePath
  }
  return route.path === path
}

function handleMenuClick() {
  if (window.innerWidth < 768 && !themeStore.sidebarCollapsed) {
    themeStore.toggleSidebar()
  }
}
</script>

<style lang="scss" scoped>
.app-sidebar {
  width: var(--sidebar-width);
  background: var(--bg-white);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-duration) var(--transition-ease),
              background-color var(--transition-duration) var(--transition-ease),
              border-color var(--transition-duration) var(--transition-ease);
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;

  &.collapsed {
    width: var(--sidebar-collapsed-width);

    .menu-text {
      display: none;
    }

    .menu-item {
      justify-content: center;
      padding: 12px;
    }

    .sidebar-header h3 {
      display: none;
    }
  }

  .sidebar-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border-lighter);

    h3 {
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
      margin: 0;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px;

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      color: var(--text-regular);
      text-decoration: none;
      border-radius: var(--border-radius-lg);
      margin-bottom: 4px;
      transition: all 0.25s;

      &:hover {
        background: var(--fill-light);
        color: var(--color-primary);
      }

      &.active {
        background: var(--color-primary-light-9);
        color: var(--color-primary);
        font-weight: 500;
      }

      .menu-text {
        font-size: 14px;
        white-space: nowrap;
      }
    }
  }

  .sidebar-footer {
    padding: 20px;
    border-top: 1px solid var(--border-lighter);

    .ai-quota {
      .quota-label {
        font-size: 12px;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }

      .quota-text {
        font-size: 12px;
        color: var(--text-regular);
        margin-top: 6px;
        text-align: right;
      }
    }
  }
}

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    top: var(--header-height);
    bottom: 0;
    z-index: var(--z-index-sidebar);
    transform: translateX(-100%);
    transition: transform var(--transition-duration) var(--transition-ease);

    &.mobile-open {
      transform: translateX(0);
      box-shadow: var(--shadow-dark);
    }

    &.collapsed {
      width: var(--sidebar-width);
      transform: translateX(-100%);

      .menu-text {
        display: inline;
      }

      .menu-item {
        justify-content: flex-start;
        padding: 12px 16px;
      }

      .sidebar-header h3 {
        display: block;
      }
    }
  }
}
</style>
