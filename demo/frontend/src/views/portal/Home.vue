<!--
  用户端首页（登录后看到的「欢迎回来」页）

  和游客落地页 Welcome.vue 的区别：
    - 本页在 /portal 下，没有 meta.public，未登录访问会被守卫拦到登录页
    - 顶栏由 Portallayout 提供（含导航菜单 + 退出登录），页面本身只有内容
    - 两个按钮直接跳功能页，不需要再登录

  游客第一眼看到的落地页是 views/portal/Welcome.vue（路由 /），别改错文件。
-->
<template>
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
          <button class="btn btn-solid" @click="go('/portal/chat')">开始倾诉，获得陪伴</button>
          <button class="btn btn-ghost" @click="go('/portal/diary')">记录心情，释放情感</button>
        </div>
      </div>

      <!-- 右：机器人 -->
      <div class="visual">
        <div class="halo">
          <svg class="robot" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <mask id="heroRobotMask">
                <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                <circle cx="39" cy="43" r="6.2" fill="#000000" />
                <circle cx="61" cy="43" r="6.2" fill="#000000" />
              </mask>
            </defs>
            <g fill="#ffffff" mask="url(#heroRobotMask)">
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
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

function go(path) {
  router.push(path)
}
</script>

<style scoped>
.hero {
  position: relative;
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
