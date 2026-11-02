import request from '../utils/request'

/**
 * 上传图片：POST /api/file/upload
 * multipart/form-data，字段名必须是 file
 * 返回 { url: 'http://localhost:8080/uploads/...' }
 */
export function uploadImage(file) {
  const fd = new FormData()
  fd.append('file', file)
  // 千万不要手写 headers: { 'Content-Type': 'multipart/form-data' }
  // 手写会丢掉 boundary，Spring 那边直接报「当前请求不是 multipart」
  return request.post('/file/upload', fd)
}
