<!--
  AI 咨询（前台用户端对话界面）

  布局：左侧三块状态卡（助手状态 / 情绪花园 / 会话历史）+ 右侧对话面板。

  ★ 所有会变化的数值都放在 reactive / ref 里，没有一个字是写死在模板上的。
    后端就绪后只需给下面这几个对象赋值，界面会自动刷新，模板一行都不用改：
      assistant  → 助手在线状态        （GET /api/ai/assistant 或轮询 / WebSocket 推送）
      mood       → 情绪花园的分数与建议（GET /api/emotion/today）
      sessions   → 会话历史列表        （GET /api/ai/sessions）
      messages   → 当前会话的消息      （GET /api/ai/sessions/{id}/messages）

  【待接入的后端接口】
    GET  /api/ai/assistant                      → { name, desc, online }
    GET  /api/emotion/today                     → { label, score, feeling, level, hint }
    GET  /api/ai/sessions                       → [{ id, title, time }]
    GET  /api/ai/sessions/{id}/messages         → [{ role:'user'|'ai', content, time }]
    POST /api/ai/sessions  { title, messages }  → { id }（新建会话时把当前对话归档）
    POST /api/ai/chat  { sessionId, content }   → 流式回复用 SSE / WebSocket
                                                     非流式则返回 { content, time }

  当前阶段：不发任何网络请求。发送消息时本地插入一条，800ms 后从 REPLIES 里回一条，
  用来验证气泡排版、滚动、字数统计和发送按钮的禁用状态。

  会话历史（已接通）：
    · 每轮问答结束时把当前对话写回左栏（`send()` 的 finally → `archiveCurrent()`）
    · 点历史条目 = 只读浏览：输入框禁用、不发任何请求、不消耗 token
      原因是接大模型后继续聊要把整段历史重新拼进请求体的 messages，越长越贵
    · 点「当前对话」那条 或 「返回当前对话」= 退出浏览，输入框解禁
