import service from '../utils/request'

/**
 * 本地模拟账号表
 * 仅用于后端登录接口就绪前的联调；真实接口好了以后改用 login() 并删除这个数组。
 * 注意：密码必须是字符串（写成数字会和输入框的字符串严格比较失败）
 */
export const ADMIN_DATA = [
  {
    id: 1,
    account: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    nickname: '管理员',
    role: 'admin',
    token: 'mock-token-admin-8f3a1c'
  },
  {
    id: 2,
    account: 'abcd',
    email: 'counselor@example.com',
    password: '123456',
    nickname: '咨询师小李',
    role: 'counselor',
    token: 'mock-token-counselor-2b7d9e'
  },
  {
    // 普通用户：登录后进用户端 /portal/home，不进管理后台
    id: 3,
    account: 'user',
    email: 'user@example.com',
    password: '123456',
    nickname: '小林',
    role: 'user',
    token: 'mock-token-user-5c1e4a'
  }
]

/**
 * 登录：POST /api/user/login
 * axios 实例不能当函数直接调用，必须用 .post()，或传配置对象 service({ url, method, data })
 * @param {{ account: string, password: string }} data
 */
export function login(data) {
  return service.post('/user/login', data)
}

/** 当前登录用户：GET /api/user/info */
export function getUserInfo() {
  return service.get('/user/info')
}

/** 退出登录：POST /api/user/logout */
export function logout() {
  return service.post('/user/logout')
}
