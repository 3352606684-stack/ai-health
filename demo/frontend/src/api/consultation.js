import request from '../utils/request'

/**
 * 咨询会话分页列表（GET /api/consultation/sessions）
 * params: { page, pageSize }
 */
export function fetchSessions(params) {
  return request.get('/consultation/sessions', { params })
}

/** 单个会话详情（GET /api/consultation/sessions/{id}） */
export function fetchSessionDetail(id) {
  return request.get(`/consultation/sessions/${id}`)
}
