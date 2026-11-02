import request from '../utils/request'

/** 数据分析首页统计（GET /api/dashboard/stats） */
export function getDashboardStats() {
  return request.get('/dashboard/stats')
}
