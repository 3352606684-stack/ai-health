<!--
  前台占位页（AI咨询 / 情绪日记 / 知识库 尚未开发时使用）

  标题直接读路由 meta.title，所以一个文件可以服务多条路由，
  不用为每个未完成的页面各建一个空文件。
  真实页面做好后，把 router/index.js 里对应的 component 换掉即可。
-->
<template>
  <section class="coming">
    <div class="badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="#5f9d8d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 8v4.4l3 1.8" />
      </svg>
    </div>

    <h2 class="title">{{ title }}正在建设中</h2>
    <p class="desc">这块功能还没有开发，先回到首页看看其他内容吧。</p>

    <button class="back" @click="router.push('/portal/home')">返回首页</button>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const title = computed(() => route.meta.title || '该功能')
</script>

<style scoped>
.coming {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #f7f9f8;
  padding: 60px 24px;
  box-sizing: border-box;
}

.badge {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #e3ece8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  margin-bottom: 16px;
}

.badge svg {
  width: 100%;
  height: 100%;
}

.title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #1f2430;
}

.desc {
  margin: 8px 0 20px;
  font-size: 13px;
  color: #909399;
}

.back {
  height: 32px;
  padding: 0 16px;
  font-size: 13px;
  color: #ffffff;
  background: #5f9d8d;
  border: 1px solid #5f9d8d;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.back:hover {
  background: #548d7e;
  border-color: #548d7e;
}
</style>