-->
<template>
  <section class="ai-chat">
    <!-- ==================== 左栏 ==================== -->
    <aside class="side">
      <!-- ① 助手状态卡 -->
      <div class="card assistant">
        <div class="asst-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.5 11.6a7.9 7.9 0 0 1-8.5 7.9 8.6 8.6 0 0 1-3.4-.7L4 20.5l1.6-4.3a7.7 7.7 0 0 1-1-3.8 7.9 7.9 0 0 1 7.9-7.9h.6a7.9 7.9 0 0 1 7.4 7.1z" />
            <path d="M9.6 11.4h.01M14.4 11.4h.01" stroke-width="2.4" />
          </svg>
        </div>
        <p class="asst-name">{{ assistant.name }}</p>
        <p class="asst-status">
          <i class="dot" :class="{ 'is-on': assistant.online }"></i>
          {{ assistant.online ? '在线服务中' : '暂时离线' }}
        </p>
      </div>

      <!-- ② 情绪花园 -->
      <div class="card garden">
        <p class="card-title">情绪花园</p>

        <div class="ring" :style="{ '--score': mood.score + '%' }">
          <span class="ring-label">{{ mood.label }}</span>
          <span class="ring-score">{{ mood.score }}</span>
        </div>

        <p class="garden-feel">
          今天感觉 <b>{{ mood.feeling }}</b>
        </p>

        <div class="garden-stars">
          <svg
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ 'is-on': i <= mood.level }"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z" />
          </svg>
          <span class="star-text">{{ mood.levelText }}</span>
        </div>

        <div class="garden-tip">
          <svg class="tip-icon" viewBox="0 0 24 24" fill="none" stroke="#f0913c" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
          </svg>
          <div class="tip-body">
            <p class="tip-title">给你的小建议</p>
            <p class="tip-text">{{ mood.hint }}</p>
          </div>
        </div>
      </div>

      <!-- ③ 会话历史 -->
      <div class="card history">
        <p class="card-title">会话历史</p>

        <p v-if="!sessions.length" class="history-empty">暂无会话记录</p>
        <ul v-else class="history-list">
          <li
            v-for="s in sessions"
            :key="s.id"
            class="history-item"
            :class="{
              'is-active': s.id === currentSessionId,
              'is-viewing': s.id === viewingId
            }"
            @click="openSession(s.id)"
          >
            <span class="history-title">{{ s.title }}</span>
            <span class="history-time">{{ s.time }}</span>
          </li>
        </ul>
      </div>
    </aside>

    <!-- ==================== 右栏：对话面板 ==================== -->
    <div class="panel">
      <!-- 头部 -->
      <header class="panel-head">
        <div class="head-avatar">
          <svg viewBox="0 0 24 24" fill="#ffffff" stroke="none">
            <path d="M12 20.4s-7.6-4.7-7.6-9.6A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.6 2.6c0 4.9-7.6 9.6-7.6 9.6z" />
          </svg>
        </div>
        <div class="head-text">
          <p class="head-name">{{ assistant.name }}</p>
          <p class="head-sub">{{ assistant.desc }}</p>
        </div>
        <button class="head-add" title="新建会话" @click="newSession">
          <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </header>

      <!-- 消息区：只读浏览历史时渲染 displayMessages，不动正在进行的 messages -->
      <div ref="msgBox" class="messages">
        <div v-for="(m, i) in displayMessages" :key="i" class="msg" :class="`is-${m.role}`">
          <div v-if="m.role === 'ai'" class="msg-avatar">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.5 11.6a7.9 7.9 0 0 1-8.5 7.9 8.6 8.6 0 0 1-3.4-.7L4 20.5l1.6-4.3a7.7 7.7 0 0 1-1-3.8 7.9 7.9 0 0 1 7.9-7.9h.6a7.9 7.9 0 0 1 7.4 7.1z" />
              <path d="M9.6 11.4h.01M14.4 11.4h.01" stroke-width="2.4" />
            </svg>
          </div>

          <div class="msg-main">
            <div class="bubble">{{ m.text }}</div>
            <p class="msg-time">{{ m.time }}</p>
          </div>
        </div>

        <p v-if="sending && !streamHasText" class="typing">{{ assistant.name }} 正在输入…</p>
      </div>

      <!-- 输入区 -->
      <footer class="composer">
        <!-- 只读浏览条：明确告诉用户"现在只能看"，并给一条回到当前对话的路 -->
        <div v-if="isReadOnly" class="readonly-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="#c67a1c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3.2 1.9" />
          </svg>
          <span class="readonly-text">正在浏览历史会话，仅可查看</span>
          <button class="readonly-back" @click="exitPreview">返回当前对话</button>
        </div>

        <div class="input-wrap" :class="{ 'is-disabled': isReadOnly }">
          <textarea
            ref="inputEl"
            v-model="input"
            class="input"
            maxlength="500"
            :disabled="isReadOnly"
            :placeholder="isReadOnly ? '历史会话已结束，不能继续对话' : '请输入您想要分享的内容...'"
            @keydown.enter.exact.prevent="send"
          ></textarea>
          <button class="send" :class="{ 'is-stop': sending }" :disabled="isReadOnly || (!sending && !input.trim())"
            :title="isReadOnly ? '历史会话仅可查看' : sending ? '停止生成' : '发送'" @click="sending ? stopGenerate() : send()">
            <svg v-if="!sending" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 3L10.5 13.5" />
              <path d="M21 3l-6.6 18-3.9-8.4L2 8.7z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <rect x="7.5" y="7.5" width="9" height="9" rx="1.6" fill="#ffffff" />
            </svg>
          </button>

        </div>

        <div class="composer-foot">
          <span>{{ isReadOnly ? '仅浏览模式' : '按Enter发送，Shift+Enter换行' }}</span>
          <span>{{ input.length }}/500</span>
        </div>
      </footer>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 函数式组件不会被 unplugin 自动注入样式，必须手动引入，否则提示框会跑到左上角
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { streamChat } from '../../api/ai'


/*
  USE_MOCK：true 时不发网络请求，全部用本地数据。
  后端接口就绪后改 false，把 loadXxx 里的 else 分支打开即可。
*/
const USE_MOCK = false

/* ==================== ① 助手状态 ====================
   改 assistant.online = false，左侧绿点会变灰、文案变「暂时离线」 */
