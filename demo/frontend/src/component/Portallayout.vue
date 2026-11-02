<!--
  前台（用户端）布局：顶部导航 + 内容区 + 页脚

  与后台 Backendlayout 的区别：
    后台是「左侧菜单 + 顶栏」的管理界面；前台是「顶部横向导航」的访客界面，
    两者视觉语言完全不同，所以单独一个布局，互不干扰。

  要新增前台页面：在 router/index.js 的 /portal 分组里加一条 child，
  再把菜单项补到下面的 MENUS 数组即可。
-->
<template>
  <div class="portal">
    <!-- ===== 顶部导航 ===== -->
    <header class="nav">
      <div class="nav-inner">
        <a class="brand" @click="go('/portal/home')">
          <span class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="6.5" width="16" height="11" rx="3.5" />
              <path d="M12 6.5V4" />
              <circle cx="9.4" cy="11.6" r="1" fill="#ffffff" stroke="none" />
              <circle cx="14.6" cy="11.6" r="1" fill="#ffffff" stroke="none" />
              <path d="M2.2 10v4M21.8 10v4" />
            </svg>
          </span>
          <span class="brand-text">心理健康AI助手</span>
        </a>

        <nav class="nav-menu">
          <a
            v-for="item in MENUS"
            :key="item.path"
            class="nav-item"
            :class="{ 'is-active': isActive(item.path) }"
            @click="go(item.path)"
          >
            {{ item.label }}
          </a>

          <button class="logout" @click="handleLogout">退出登录</button>
        </nav>
      </div>
    </header>

    <!-- ===== 内容区 ===== -->
    <main class="main">
      <router-view />
    </main>

    <!-- ===== 页脚 ===== -->
    <footer class="footer">
      <span>© 2026 心理健康AI助手 · 保留所有权利</span>
    </footer>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 菜单与 /portal 下的子路由一一对应
const MENUS = [
  { label: '首页', path: '/portal/home' },
  { label: 'AI咨询', path: '/portal/chat' },
  { label: '情绪日记', path: '/portal/diary' },
  { label: '知识库', path: '/portal/library' }
]

function isActive(path) {
  return route.path === path
}

function go(path) {
  if (route.path !== path) router.push(path)
}

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/auth/login')
}
</script>

<style scoped>
.portal {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

/* ===== 导航 ===== */
.nav {
  flex: 0 0 64px;
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #f0f2f5;
  position: relative;
  z-index: 10;
}

.nav-inner {
  max-width: 1240px;
  height: 100%;
  margin: 0 auto;
  padding: 0 24px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.brand-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #5aa0ec, #3672c6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-sizing: border-box;
}

.brand-text {
  font-size: 15px;
  font-weight: 500;
  color: #1f2430;
  letter-spacing: 0.2px;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-item {
  font-size: 14px;
  color: #4e5969;
  cursor: pointer;
  transition: color 0.15s;
  white-space: nowrap;
}

.nav-item:hover,
.nav-item.is-active {
  color: #1f2430;
  font-weight: 500;
}

.logout {
  margin-left: 6px;
  height: 30px;
  padding: 0 14px;
  font-size: 13px;
  color: #606266;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.logout:hover {
  color: #3672c6;
  border-color: #a8c6ee;
}

/* ===== 内容区 ===== */
/*
  flex: 1 1 0（不是 1 1 auto）。
  basis 用 auto 时，item 的基准高度等于内容高度，页面内容一多，
  .main 就会被撑高、把内容顶出视口，子元素内部的 overflow-y: auto 永远不触发。
  basis 改成 0 后，高度只由「容器剩余空间」决定，页面内部才能各自滚动。
*/
.main {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* router-view 渲染的根元素撑满内容区（子组件根节点带父级 scope id，能命中） */
.main > :deep(*) {
  flex: 1 1 auto;
}

/* ===== 页脚 ===== */
.footer {
  flex: 0 0 56px;
  height: 56px;
  background: #262f3d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #8a93a3;
}
</style>
