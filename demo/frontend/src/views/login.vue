<!--
  登录页

  【待接入的后端接口】
    POST /api/user/login     body: { account, password }  →  { token, user }

  本页只负责右半区的表单：
    左侧品牌区在 component/Authlayout.vue（布局层），切换登录/注册时不重建；
    标题、字段、按钮的样式也在那里用 :deep 统一，这里不再写 style。
-->
<template>
  <div class="form-inner">
    <h2 class="form-title">登录您的账户</h2>
    <p class="form-sub">请输入您的登录信息</p>

    <label class="field-label"><i class="req">*</i>用户名或邮箱</label>
    <el-input
      v-model="form.account"
      class="field-input"
      placeholder="请输入用户名或邮箱"
      clearable
      @keyup.enter="handleLogin"
    />

    <label class="field-label"><i class="req">*</i>密码</label>
    <el-input
      v-model="form.password"
      class="field-input"
      type="password"
      placeholder="请输入密码"
      show-password
      @keyup.enter="handleLogin"
    />

    <el-button
      class="submit"
      type="primary"
      :loading="loading"
      @click="handleLogin"
    >
      登录账户
    </el-button>

    <p class="foot">
      还没有账户？<router-link to="/auth/register">去注册</router-link>
    </p>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
// 函数式组件不会被按需导入注入样式，这行不能删
import 'element-plus/es/components/message/style/css'
import { ADMIN_DATA } from '@/api/admin'

const router = useRouter()
const route = useRoute()

// 注册成功后会跳到本页并带 ?account=xxx，这里预填，省得再敲一遍
const presetAccount = typeof route.query.account === 'string' ? route.query.account : ''

const loading = ref(false)
const form = reactive({
  account: presetAccount,
  password: ''
})

async function handleLogin() {
  const account = form.account.trim()
  const password = form.password

  // ① 前端校验
  if (!account) return ElMessage.warning('请输入用户名或邮箱')
  if (!password) return ElMessage.warning('请输入密码')

  loading.value = true
  try {
    // ② 先找账号：用户名和邮箱都能登录
    const user = ADMIN_DATA.find(
      (u) =>
        u.account.toLowerCase() === account.toLowerCase() ||
        (u.email || '').toLowerCase() === account.toLowerCase()
    )

    // ③ 账号不存在
    if (!user) {
      ElMessage.error('账号不存在')
      return
    }

    // ④ 再比密码（分开写才能给出精确提示）
    if (user.password !== password) {
      ElMessage.error('密码错误')
      return
    }

    // ⑤ 存凭证：把 password 剔掉再存，别把密码写进 localStorage
    const { password: _pwd, ...safeUser } = user
    localStorage.setItem('token', user.token)
    localStorage.setItem('userInfo', JSON.stringify(safeUser))

    // ⑥ 跳转：优先回被拦截的原页面；没有则按角色去各自的首页
    ElMessage.success(`欢迎回来，${user.nickname}`)
    const redirect = route.query.redirect
    const fallback = user.role === 'user' ? '/portal/home' : '/back/dashboard'
    router.push(typeof redirect === 'string' ? redirect : fallback)
  } finally {
    loading.value = false
  }
}
</script>
