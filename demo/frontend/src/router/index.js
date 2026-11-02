import { createRouter, createWebHistory } from 'vue-router'
import Backendlayout from '../component/Backendlayout.vue'
import Authlayout from '../component/Authlayout.vue'
import Portallayout from '../component/Portallayout.vue'

// 路由配置
// 注意：children 的 path 不能以 / 开头，否则会被当成绝对路径（变成 /dashboard
// 而不是 /back/dashboard），导致 /back/dashboard 匹配不到 -> 页面空白。
const backendRoutes = [
  // 游客落地页：未登录也能访问（meta.public = true）
  // 它是网站的「门面」，不是登录后的首页 —— 登录后的首页在 /portal/home
  {
    path: '/',
    name: 'Welcome',
    component: () => import('../views/portal/Welcome.vue'),
    meta: { title: '欢迎', public: true }
  },
  {
    path: '/back',
    name: 'Backend',
    component: Backendlayout,
    redirect: '/back/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard.vue'),
        meta: { title: '数据分析' }
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('../views/knowledge.vue'),
        meta: { title: '知识文章' }
      },
      {
        path: 'consultation',
        name: 'Consultation',
        component: () => import('../views/consultation.vue'),
        meta: { title: '咨询管理' }
      },
      {
        path: 'emotion',
        name: 'EmotionalLogs',
        component: () => import('../views/emotionLog.vue'),
        meta: { title: '情绪日志' }
      }
    ]
  },
  // 前台（用户端）：顶部横向导航的访客界面，与后台 /back 完全独立
  {
    path: '/portal',
    name: 'Portal',
    component: Portallayout,
    redirect: '/portal/home',
    children: [
      {
        path: 'home',
        name: 'PortalHome',
        component: () => import('../views/portal/Home.vue'),
        meta: { title: '首页' }
      },
      // 下面三条是占位，共用 Coming.vue，标题取自 meta.title
      {
        path: 'chat',
        name: 'PortalChat',
        component: () => import('../views/portal/Chat.vue'),
        meta: { title: 'AI咨询' }
      },
      {
        path: 'diary',
        name: 'PortalDiary',
        component: () => import('../views/portal/Coming.vue'),
        meta: { title: '情绪日记' }
      },
      {
        path: 'library',
        name: 'PortalLibrary',
        component: () => import('../views/portal/Coming.vue'),
        meta: { title: '知识库' }
      }
    ]
  },
  {
    path: '/auth',
    component: Authlayout,
    children:[
      {
        path: 'login',
        name: 'Login',
        component: () => import('../views/login.vue'),
        meta: { title: '登录' }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('../views/register.vue'),
        meta: { title: '注册' }
      }
    ]
  },
  // 兜底：任何匹配不到的地址回落地页，避免手输错 URL 后白屏
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: backendRoutes
})

/*
  登录后该回哪个首页：按角色分流
    role === 'user' → 普通用户端 /portal/home
    其他（admin / counselor / 缺省）→ 管理后台 /back/dashboard
  注意：ADMIN_DATA 目前只有 admin 和 counselor，没有 role:'user' 的账号，
        所以现在还不会走到 /portal/home，等加了普通用户账号（或注册功能）才生效。
*/
function homePathByRole() {
  try {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}')
    return user.role === 'user' ? '/portal/home' : '/back/dashboard'
  } catch {
    return '/portal/home'
  }
}

// 全局前置守卫：默认全部需要登录，只有 meta.public 的页面放行
// 注意：to.meta 会把父路由的 meta 合并进来，所以 public 只能加在「没有登录要求的整组」上
router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const isAuthPage = to.path.startsWith('/auth')
  const isPublic = to.meta.public === true

  // ① 已登录还去登录/注册页：回各自的首页，不要重复登录
  if (token && isAuthPage) {
    return homePathByRole()
  }

  // ② 已登录访问落地页：直接进用户首页，避免看到「登录/注册」按钮
  if (token && to.path === '/') {
    return homePathByRole()
  }

  // ③ 未登录访问受保护页面：去登录页，并把原目标带上，登录成功后跳回来
  if (!token && !isAuthPage && !isPublic) {
    return { path: '/auth/login', query: { redirect: to.fullPath } }
  }

  // ④ 其余放行（游客看落地页、游客进登录页、已登录逛功能页）
  return true
})

export default router
