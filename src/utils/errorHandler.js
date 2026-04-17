import { ElMessage } from 'element-plus'

const ERROR_MESSAGES = {
  400: '请求参数有误，请检查输入',
  401: '登录已过期，请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  429: '操作过于频繁，请稍后再试',
  500: '服务器繁忙，请稍后重试',
  502: '网关错误，服务暂时不可用',
  503: '服务维护中，请稍后重试',
}

const NETWORK_ERRORS = {
  ERR_NETWORK: '网络连接失败，请检查网络设置',
  ERR_INTERNET_DISCONNECTED: '网络已断开，请连接网络后重试',
  ECONNABORTED: '请求超时，请稍后重试',
  ETIMEDOUT: '连接超时，请检查网络状态',
}

export function getErrorMessage(error, fallbackMsg = '操作失败') {
  if (!error) return fallbackMsg

  if (error.response?.status) {
    return ERROR_MESSAGES[error.response.status] || error.response.data?.message || `${fallbackMsg} (${error.response.status})`
  }

  if (error.code && NETWORK_ERRORS[error.code]) {
    return NETWORK_ERRORS[error.code]
  }

  if (error.message) {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return '网络连接异常，请检查网络设置'
    }
    if (error.message.includes('timeout')) {
      return '请求超时，请稍后重试'
    }
    if (error.message.includes("doesn't exist")) {
      return '数据加载失败，部分功能可能不可用'
    }
    
    return error.message.length > 100 ? fallbackMsg : error.message
  }

  return fallbackMsg
}

export function showUserError(error, fallbackMsg = '操作失败，请重试') {
  const message = getErrorMessage(error, fallbackMsg)
  
  console.error('[UserVisible Error]', {
    message,
    originalError: error,
    timestamp: new Date().toISOString(),
  })
  
  ElMessage.error(message)
  return message
}

export function showUserWarning(msg) {
  ElMessage.warning(msg)
  console.warn('[UserVisible Warning]', msg)
}

export function showUserSuccess(msg) {
  ElMessage.success(msg)
}

export function showUserInfo(msg) {
  ElMessage.info(msg)
}

export default {
  getErrorMessage,
  showUserError,
  showUserWarning,
  showUserSuccess,
  showUserInfo,
}
