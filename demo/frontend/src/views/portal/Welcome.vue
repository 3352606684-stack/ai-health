<!--
  游客落地页（未登录访问 `/` 看到的站点门面）

  与 views/portal/Home.vue 的区别：
    1. 本页路由带 meta.public = true，未登录也能访问；Home.vue 在 /portal 下，必须登录。
    2. 顶栏右侧是「登录 / 注册」两个按钮，不是用户菜单和退出登录。
    3. 中间两个按钮指向登录页，并把想去的地方塞进 redirect，
       登录成功后直接落到目标页（而不是登录完还要自己再点一次）。
    4. 已登录用户访问 `/` 会被全局守卫重定向走，不会停在这里看到「登录」按钮。

  两个主按钮的跳转目标：
    开始倾诉 → /auth/login?redirect=/portal/chat
    记录心情 → /auth/login?redirect=/portal/diary
-->
<template>
  <div class="welcome">
    <!-- ===== 顶部导航（游客态）===== -->
    <header class="nav">
      <div class="nav-inner">
        <a class="brand" @click="go('/')">
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

        <div class="nav-actions">
          <button class="btn-login" @click="go('/auth/login')">登录</button>
          <button class="btn-register" @click="go('/auth/register')">注册</button>
        </div>
      </div>
    </header>

    <!-- ===== 主视觉 ===== -->
    <section class="hero">
      <div class="hero-inner">
        <!-- 左：文案 -->
        <div class="copy">
          <h1 class="title">
            <span class="line">一次温暖的对话</span>
            <span class="line accent">化孤独为慰藉</span>
          </h1>

          <p class="desc">
            每个深夜，每个焦虑的时刻，我们都在这里。不必独自承受，让心与心的连接温暖您的每一天
          </p>

          <div class="cta">
            <button class="btn btn-solid" @click="goLogin('/portal/chat')">开始倾诉，获得陪伴</button>
            <button class="btn btn-ghost" @click="goLogin('/portal/diary')">记录心情，释放情感</button>
          </div>
        </div>

        <!-- 右：机器人 -->
        <div class="visual">
          <div class="halo">
            <svg class="robot" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <mask id="welcomeRobotMask">
                  <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                  <circle cx="39" cy="43" r="6.2" fill="#000000" />
                  <circle cx="61" cy="43" r="6.2" fill="#000000" />
                </mask>
              </defs>
              <g fill="#ffffff" mask="url(#welcomeRobotMask)">
                <rect x="47" y="6" width="6" height="13" rx="3" />
                <rect x="22" y="18" width="56" height="54" rx="15" />
                <rect x="12" y="34" width="7" height="20" rx="3.5" />
                <rect x="81" y="34" width="7" height="20" rx="3.5" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function go(path) {
  router.push(path)
}

/* 想去某个功能页 → 先登录，登录成功后由守卫/登录页把 redirect 用掉 */
function goLogin(redirect) {
  router.push({ path: '/auth/login', query: { redirect } })
}
</script>

<style scoped>
.welcome {
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

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-login,
.btn-register {
  height: 32px;
  padding: 0 20px;
  font-size: 13px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}

/* 绿底登录 */
.btn-login {
  background: #5f9d8d;
  color: #ffffff;
  border: 1px solid #5f9d8d;
}

.btn-login:hover {
  background: #558e80;
  border-color: #558e80;
}

/* 白底注册（描边保证在白色导航上可见） */
.btn-register {
  background: #ffffff;
  color: #5f9d8d;
  border: 1px solid #a9cec4;
}

.btn-register:hover {
  border-color: #5f9d8d;
  background: #f4faf8;
}

/* ===== 主视觉 ===== */
.hero {
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
  /* 同一色系的极缓渐变，替代纯色块，避免大面积死板（不可见明显边界） */
  background: linear-gradient(152deg, #64a392 0%, #5f9d8d 52%, #599688 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  box-sizing: border-box;
}

.hero-inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 690px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
}

/* ===== 左：文案 ===== */
.copy {
  max-width: 400px;
}

.title {
  margin: 0;
  font-size: 40px;
  font-weight: 500;
  line-height: 1.32;
  letter-spacing: 1.5px;
  color: #ffffff;
}

.title .line {
  display: block;
}

.title .accent {
  color: #d5df4a;
}

.desc {
  margin: 18px 0 0;
  max-width: 300px;
  font-size: 13px;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.82);
}

.cta {
  display: flex;
  gap: 12px;
  margin-top: 26px;
  flex-wrap: wrap;
}

.btn {
  height: 34px;
  padding: 0 16px;
  font-size: 13px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.18s;
  white-space: nowrap;
}

.btn-solid {
  background: #ffffff;
  color: #2b3d38;
  border: 1px solid #ffffff;
}

.btn-solid:hover {
  background: #f0f4f2;
  border-color: #f0f4f2;
}

.btn-ghost {
  background: transparent;
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.btn-ghost:hover {
  border-color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

/* ===== 右：机器人 ===== */
.visual {
  flex: 0 0 auto;
}

.halo {
  width: 216px;
  height: 216px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.robot {
  width: 120px;
  height: 120px;
}

/* ===== 小屏适配 ===== */
@media (max-width: 768px) {
  .hero-inner {
    flex-direction: column-reverse;
    gap: 36px;
    text-align: center;
  }

  .copy {
    max-width: 100%;
  }

  .title {
    font-size: 28px;
  }

  .desc {
    max-width: 100%;
    margin-left: auto;
    margin-right: auto;
  }

  .cta {
    justify-content: center;
  }

  .halo {
    width: 160px;
    height: 160px;
  }

  .robot {
    width: 70px;
    height: 70px;
  }
}
</style>
