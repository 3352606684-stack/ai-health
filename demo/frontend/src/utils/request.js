import axios from 'axios'
import { ElMessage } from 'element-plus'
// ElMessage 是函数式调用，unplugin 的按需导入不会注入它的样式，必须手动引入
import 'element-plus/es/components/message/style/css'

const request = axios.create({
  baseURL: '/api', // 请求前缀，走 vite 代理 -> http://localhost:8080/api
  timeout: 10000 // 10 秒超时
})

/* ==================== 请求拦截器 ==================== */
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      // 业界标准写法。如果你的后端读的是 token 头，改成 config.headers.token = token
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* ==================== 响应拦截器 ==================== */
request.interceptors.response.use(
  (response) => {
    const { data, config } = response

    // 情况一：后端没包业务结构（如 /api/dashboard/stats 直接返回对象）
    // 这种情况必须原样返回，否则后面取 data.code 会是 undefined，函数走空返回 undefined
    if (!data || typeof data !== 'object' || !('code' in data)) {
      return data
    }

    // 情况二：后端包了 { code, message/msg, data }
    // 用 Number() 统一转数字，避免后端返回字符串 '200' 时 === 永远不成立
    const code = Number(data.code)

    if (code === 200 || code === 0) {
      // 剥掉业务外壳；没有 data 字段时退回整个对象，避免返回 undefined
      return data.data !== undefined ? data.data : data
    }

    // 登录过期：约定为 -1 或 401
    if (code === 401 || code === -1) {
      const msg = data.msg || data.message || '登录状态已过期，请重新登录'
      ElMessage.error(msg)
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')

      // 登录接口本身失败时不要跳转，否则在登录页会被反复刷新
      const isLoginApi = (config.url || '').includes('/login')
      if (!isLoginApi && window.location.pathname !== '/auth/login') {
        // 刻意不 import router，避免 request -> router -> views -> api -> request 的循环依赖
        window.location.href = '/auth/login'
      }
      return Promise.reject(new Error(msg))
    }

    // 其它业务错误
    const msg = data.msg || data.message || '请求失败'
    ElMessage.error(msg)
    return Promise.reject(new Error(msg))
  },
  (error) => {
    // 走到这里的是 HTTP 层错误：404 / 500 / 断网等
    const status = error.response?.status
    let msg

    if (!error.response) {
      msg = '网络异常，无法连接后端服务'
    } else if (status === 401) {
      msg = '登录已过期，请重新登录'
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
    } else if (status === 403) {
      msg = '没有访问权限'
    } else if (status === 404) {
      msg = '接口不存在，请检查路径'
    } else if (status >= 500) {
      msg = '后端服务异常，请确认服务已启动'
    } else {
      msg = error.response?.data?.message || '请求失败'
    }

    ElMessage.error(msg)
    return Promise.reject(new Error(msg))
  }
)

export default request
