import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const applications = ref([])
  const currentApp = ref(null)
  const appTemplates = ref([])
  const description = ref('')
  const generating = ref(false)
  const loading = ref(false)

  const quickTags = ref(['员工管理系统', '订单管理', '数据报表', '知识库'])

  function setApplications(data) {
    applications.value = data
  }

  function setCurrentApp(app) {
    currentApp.value = app
  }

  function setAppTemplates(data) {
    appTemplates.value = data
  }

  function setDescription(value) {
    description.value = value
  }

  function setGenerating(status) {
    generating.value = status
  }

  function addApplication(app) {
    applications.value.unshift(app)
  }

  function updateApplication(id, data) {
    const index = applications.value.findIndex((a) => a.id === id)
    if (index !== -1) {
      applications.value[index] = { ...applications.value[index], ...data }
    }
  }

  function deleteApplication(id) {
    applications.value = applications.value.filter((a) => a.id !== id)
  }

  return {
    applications,
    currentApp,
    appTemplates,
    description,
    generating,
    loading,
    quickTags,
    setApplications,
    setCurrentApp,
    setAppTemplates,
    setDescription,
    setGenerating,
    addApplication,
    updateApplication,
    deleteApplication,
  }
})