const assistant = reactive({
  name: '宁波AI助手',
  desc: '您的贴心AI心理健康助手',
  online: true
})

/* ==================== ② 情绪花园 ====================
   score 同时驱动圆环的角度（0~100）和中间的数字，
   level 是点亮几颗星（0~5），改这几个字段界面就变 */
const mood = reactive({
  label: '中性',
  score: 50,
  feeling: '很不错',
  level: 4,
  levelText: '一般',
  hint: '情绪状态平稳'
})

/* ==================== ③ 公共常量 ==================== */
/* 开场问候语：初始渲染、"新建会话"、演示历史三处共用，避免各写一份、改文案时漏改 */
const GREETING =
  '您好！我是小暖，您的AI心理健康助手。很高兴陪伴您，为您提供温暖的心理支持。请告诉我，今天您感觉怎么样？有什么想要分享的吗？'

/* ==================== ④ 会话历史 ====================
   一条历史 = { id, title, time, messages: [...] }
   这里只存"已归档"的会话；正在聊的永远是最下面的活动数组 messages。

     currentSessionId = null → 当前这段对话还没进历史（一条消息都还没发）
     dirty = true            → 有没写回历史的改动。每轮问答结束时 send() 会实时写回，
                               所以正常情况恒为 false，只作兜底（切换/新建时补写）

   这样"当前对话"永远等于列表里高亮的那一条：发第一条消息就入列表，聊一句时间就刷新。
   点其他几条只是只读浏览（见下方 viewingId），不会影响当前这段对话。 */
const MOCK_SESSIONS = [
  {
    id: 's-demo-1',
    title: '最近总是睡不着',
    time: '09:12',
    messages: [
      { role: 'ai', text: GREETING, time: '09:08' },
      { role: 'user', text: '最近总是睡不着，一躺下就开始想事情。', time: '09:09' },
      {
        role: 'ai',
        text: '听起来这段时间你的大脑很难真正休息下来。愿意说说，夜里想得最多的是哪一类事情吗？',
        time: '09:12'
      }
    ]
  },
  {
    id: 's-demo-2',
    title: '和室友闹了点矛盾',
    time: '昨天',
    messages: [
      { role: 'ai', text: GREETING, time: '昨天 20:31' },
      { role: 'user', text: '今天和室友吵架了，现在还在生气。', time: '昨天 20:32' },
      {
        role: 'ai',
        text: '生气的时候人是很难讲道理的。你愿意先说说，是什么把火点起来的吗？',
        time: '昨天 20:35'
      }
    ]
  }
]

/* 【模拟】接后端后这行换成 sessions.value = await fetchSessions() */
const sessions = ref(
  USE_MOCK ? MOCK_SESSIONS.map((s) => ({ ...s, messages: s.messages.map((m) => ({ ...m })) })) : []
)
const currentSessionId = ref(null)
const dirty = ref(false)

/* ---------- 只读浏览 ----------
   viewingId 非 null = 正在翻阅某条历史会话，此时输入框一律禁用。
   理由：接大模型后，继续聊意味着要把这段历史重新拼进请求体的 messages 发一遍，
   历史越长每轮越贵；只浏览不发任何请求，一个 token 都不花。
   注意浏览时消息渲染的是 viewMessages 副本，正在进行的 messages 原封不动。 */
const viewingId = ref(null)
const viewMessages = ref([])

const isReadOnly = computed(() => viewingId.value !== null)

/* 消息区渲染哪个数组：浏览历史看 viewMessages，正常聊天看 messages */
const displayMessages = computed(() => (isReadOnly.value ? viewMessages.value : messages.value))

/* ==================== ⑤ 消息 ==================== */
const messages = ref([greetingMsg()])

const input = ref('')
const sending = ref(false)
const msgBox = ref(null)
/* textarea 的引用：切换/新建会话后把光标放回去 */
const inputEl = ref(null)
/* 流式相关 */
let abortCtrl = null
let scrollTimer = null

/* 流式时每来一个字都滚底会抖，节流到 100ms 一次 */
function scrollSoon() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    scrollToBottom()
  }, 100)
}

