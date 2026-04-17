import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AppSidebar from '../AppSidebar.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/ai-content', name: 'AIContent', component: { template: '<div />' } },
    { path: '/ai-image', name: 'AIImage', component: { template: '<div />' } },
    { path: '/code-studio', name: 'CodeStudio', component: { template: '<div />' } },
    { path: '/prompt-library', name: 'PromptLibrary', component: { template: '<div />' } },
    { path: '/gallery', name: 'UserGallery', component: { template: '<div />' } },
    { path: '/app-builder', name: 'AppBuilder', component: { template: '<div />' } },
    { path: '/profile', name: 'Profile', component: { template: '<div />' } },
  ],
})

describe('AppSidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders menu items', async () => {
    router.push('/ai-content')
    await router.isReady()

    const wrapper = mount(AppSidebar, {
      global: {
        plugins: [router],
        stubs: {
          'el-icon': true,
          'el-progress': true,
        },
      },
    })

    const menuItems = wrapper.findAll('.menu-item')
    expect(menuItems.length).toBeGreaterThan(0)
  })

  it('contains expected menu labels', async () => {
    router.push('/ai-content')
    await router.isReady()

    const wrapper = mount(AppSidebar, {
      global: {
        plugins: [router],
        stubs: {
          'el-icon': true,
          'el-progress': true,
        },
      },
    })

    const text = wrapper.text()
    expect(text).toContain('AI内容生成')
    expect(text).toContain('AI图片生成')
    expect(text).toContain('代码工坊')
  })
})
