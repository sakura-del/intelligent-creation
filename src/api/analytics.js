import axios from '../utils/request.js'

const BASE_URL = '/api/analytics'

export function trackEvents(events) {
  return axios.post(`${BASE_URL}/track`, { events })
}

export function getOverview(params) {
  return axios.get(`${BASE_URL}/stats/overview`, { params })
}

export function getTrend(params) {
  return axios.get(`${BASE_URL}/stats/trend`, { params })
}

export function getTopPages(params) {
  return axios.get(`${BASE_URL}/stats/pages`, { params })
}

export function getAIStats(params) {
  return axios.get(`${BASE_URL}/ai/stats`, { params })
}

export function getClickHeatmap(params) {
  return axios.get(`${BASE_URL}/heatmap/clicks`, { params })
}

export function getScrollHeatmap(params) {
  return axios.get(`${BASE_URL}/heatmap/scroll`, { params })
}

export function getFeatureUsage(params) {
  return axios.get(`${BASE_URL}/features`, { params })
}

export function getDefaultFunnel(params) {
  return axios.get(`${BASE_URL}/funnel/default`, { params })
}

export function createCustomFunnel(data) {
  return axios.post(`${BASE_URL}/funnel/custom`, data)
}

export function getRetentionData(params) {
  return axios.get(`${BASE_URL}/retention`, { params })
}