/* 停止生成：中断 fetch，服务端会因为写失败自动收尾 */
function stopGenerate() {
  abortCtrl?.abort()
}

/* 流式气泡已经有字了就别再显示"正在输入…" */
const streamHasText = computed(() => {
  const last = messages.value[messages.value.length - 1]
  return !!(last && last.role === 'ai' && last.text)
})


/* 本地模拟回复池：接后端后整段删掉 */
const REPLIES = [
  '我在听，你可以慢慢说，不用着急。',
  '听起来这段时间对你来说不太容易。愿意多讲一点当时发生了什么吗？',
  '谢谢你愿意告诉我这些。你说的这些感受，其实很多人都会有。',
  '我理解你的感受。我们先一起试一次深呼吸，好吗？吸气 4 秒，停 2 秒，再慢慢呼出 6 秒。'
]
let replyIndex = 0

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function greetingMsg() {
  return { role: 'ai', text: GREETING, time: '刚刚' }
}

/* 历史条目标题：取第一条用户消息，超过 12 个字截断 —— 和主流 IM 的会话列表一致 */
function makeTitle(list) {
  const first = list.find((m) => m.role === 'user')
  if (!first) return '新的对话'
  const t = first.text.replace(/\s+/g, ' ').trim()
  return t.length > 12 ? `${t.slice(0, 12)}…` : t
}

/* 归档当前对话：没归档过的插到最前；已归档过的原地更新再置顶。
   返回是否真的写入，供调用方决定要不要提示 */
function archiveCurrent() {
  // 只有开场白、用户一个字没说 → 不值得占一条历史
  if (isBlankSession.value) return false

  const snap = {
    title: makeTitle(messages.value),
    time: nowText(),
    // 必须深拷贝：直接存 messages.value 会与活动数组共享同一个引用，
    // 之后在新会话里 push，历史里那条也会跟着变长
    messages: messages.value.map((m) => ({ ...m }))
  }

  const idx = sessions.value.findIndex((s) => s.id === currentSessionId.value)
  if (idx >= 0) {
    const old = sessions.value[idx]
    sessions.value.splice(idx, 1)
    /* title 保留旧值：标题只在会话第一次入库时由第一条用户消息生成，
       之后聊多少轮都不再变（否则列表里的名字会随着最后一句内容乱跳） */
    sessions.value.unshift({ ...old, ...snap, title: old.title })
  } else {
    const id = `s-${Date.now().toString(36)}`
    sessions.value.unshift({ id, ...snap })
    currentSessionId.value = id
  }

  dirty.value = false
  return true
}

async function scrollToBottom() {
  await nextTick()
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}

async function send() {
  // 双保险：输入框已 disabled，但 Enter / 脚本触发也要拦住
  if (isReadOnly.value) {
    ElMessage.info('历史会话仅支持查看，不能继续对话')
    return
  }

  const text = input.value.trim()
  if (!text || sending.value) return

  /* 进上下文的历史：只取最近 12 条，并且剔掉开场白。
     接大模型后这段就是 token 成本的主要来源，条数越大每轮越贵 */
  const history = messages.value
    .filter((m) => m.text && m.text !== GREETING)
    .slice(-12)
    .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }))

  messages.value.push({ role: 'user', text, time: nowText() })
  input.value = ''
  sending.value = true
  scrollToBottom()

  try {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 800))
      messages.value.push({
        role: 'ai',
        text: REPLIES[replyIndex % REPLIES.length],
        time: nowText()
      })
      replyIndex += 1
    } else {
      /* 先 push 一个空 AI 气泡占位，再拿到它的响应式引用。
         之所以 push 完再取，是因为 ref 深响应式里数组元素才是被代理的那份，
         直接改 push 前的原始对象有可能不触发更新 */
      messages.value.push({ role: 'ai', text: '', time: nowText() })
      const bubble = messages.value[messages.value.length - 1]

      abortCtrl = new AbortController()
      await streamChat({
        content: text,
        history,
        signal: abortCtrl.signal,
        onDelta: (_delta, full) => {
          bubble.text = full
          scrollSoon()
        },
        onError: (err) => {
          if (!bubble.text) bubble.text = '抱歉，我这边出了点问题，请稍后再试。'
          ElMessage.error(err.message || 'AI 服务暂时不可用')
        }
      })

      // 一个字都没吐出来（比如后端 500），撤掉空泡，别留个空框
      if (!bubble.text) messages.value.pop()
      else bubble.time = nowText()
    }
  } finally {
    abortCtrl = null
    sending.value = false
    dirty.value = true
    archiveCurrent()   // 流结束才写回历史，位置不用改
    scrollToBottom()
  }
}

