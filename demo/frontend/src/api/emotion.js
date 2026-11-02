import request from '../utils/request'

/**
 * 情绪日志分页列表（GET /api/emotion/logs）
 * params: { page, pageSize, userId, scoreRange }
 * scoreRange: high(8-10) | mid(5-7) | low(1-4)，空串表示不限
 */
export function fetchLogs(params) {
  return request.get('/emotion/logs', { params })
}

/** 单条情绪日记详情（GET /api/emotion/logs/{id}） */
export function fetchLogDetail(id) {
  return request.get(`/emotion/logs/${id}`)
}

/** 删除情绪日记（DELETE /api/emotion/logs/{id}） */
export function deleteLog(id) {
  return request.delete(`/emotion/logs/${id}`)
}
