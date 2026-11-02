<!--
  登录 / 注册共用布局（/auth 的布局路由）

  ┌──────────────┬────────────────────┐
  │              │                    │
  │   品牌区      │   <router-view>    │
  │  （常驻）     │  login / register  │
  │              │                    │
  └──────────────┴────────────────────┘

  ★ 为什么品牌区放在这里，而不是做成 BrandPanel 组件塞进两个页面：
    布局路由在切换子路由时不会卸载，所以 login ↔ register 切换时，
    左半区 DOM 完全不动，视觉上只有右半区的表单在换。
    若做成组件分别放进两个页面，切换时它会跟着页面一起销毁重建，
    背景和 SVG 会重绘，看起来会闪一下。

  ★ 表单骨架样式也用 :deep 下发到这里：
    登录页和注册页的标题、字段、按钮必须严格一致，
    集中一处改一次就够，不用两边同步。
-->
<template>
  <div class="auth">
    <!-- ===== 左半区：品牌区（常驻，不随路由切换） ===== -->
    <section class="brand">
      <h1 class="brand-title">心理AI助手</h1>
      <p class="brand-sub">
        每个深夜，每个焦虑的时刻，我们都在这里。<br />
        不必独自承受，让心与心的连接温暖您的每一天
      </p>

      <div class="brand-badge">
        <svg viewBox="0 0 48 48" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="12" width="30" height="22" rx="7" />
          <path d="M24 12V7" />
          <circle cx="24" cy="5" r="1.9" fill="#ffffff" stroke="none" />
          <circle cx="19" cy="22" r="2.1" fill="#ffffff" stroke="none" />
          <circle cx="29" cy="22" r="2.1" fill="#ffffff" stroke="none" />
          <path d="M21 28h6" />
          <path d="M5 19v8M43 19v8" />
        </svg>
      </div>
    </section>

    <!-- ===== 右半区：子路由出口（只有这里随切换变化） ===== -->
    <div class="auth-body">
      <router-view />
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: flex;
  height: 100vh;
  background: #ffffff;
}

/* ===== 左：品牌区 ===== */
.brand {
  width: 44%;
  background: #5f9d8d;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 48px;
  box-sizing: border-box;
}

.brand-title {
  margin: 0 0 22px;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 1px;
}

.brand-sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.95;
  text-align: center;
  color: rgba(255, 255, 255, 0.92);
}

.brand-badge {
  width: 112px;
  height: 112px;
  margin-top: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.13);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-badge svg {
  width: 60px;
  height: 60px;
}

/* ===== 右：内容区 ===== */
.auth-body {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  /* 关键：不能用 center。两页表单高度差很多，
     垂直居中会让标题在切换时上下跳，固定上边距才稳 */
  align-items: flex-start;
  padding: 8vh 24px 40px;
  background: #ffffff;
  overflow-y: auto;
  box-sizing: border-box;
}

/* ===== 子页面共用的表单骨架（:deep 下发给 router-view 内的内容） ===== */
.auth-body :deep(.form-inner) {
  width: 320px;
}

.auth-body :deep(.form-title) {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: #1f2733;
  text-align: center;
}

.auth-body :deep(.form-sub) {
  margin: 12px 0 30px;
  font-size: 13px;
  color: #9aa0ac;
  text-align: center;
}

.auth-body :deep(.field-label) {
  display: block;
  font-size: 13px;
  color: #303133;
  margin-bottom: 8px;
}

.auth-body :deep(.req) {
  color: #f56c6c;
  font-style: normal;
  margin-right: 3px;
}

.auth-body :deep(.field-input) {
  margin-bottom: 18px;
}

.auth-body :deep(.field-input .el-input__wrapper) {
  height: 38px;
  border-radius: 6px;
}

.auth-body :deep(.submit) {
  width: 100%;
  height: 42px;
  margin-top: 6px;
  font-size: 14px;
  border-radius: 6px;
  background: #5b8ef5;
  border-color: #5b8ef5;
}

.auth-body :deep(.submit:hover) {
  background: #4a7cf0;
  border-color: #4a7cf0;
}

.auth-body :deep(.foot) {
  margin: 20px 0 0;
  font-size: 13px;
  color: #9aa0ac;
  text-align: center;
}

.auth-body :deep(.foot a) {
  color: #5b8ef5;
  text-decoration: none;
}

/* ===== 窄屏：隐藏品牌区，表单占满 ===== */
@media (max-width: 860px) {
  .brand {
    display: none;
  }

  .auth-body {
    padding-top: 6vh;
  }

  .auth-body :deep(.form-inner) {
    width: 100%;
    max-width: 340px;
  }
}
</style>