/* 当前会话是否还是"空白"：只剩那条 AI 开场白，用户一个字都没说过。
   用 every 而不是只看长度，是为了防止以后 AI 主动连发两条时被误判成"非空" */
const isBlankSession = computed(
  () => messages.value.length <= 1 && messages.value.every((m) => m.role === 'ai')
)

/* 新建会话：① 把当前对话归档进左侧「会话历史」 ② 清空面板回到开场问候语
   三道保护缺一不可：
     ① AI 正在回复时禁止新建 —— 否则 800ms 后那条回复会 push 到新会话里，
        表现为"刚新建就冒出一句答非所问的 AI 消息"
     ② 当前已是空白会话时不再执行 —— 否则可以无限点，每次都重置一遍数组
     ③ 已有对话内容时先确认 —— 按钮在对话框右上角，很容易误触 */
async function newSession() {
  if (sending.value) {
    ElMessage.warning('请等待当前回复完成')
    return
  }

  if (isBlankSession.value) {
    ElMessage.info('当前已经是新对话了')
    return
  }

  try {
    await ElMessageBox.confirm('当前对话已保存在左侧「会话历史」，开启新对话不会影响它。', '新建会话', {
      confirmButtonText: '新建',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 点了取消或右上角关闭
  }

  // 兜底：正常情况下 send() 已经实时写回了，这里只在极端情况（如发送中途报错）补写一次
  if (dirty.value) archiveCurrent()

  // 如果此刻正在浏览历史，先退出只读，否则新对话会被历史内容挡住
  viewingId.value = null
  viewMessages.value = []

  currentSessionId.value = null
  messages.value = [greetingMsg()]
  input.value = ''
  dirty.value = false
  replyIndex = 0
  await scrollToBottom()
  // 新对话直接把光标放进输入框，不用再点一下
  inputEl.value?.focus()
}

/* 点历史条目：进入只读浏览（不拼模型上下文、不发请求、不消耗 token）
   点的是「当前对话」那条 → 直接退出浏览，回到可以继续输入的聊天状态 */
function openSession(id) {
  // 已经在看这条了，再点没意义
  if (id === viewingId.value) return

  // 点当前对话自己：等于"退出浏览"
  if (id === currentSessionId.value) {
    exitPreview()
    return
  }

  // 正在等回复时先别切，否则回复落到看不见的会话里，用户会以为丢了
  if (sending.value) {
    ElMessage.warning('请等待当前回复完成')
    return
  }

  const target = sessions.value.find((s) => s.id === id)
  if (!target) return

  /* 【待接】GET /api/ai/sessions/{id}/messages
     只读，所以拿到数据只填 viewMessages，绝不碰 messages / currentSessionId */
  viewingId.value = id
  viewMessages.value = target.messages.map((m) => ({ ...m }))
  scrollToBottom()
}

/* 退出只读浏览，回到当前对话（输入框随之解禁） */
function exitPreview() {
  if (!viewingId.value) return
  viewingId.value = null
  viewMessages.value = []
  scrollToBottom()
  nextTick(() => inputEl.value?.focus())
}

onMounted(() => {
  // 【待接】
  // else {
  //   const a = await fetchAssistant(); Object.assign(assistant, a)
  //   Object.assign(mood, await fetchTodayMood())
  //   sessions.value = await fetchSessions()
  // }
  scrollToBottom()
})
</script>

<style scoped>
.ai-chat {
  display: flex;
  justify-content: center;
  gap: 16px;
  width: 100%;
  /* 高度必须锁死在父级剩余空间，否则消息一多整个页面会被撑高，
     .messages 不再是滚动容器，新消息就会跑到屏幕外 */
  height: 100%;
  padding: 24px;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  background: #f7f8fa;
}

/* ==================== 左栏 ==================== */
.side {
  flex: 0 0 260px;
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(31, 36, 48, 0.04);
  box-sizing: border-box;
}

.card-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: #1f2430;
}

/* ① 助手状态 */
.assistant {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.asst-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #f2a13c;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 15px;
  box-sizing: border-box;
}

.asst-avatar svg {
  width: 100%;
  height: 100%;
}

.asst-name {
  margin: 12px 0 0;
  font-size: 13px;
  color: #1f2430;
}

.asst-status {
  margin: 6px 0 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #909399;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c8c9cc;
}

.dot.is-on {
  background: #4caf7d;
}

/* ② 情绪花园 */
.garden {
  padding: 16px;
  background: #fdf6ed;
}

.ring {
  position: relative;
  width: 76px;
  height: 76px;
  margin: 4px auto 0;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  background: conic-gradient(#f7acd0 var(--score), #f0d9e6 0);
}

.ring::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 50%;
  background: linear-gradient(160deg, #fbdbe9, #edcfe2);
}

.ring-label,
.ring-score {
  position: relative;
  z-index: 1;
  color: #8a5c74;
  line-height: 1.25;
}

.ring-label {
  font-size: 12px;
}

.ring-score {
  font-size: 15px;
  font-weight: 500;
}

.garden-feel {
  margin: 14px 0 0;
  text-align: center;
  font-size: 12px;
  color: #7a8290;
}

.garden-feel b {
  font-weight: 500;
  color: #1f2430;
}

.garden-stars {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}

.star {
  width: 12px;
  height: 12px;
  flex: 0 0 12px;
  fill: #e4e7ed;
}

.star.is-on {
  fill: #f2917c;
}

.star-text {
  margin-left: 4px;
  font-size: 11px;
  color: #a8abb2;
}

.garden-tip {
  margin-top: 14px;
  padding: 10px 12px;
  background: #ffffff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
}

.tip-body {
  min-width: 0;
}

.tip-title {
  margin: 0;
  font-size: 11px;
  color: #a8abb2;
}

.tip-text {
  margin: 3px 0 0;
  font-size: 12px;
  color: #4e5969;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ③ 会话历史 */
.history {
  flex: 1 1 auto;
  min-height: 110px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.history-empty {
  margin: auto;
  font-size: 12px;
  color: #c0c4cc;
}

.history-list {
  flex: 1 1 auto;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
  min-height: 0;
}

.history-item {
  padding: 8px 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.history-item:hover,
.history-item.is-active {
  background: #fdf6ed;
}

/* 正在浏览的那条：左侧橙色竖条。
   is-active 表示"当前正在进行的对话"，is-viewing 表示"正在翻阅的历史"，
   两者不会同时出现（点当前对话那条就等于退出浏览） */
.history-item.is-viewing {
  background: #fdf0dd;
  box-shadow: inset 2px 0 0 #f2a13c;
}

.history-title {
  font-size: 12px;
  color: #4e5969;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  flex: 0 0 auto;
  font-size: 11px;
  color: #c0c4cc;
}

/* ==================== 右栏：对话面板 ==================== */
.panel {
  flex: 0 1 940px;
  max-width: 940px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(31, 36, 48, 0.04);
}

.panel-head {
  flex: 0 0 auto;
  height: 64px;
  padding: 0 18px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(120deg, #f8b451, #ee9628);
}

.head-avatar {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 9px;
  box-sizing: border-box;
}

.head-avatar svg {
  width: 100%;
  height: 100%;
}

.head-text {
  min-width: 0;
}

.head-name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.head-sub {
  margin: 3px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.82);
}

.head-add {
  margin-left: auto;
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  padding: 5px;
  box-sizing: border-box;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.65);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.head-add:hover {
  background: rgba(255, 255, 255, 0.18);
}

.head-add svg {
  width: 100%;
  height: 100%;
}

/* 消息区 */
.messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msg.is-user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 50%;
  background: #f2a13c;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  box-sizing: border-box;
}

.msg-avatar svg {
  width: 100%;
  height: 100%;
}

.msg-main {
  max-width: 72%;
  min-width: 0;
}

.bubble {
  padding: 12px 14px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #f0f2f5;
  box-shadow: 0 1px 2px rgba(31, 36, 48, 0.03);
  font-size: 13.5px;
  line-height: 1.85;
  color: #1f2430;
  word-break: break-word;
  white-space: pre-wrap;
}

.msg.is-user .bubble {
  background: #fdf3e6;
  border-color: #f8e3c8;
}

.msg-time {
  margin: 6px 2px 0;
  font-size: 11px;
  color: #c0c4cc;
}

.msg.is-user .msg-time {
  text-align: right;
}

.typing {
  margin: 0;
  padding-left: 42px;
  font-size: 12px;
  color: #a8abb2;
}

/* 输入区 */
.composer {
  flex: 0 0 auto;
  padding: 12px 18px 14px;
  background: #ffffff;
}

/* 只读浏览条 */
.readonly-bar {
  margin-bottom: 10px;
  padding: 8px 10px 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  background: #fdf6ed;
  font-size: 12px;
  color: #8a6a45;
}

.readonly-bar svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
}

.readonly-text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.readonly-back {
  flex: 0 0 auto;
  padding: 4px 9px;
  border: 1px solid #f0d9b8;
  border-radius: 6px;
  background: #ffffff;
  color: #c67a1c;
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.readonly-back:hover {
  background: #fdf0dd;
  border-color: #e8c99b;
}

.input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  transition: border-color 0.15s;
}

.input-wrap:focus-within {
  border-color: #f2b877;
}

/* 只读态：整块输入区灰掉，视觉上就告诉用户"这里点不动" */
.input-wrap.is-disabled {
  background: #f7f8fa;
  border-color: #edeff2;
}

.input-wrap.is-disabled .send {
  background: #d9dce2;
  cursor: not-allowed;
}

.input {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 40px;
  max-height: 108px;
  padding: 10px 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  color: #1f2430;
}

.input::placeholder {
  color: #b5b9c2;
}

.input:disabled {
  color: #a8abb2;
  cursor: not-allowed;
}

.send {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  padding: 8px;
  box-sizing: border-box;
  border: none;
  border-radius: 9px;
  background: #f2a13c;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, opacity 0.15s;
}

.send:hover {
  background: #e89529;
}

.send:disabled {
  background: #f2a13c;
  opacity: 0.9;
  cursor: not-allowed;
}
/* 生成中：按钮变成"停止"，不给降透明度，否则看起来像点不动 */
.send.is-stop {
  background: #e89529;
}


.send svg {
  width: 100%;
  height: 100%;
}

.composer-foot {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #b5b9c2;
}

/* 窄屏：左栏压成两张等宽小卡，整体可滚，避免被 overflow 裁切 */
@media (max-width: 900px) {
  .ai-chat {
    padding: 12px;
    gap: 10px;
    flex-direction: column;
    overflow-y: auto;
  }

  .side {
    flex: 0 0 auto;
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 10px;
  }

  .side .card {
    flex: 1 1 0;
    min-width: 0;
  }

  .assistant {
    padding: 14px 10px;
  }

  .asst-avatar {
    width: 44px;
    height: 44px;
    padding: 12px;
  }

  .garden {
    padding: 12px;
  }

  .ring {
    width: 60px;
    height: 60px;
  }

  /* 窄屏也要能翻历史：整行铺开 + 限高滚动，不再整块隐藏。
     必须写 .side .history —— 上面 .side .card 的 flex 特异性更高，
     只写 .history 会被它压回三分之一宽，标题全被截成"和室…" */
  .side .history {
    flex: 1 1 100%;
    max-height: 132px;
    min-height: 96px;
  }

  /* 只占剩余空间：用 flex-basis 0 而不是 min-height 撑，
     否则「左栏高 + 68vh」会超过容器，输入框被顶到页脚下面 */
  .panel {
    flex: 1 1 0;
    max-width: none;
    min-height: 320px;
  }

  .msg-main {
    max-width: 84%;
  }
}
</style>
