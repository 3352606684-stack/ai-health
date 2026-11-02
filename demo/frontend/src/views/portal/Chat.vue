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
    POST /api/ai/chat  { sessionId, content }   → 流式回复用 SSE / WebSocket
                                                     非流式则返回 { content, time }

  当前阶段：不发任何网络请求。发送消息时本地插入一条，800ms 后从 REPLIES 里回一条，
  用来验证气泡排版、滚动、字数统计和发送按钮的禁用状态。
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
            :class="{ 'is-active': s.id === currentSessionId }"
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

      <!-- 消息区 -->
      <div ref="msgBox" class="messages">
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="`is-${m.role}`">
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

        <p v-if="sending" class="typing">{{ assistant.name }} 正在输入…</p>
      </div>

      <!-- 输入区 -->
      <footer class="composer">
        <div class="input-wrap">
          <textarea
            v-model="input"
            class="input"
            maxlength="500"
            placeholder="请输入您想要分享的内容..."
            @keydown.enter.exact.prevent="send"
          ></textarea>

          <button
            class="send"
            :disabled="!input.trim() || sending"
            :title="sending ? '正在回复中' : '发送'"
            @click="send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 3L10.5 13.5" />
              <path d="M21 3l-6.6 18-3.9-8.4L2 8.7z" />
            </svg>
          </button>
        </div>

        <div class="composer-foot">
          <span>按Enter发送，Shift+Enter换行</span>
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

/*
  USE_MOCK：true 时不发网络请求，全部用本地数据。
  后端接口就绪后改 false，把 loadXxx 里的 else 分支打开即可。
*/
const USE_MOCK = true

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

/* ==================== ③ 会话历史 ==================== */
const sessions = ref([])
const currentSessionId = ref(null)

/* ==================== ④ 消息 ==================== */
/* 开场问候语：初始渲染和"新建会话"共用，避免两处各写一份、改文案时漏改 */
const GREETING =
  '您好！我是小暖，您的AI心理健康助手。很高兴陪伴您，为您提供温暖的心理支持。请告诉我，今天您感觉怎么样？有什么想要分享的吗？'

const messages = ref([{ role: 'ai', text: GREETING, time: '刚刚' }])

const input = ref('')
const sending = ref(false)
const msgBox = ref(null)

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

async function scrollToBottom() {
  await nextTick()
  if (msgBox.value) msgBox.value.scrollTop = msgBox.value.scrollHeight
}

async function send() {
  const text = input.value.trim()
  if (!text || sending.value) return

  messages.value.push({ role: 'user', text, time: nowText() })
  input.value = ''
  sending.value = true
  scrollToBottom()

  try {
    if (USE_MOCK) {
      // 【模拟】800ms 后回一条
      await new Promise((resolve) => setTimeout(resolve, 800))
      messages.value.push({
        role: 'ai',
        text: REPLIES[replyIndex % REPLIES.length],
        time: nowText()
      })
      replyIndex += 1
    } else {
      // 【待接】POST /api/ai/chat（或 WebSocket 推送）
      // 真实场景把接口返回的消息 push 进 messages 即可
    }
  } finally {
    // 必须放在 finally：接后端后如果接口报错、或 USE_MOCK 改成 false，
    // sending 不在这里复位就会永久为 true —— 发送按钮和"新建会话"会一起被锁死
    sending.value = false
    scrollToBottom()
  }
}

/* 当前会话是否还是"空白"：只剩那条 AI 开场白，用户一个字都没说过。
   用 every 而不是只看长度，是为了防止以后 AI 主动连发两条时被误判成"非空" */
const isBlankSession = computed(
  () => messages.value.length <= 1 && messages.value.every((m) => m.role === 'ai')
)

/* 新建会话：清空当前对话，回到开场问候语
   三道保护缺一不可：
     ① AI 正在回复时禁止新建 —— 否则 800ms 后那条回复会 push 到新会话里，
        表现为"刚新建就冒出一句答非所问的 AI 消息"
     ② 当前已是空白会话时不再执行 —— 否则可以无限点，每次都重置一遍数组
     ③ 已有对话内容时先确认 —— 点击按钮在对话框右上角，很容易误触，
        而当前是 mock 阶段没有任何持久化，清掉就真的没了 */
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
    await ElMessageBox.confirm('新建会话会清空当前对话内容，确定继续吗？', '新建会话', {
      confirmButtonText: '新建',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 点了取消或右上角关闭
  }

  // 【待接】POST /api/ai/sessions —— 先把当前会话存进历史，再清空
  currentSessionId.value = null
  messages.value = [{ role: 'ai', text: GREETING, time: '刚刚' }]
  input.value = ''
  replyIndex = 0
  await scrollToBottom()
}

function openSession(id) {
  // 【待接】GET /api/ai/sessions/{id}/messages
  currentSessionId.value = id
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

  /* 会话历史在窄屏先不占位置，等真有多条记录再考虑放进抽屉 */
  .history {
    display: none;
  }

  /* 只占剩余空间：用 flex-basis 0 而不是 min-height 撑，
     否则「左栏高 + 68vh」会超过容器，输入框被顶到页脚下面 */
  .panel {
    flex: 1 1 0;
    max-width: none;
    min-height: 0;
  }

  .msg-main {
    max-width: 84%;
  }
}
</style>
