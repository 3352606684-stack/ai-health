<template>
  <el-container class="layout">
    <!-- ===== 左侧导航栏 ===== -->
    <el-aside class="aside" :width="isCollapse ? '64px' : '200px'">
      <div class="logo">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3.5" y="5.5" width="17" height="12" rx="3" />
            <path d="M9 20.5h6" />
            <circle cx="9.2" cy="11.5" r="1" fill="#ffffff" stroke="none" />
            <circle cx="14.8" cy="11.5" r="1" fill="#ffffff" stroke="none" />
          </svg>
        </div>
        <div v-show="!isCollapse" class="logo-text">
          <div class="logo-title">心理健康AI助手</div>
          <div class="logo-sub">管理后台</div>
        </div>
      </div>

      <!-- 菜单由 menus 数组驱动，与 router 的 children 一一对应 -->
      <el-menu
        class="menu"
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
      >
        <el-menu-item v-for="item in menus" :key="item.path" :index="item.path">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- ===== 右侧内容区 ===== -->
    <el-container class="right">
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
          <span class="page-title">{{ pageTitle }}</span>
        </div>

        <el-dropdown trigger="click">
          <span class="user-box">
            <el-avatar :size="26" class="avatar">{{ avatarText }}</el-avatar>
            <span class="username">{{ displayName }}</span>
            <el-icon class="caret"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  ChatLineSquare,
  DataAnalysis,
  Expand,
  Fold,
  Message,
  User
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const isCollapse = ref(false)

// 登录成功后写入 localStorage，进入后台时读取一次（路由跳转会重新挂载本组件）
const userInfo = (() => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}')
  } catch {
    return {}
  }
})()

const displayName = userInfo.nickname || userInfo.account || '未登录'
const avatarText = (displayName.charAt(0) || 'A').toUpperCase()

function handleLogout() {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/auth/login')
}

const menus = [
  { path: '/back/dashboard', title: '数据分析', icon: DataAnalysis },
  { path: '/back/knowledge', title: '知识文章', icon: ChatLineSquare },
  { path: '/back/consultation', title: '咨询管理', icon: Message },
  { path: '/back/emotion', title: '情绪日志', icon: User }
]

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta?.title || '数据分析')
</script>

<style scoped>
.layout {
  height: 100%;
  overflow: hidden;
}

.aside {
  height: 100%;
  background: #fbfcff;
  border-right: 1px solid #eef0f5;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  overflow: hidden;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 15px;
  flex-shrink: 0;
}

.logo-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 9px;
  background: #2fb6c8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 7px;
  box-sizing: border-box;
}

.logo-text {
  overflow: hidden;
  white-space: nowrap;
}

.logo-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2430;
  line-height: 1.2;
}

.logo-sub {
  font-size: 11px;
  color: #9aa0ac;
  margin-top: 3px;
}

.menu {
  border-right: none;
  background: transparent;
  padding: 4px 10px;
  flex: 1;
}

.menu :deep(.el-menu-item) {
  height: 44px;
  line-height: 44px;
  border-radius: 8px;
  margin-bottom: 6px;
  color: #5c6270;
  font-size: 14px;
}

.menu :deep(.el-menu-item:hover) {
  background: #f2f4fa;
}

.menu :deep(.el-menu-item.is-active) {
  background: #eef0fe;
  color: #5b6ef5;
  font-weight: 500;
}

.menu :deep(.el-menu-item .el-icon) {
  font-size: 17px;
  width: 17px;
  margin-right: 10px;
  flex-shrink: 0;
}

/* ---- 折叠态：图标水平居中 ---- */
/* el-menu 折叠时自身宽度被 EP 固定成 64px（24 图标 + 20*2 内边距），
   但本组件的 .menu 有 10px 左右内边距、图标宽度又改成 17px，
   于是 item 内仍是 20px 左内边距 -> 图标整体右偏。
   这里把 item 的内边距清零，交给 flex 居中。 */
.menu.el-menu--collapse {
  padding: 4px 8px;
}

.menu.el-menu--collapse :deep(.el-menu-item) {
  padding: 0;
  justify-content: center;
}

.menu.el-menu--collapse :deep(.el-menu-item .el-icon) {
  margin-right: 0;
  width: auto;
}

/* 折叠时 EP 会在 item 内部再套一层 .el-menu-tooltip__trigger（用于悬停显示标题），
   这层同样带 padding: 0 20px，不清掉的话图标仍然右偏 */
.menu.el-menu--collapse :deep(.el-menu-tooltip__trigger) {
  padding: 0;
  width: 100%;
  justify-content: center;
}

/* ---- 顶栏 ---- */
.right {
  min-width: 0;
}

.header {
  height: 58px;
  background: #ffffff;
  border-bottom: 1px solid #eef0f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.toggle {
  font-size: 19px;
  color: #606266;
  cursor: pointer;
}

.page-title {
  font-size: 19px;
  font-weight: 600;
  color: #1f2430;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.avatar {
  background: #e8ecff;
  color: #5b6ef5;
  font-size: 13px;
}

.username {
  font-size: 14px;
  color: #303133;
}

.caret {
  font-size: 14px;
  color: #909399;
}

/* ---- 内容区 ---- */
.main {
  background: #f5f7fa;
  padding: 16px;
  overflow-y: auto;
}
</style>
