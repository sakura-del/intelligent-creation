<template>
  <div class="main-layout">
    <a href="#main-content" class="skip-to-content">{{ $t('a11y.skipToContent') }}</a>
    <AppHeader />
    <div class="layout-container">
      <AppSidebar v-if="showSidebar" />
      <div
        v-if="showSidebar && isMobile && !themeStore.sidebarCollapsed"
        class="sidebar-overlay"
        @click="themeStore.toggleSidebar()"
      ></div>
      <main id="main-content" class="main-content" :class="{ 'sidebar-collapsed': !showSidebar || themeStore.sidebarCollapsed }" tabindex="-1">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
    <ShortcutHelp />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/modules/theme'
import { useHotkey, toggleHelp } from '@/composables/useHotkey'
import AppHeader from './components/AppHeader.vue'
import AppSidebar from './components/AppSidebar.vue'
import ShortcutHelp from '@/components/ShortcutHelp.vue'

const route = useRoute()
const themeStore = useThemeStore()

const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value < 768)

const showSidebar = computed(() => {
  return route.meta.requiresAuth !== false
})

useHotkey({
  'ctrl+/': () => toggleHelp(),
  'ctrl+shift+d': () => themeStore.toggleDark(),
  'ctrl+k': () => {
    const searchInput = document.querySelector('.sidebar-search input, .search-input input')
    if (searchInput) searchInput.focus()
  },
})

function handleResize() {
  windowWidth.value = window.innerWidth
  if (isMobile.value && !themeStore.sidebarCollapsed) {
    themeStore.sidebarCollapsed = true
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  if (isMobile.value) {
    themeStore.sidebarCollapsed = true
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.skip-to-content {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #fff;
  padding: 8px 24px;
  border-radius: 0 0 var(--border-radius-base) var(--border-radius-base);
  z-index: 9999;
  font-size: 14px;
  text-decoration: none;
  transition: top 0.2s;

  &:focus {
    top: 0;
  }
}

.main-layout {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color);
  transition: background-color var(--transition-duration) var(--transition-ease);
}

.layout-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar-overlay {
  position: fixed;
  top: var(--header-height);
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  z-index: var(--z-index-overlay);
  transition: opacity var(--transition-duration) var(--transition-ease);
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-color);
  transition: margin-left var(--transition-duration) var(--transition-ease),
              background-color var(--transition-duration) var(--transition-ease);

  &:not(.sidebar-collapsed) {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .main-content {
    margin-left: 0 !important;
  }
}
</style>
