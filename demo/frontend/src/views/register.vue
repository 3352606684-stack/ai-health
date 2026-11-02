<!--
  注册页

  【待接入的后端接口】
    POST /api/user/register
      body: { account, email, nickname, phone, password }
      → { code:200, message:'ok' }

  当前阶段：只做前端校验 + 提示，不会真的创建账号。
  原因：账号表在 api/admin.js 里是写死的数组，运行时新增刷新就没了。

  后端就绪后，把 handleRegister 里标了「模拟」的两段换成：
      await register({ account, email, nickname, phone, password })
      ElMessage.success('注册成功，请登录')
      router.push({ path: '/auth/login', query: { account } })
  唯一性校验（账号/邮箱是否已被占用）也应交给后端，前端这份只是提前提示。

  样式不在这里写：标题、字段、按钮的外观都在 component/Authlayout.vue，
  用 :deep 统一下发，保证登录页和注册页严格一致。
-->
<template>
  <div class="form-inner">
    <h2 class="form-title">创建您的账户</h2>
    <p class="form-sub">请填写注册信息</p>

    <label class="field-label"><i class="req">*</i>用户名或邮箱</label>
    <el-input
      v-model="form.account"
      class="field-input"
      placeholder="请输入用户名或邮箱"
      clearable
      @keyup.enter="handleRegister"
    />

    <label class="field-label"><i class="req">*</i>邮箱</label>
    <el-input
      v-model="form.email"
      class="field-input"
      placeholder="请输入邮箱"
      clearable
      @keyup.enter="handleRegister"
    />

    <label class="field-label">昵称</label>
    <el-input
      v-model="form.nickname"
      class="field-input"
      placeholder="请输入昵称（可选）"
      clearable
      @keyup.enter="handleRegister"
    />

    <label class="field-label">手机号</label>
    <el-input
      v-model="form.phone"
      class="field-input"
      placeholder="请输入手机号（可选）"
      clearable
      @keyup.enter="handleRegister"
    />

    <label class="field-label"><i class="req">*</i>密码</label>
    <el-input
      v-model="form.password"
      class="field-input"
      type="password"
      placeholder="请输入密码"
      show-password
      @keyup.enter="handleRegister"
    />

    <label class="field-label"><i class="req">*</i>确认密码</label>
    <el-input
      v-model="form.confirm"
      class="field-input"
      type="password"
      placeholder="请再次输入密码"
      show-password
      @keyup.enter="handleRegister"
    />

    <el-button
      class="submit"
      type="primary"
      :loading="loading"
      @click="handleRegister"
    >
      创建用户
    </el-button>

    <p class="foot">
      已有账户？<router-link to="/auth/login">立即登录</router-link>
    </p>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
// 函数式组件不会被按需导入注入样式，这行不能删
import 'element-plus/es/components/message/style/css'
import { ADMIN_DATA } from '@/api/admin'

const router = useRouter()

const loading = ref(false)
const form = reactive({
  account: '',
  email: '',
  nickname: '',
  phone: '',
  password: '',
  confirm: ''
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^1[3-9]\d{9}$/

async function handleRegister() {
  const account = form.account.trim()
  const email = form.email.trim()
  const phone = form.phone.trim()
  const password = form.password

  // ① 逐项校验（与登录页保持一致：用 toast 提示，不引入 el-form 的 rules）
  if (!account) return ElMessage.warning('请输入用户名或邮箱')
  if (!email) return ElMessage.warning('请输入邮箱')
  if (!EMAIL_RE.test(email)) return ElMessage.warning('邮箱格式不正确')
  // 手机号选填，但填了就必须合法
  if (phone && !PHONE_RE.test(phone)) return ElMessage.warning('手机号格式不正确')
  if (!password) return ElMessage.warning('请输入密码')
  if (password.length < 6) return ElMessage.warning('密码至少 6 位')
  if (!form.confirm) return ElMessage.warning('请再次输入密码')
  if (password !== form.confirm) return ElMessage.warning('两次输入的密码不一致')

  loading.value = true
  try {
    // ② 【模拟】唯一性校验。后端也必须做一次，前端这份只是提前给提示
    const exists = ADMIN_DATA.some(
      (u) =>
        u.account.toLowerCase() === account.toLowerCase() ||
        (u.email || '').toLowerCase() === email.toLowerCase()
    )
    if (exists) {
      ElMessage.error('该账号或邮箱已被注册')
      return
    }

    // ③ 【模拟】假装网络耗时，让按钮的 loading 有反馈
    await new Promise((resolve) => setTimeout(resolve, 500))

    // ④ 注册成功 → 去登录页，并把账号带过去自动预填
    ElMessage.success('注册成功，请登录')
    router.push({ path: '/auth/login', query: { account } })
  } finally {
    loading.value = false
  }
}
</script>
