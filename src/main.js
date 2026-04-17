import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useThemeStore } from './stores/modules/theme'
import { initErrorMonitor } from './utils/errorMonitor'
import { initPerformanceMonitor } from './utils/performanceMonitor'
import { initSentry } from './utils/sentry'
import './styles/index.scss'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

app.use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const themeStore = useThemeStore()
themeStore.initTheme()

app.use(router)
app.use(i18n)
app.use(VueVirtualScroller)

initErrorMonitor(app)
initPerformanceMonitor()
initSentry(app, router)

app.mount('#app')
