/**
 * 知识文章接口封装
 *
 * 这一层只做「请求路径 + 参数」的翻译，不写任何业务判断。
 * 统一走 utils/request.js 的实例（baseURL = /api，带 token，自动剥 { code, message, data } 外壳），
 * 所以下面的函数 resolve 出来的就是**纯数据**，不需要再 .data.data。
 *
 * 后端尚未实现，契约以 knowledge.vue 文件头的注释为准。
 */
import request from '../utils/request'

/** 分页查询文章 → data: { list, total, page, pageSize } */
export function fetchArticles(params) {
  return request.get('/knowledge/articles', { params })
}

/** 分类下拉选项 → data: string[] */
export function fetchCategories() {
  return request.get('/knowledge/categories')
}

/** 新增文章 → data: Article */
export function createArticle(data) {
  return request.post('/knowledge/articles', data)
}

/** 编辑文章（全量更新）→ data: Article */
export function updateArticle(id, data) {
  return request.put(`/knowledge/articles/${id}`, data)
}

/** 上线 / 下线（只改状态）→ data: Article */
export function updateArticleStatus(id, status) {
  return request.patch(`/knowledge/articles/${id}/status`, { status })
}

/** 删除文章 → data: null */
export function deleteArticle(id) {
  return request.delete(`/knowledge/articles/${id}`)
}
