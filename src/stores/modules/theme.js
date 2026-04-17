import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)
  const sidebarCollapsed = ref(false)
  const locale = ref('zh-CN')

  function initTheme() {
    const savedTheme = localStorage.getItem('theme')
    const savedLocale = localStorage.getItem('locale')
    const savedSidebar = localStorage.getItem('sidebarCollapsed')

    if (savedTheme === 'dark') {
      isDark.value = true
    } else if (savedTheme === 'light') {
      isDark.value = false
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark.value = true
    }

    if (savedLocale) {
      locale.value = savedLocale
    }

    if (savedSidebar === 'true') {
      sidebarCollapsed.value = true
    }

    applyTheme()
  }

  function applyTheme() {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleDark() {
    isDark.value = !isDark.value
    applyTheme()
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  function setDark(value) {
    isDark.value = value
    applyTheme()
    localStorage.setItem('theme', value ? 'dark' : 'light')
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed.value))
  }

  function setLocale(newLocale) {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
  }

  watch(isDark, () => {
    applyTheme()
  })

  return {
    isDark,
    sidebarCollapsed,
    locale,
    initTheme,
    toggleDark,
    setDark,
    toggleSidebar,
    setLocale,
  }
})
