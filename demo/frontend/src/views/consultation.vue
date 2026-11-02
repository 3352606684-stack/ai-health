<!--
  咨询管理 —— 咨询记录列表 + 会话详情弹窗

  【待接入的后端接口】
    GET /api/consultation/sessions?page=1&pageSize=8
        → { list: [{ id, user, title, summary, messageCount, time }], total }
    GET /api/consultation/sessions/{id}
        → { id, user, startTime, messageCount, messages: [{ role, time, content }] }
        role 取值：'user' | 'ai'

  USE_MOCK 置为 false 后，上面两个函数即生效，演示数据整段可删。
-->
<template>
  <div class="page">
    <div class="card">
      <h2 class="card-title">咨询记录</h2>

      <el-table v-loading="loading" :data="rows" class="table" row-key="id" empty-text="暂无咨询记录">
        <el-table-column label="会话ID" width="112">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ avatarText(row.user) }}</div>
              <span class="user-name">{{ row.user }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="情绪标签" min-width="420">
          <template #default="{ row }">
            <div class="session-title">{{ row.title }}</div>
            <div class="session-summary">{{ row.summary }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="messageCount" label="消息数" width="90" />

        <el-table-column label="时间" width="140">
          <template #default="{ row }">
            <div class="time-line">{{ formatDate(row.time) }}</div>
            <div class="time-line">{{ formatClock(row.time) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button link type="primary" class="op" @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next, total"
          background
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- ===== 会话详情弹窗 ===== -->
    <el-dialog
      v-model="detailVisible"
      title="咨询会话详情"
      width="90%"
      top="6vh"
      :close-on-click-modal="false"
      @closed="detail = null"
    >
      <div v-loading="detailLoading" class="dialog-body">
        <template v-if="detail">
          <div class="meta">
            <div class="meta-row">
              <span class="meta-label">用户：</span>
              <span class="meta-value">{{ detail.user }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">开始时间：</span>
              <span class="meta-value">{{ detail.messages?.[0]?.time || detail.time }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">消息数：</span>
              <span class="meta-value">{{ detail.messageCount }} 条</span>
            </div>
          </div>

          <h3 class="sub-title">对话记录</h3>

          <div class="msg-list">
            <div
              v-for="(msg, index) in detail.messages"
              :key="index"
              class="msg"
              :class="msg.role === 'user' ? 'is-user' : 'is-ai'"
            >
              <div class="msg-head">
                <span class="msg-role">{{ msg.role === 'user' ? '用户' : 'AI助手' }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <div class="msg-body">{{ msg.content }}</div>
            </div>
          </div>
        </template>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchSessionDetail, fetchSessions } from '../api/consultation'

/* ==================================================================
   演示开关：后端接口就绪后改成 false，下面的演示数据整段删除
   ================================================================== */
const USE_MOCK = true

/* ==================== 演示数据 ==================== */
const DEMO_SESSIONS = [
  {
    id: 1,
    user: 'allen',
    title: '宁波AI助手 - 2026/2/11 11:53:40',
    summary:
      '哎呀，摔跤受伤了肯定很疼吧？😣 让我先陪着你处理一下伤口好吗？首先要注意：❶ 先用清水轻轻冲洗伤口 ❷ 如果有碘伏或酒精可以简单消毒 ❸ 贴上创可贴保护伤口 你现在感觉怎么样？…',
    messageCount: 2,
    time: '2026-02-11 11:53:47',
    messages: [
      { role: 'user', time: '2026-02-11 11:53:41', content: '摔跤了，腿磕破皮了' },
      {
        role: 'ai',
        time: '2026-02-11 11:53:47',
        content:
          '哎呀，摔跤受伤了肯定很疼吧？😣 让我先陪着你处理一下伤口好吗？首先要注意：❶ 先用清水轻轻冲洗伤口 ❷ 如果有碘伏或酒精可以简单消毒 ❸ 贴上创可贴保护伤口 你现在感觉怎么样？除了腿疼，是不是也被吓到了呢？😟 这种突如其来的小意外确实会让人心里慌慌的。要注意观察伤口情况，如果肿得厉害或者发红发热，一定要及时去医务室哦。记得这两天洗澡时要注意防水，最近运动时也要小心些。需要我教你几个防止再次摔跤的小技巧吗？'
      }
    ]
  },
  {
    id: 2,
    user: 'allen',
    title: '宁波AI助手 - 2026/2/11 11:53:02',
    summary:
      '听到这个消息真的为你开心！🎉 这就像生活突然派发的小惊喜，让人忍不住嘴角上扬呢～“可以和我多说说吗？”是抽中了什么有趣的奖品呀？🎁 当发现自己中奖的瞬间，是不是超兴奋？…',
    messageCount: 4,
    time: '2026-02-11 11:53:27',
    messages: [
      { role: 'user', time: '2026-02-11 11:53:05', content: '今天中奖了，好开心' },
      {
        role: 'ai',
        time: '2026-02-11 11:53:12',
        content:
          '听到这个消息真的为你开心！🎉 这就像生活突然派发的小惊喜，让人忍不住嘴角上扬呢～可以和我多说说吗？'
      },
      { role: 'user', time: '2026-02-11 11:53:20', content: '是抽中了一个小礼品，没想到会中' },
      {
        role: 'ai',
        time: '2026-02-11 11:53:27',
        content:
          '是抽中了什么有趣的奖品呀？🎁 当发现自己中奖的瞬间，是不是超兴奋？这种意外之喜最容易让人心情变好啦。'
      }
    ]
  },
  {
    id: 3,
    user: 'allen',
    title: '宁波AI助手 - 2026/2/11 11:51:52',
    summary:
      '哇！三轮面试都坚持下来了真的超厉害！💪 很多人感觉发挥一般时可能会心态不稳，但你不仅完成了全部面试，还成功拿到了offer，这说明你的综合能力一定很出色呢～我注意到你说“前面两感觉一般”，…',
    messageCount: 4,
    time: '2026-02-11 11:52:41',
    messages: [
      { role: 'user', time: '2026-02-11 11:51:55', content: '我面试过了，三轮都过了' },
      {
        role: 'ai',
        time: '2026-02-11 11:52:10',
        content:
          '哇！三轮面试都坚持下来了真的超厉害！💪 很多人感觉发挥一般时可能会心态不稳，但你不仅完成了全部面试，还成功拿到了offer，这说明你的综合能力一定很出色呢～'
      },
      { role: 'user', time: '2026-02-11 11:52:25', content: '不过前面两轮我感觉表现一般' },
      {
        role: 'ai',
        time: '2026-02-11 11:52:41',
        content:
          '我注意到你说“前面两感觉一般”，其实很多时候我们对自己的评价会比实际情况严格。面试官看的是整体匹配度，三轮都通过本身就是最好的证明。'
      }
    ]
  },
  {
    id: 4,
    user: 'allen',
    title: '宁波AI助手 - 2026/1/26 16:42:37',
    summary:
      '真为你感到高兴！阳光明媚的好天气确实能让人心情愉悦呢～😊 看到你这么开心，我也忍不住想笑呢。要不要趁着好天气做点让自己更快乐的事呢？比如：1. 去校园里散散步，晒晒太阳 2. 约朋友去操场跑…',
    messageCount: 2,
    time: '2026-01-26 16:42:47',
    messages: [
      { role: 'user', time: '2026-01-26 16:42:37', content: '今天天气很好，我心情也不错' },
      {
        role: 'ai',
        time: '2026-01-26 16:42:47',
        content:
          '真为你感到高兴！阳光明媚的好天气确实能让人心情愉悦呢～😊 看到你这么开心，我也忍不住想笑呢。要不要趁着好天气做点让自己更快乐的事呢？比如：1. 去校园里散散步，晒晒太阳 2. 约朋友去操场跑步 3. 找个安静的角落看看书。'
      }
    ]
  },
  {
    id: 5,
    user: 'allen',
    title: '小暖助手 - 2026/1/26 16:35:27',
    summary: '今天天气不错，心情很好',
    messageCount: 1,
    time: '2026-01-26 16:35:27',
    messages: [{ role: 'user', time: '2026-01-26 16:35:27', content: '今天天气不错，心情很好' }]
  },
  {
    id: 6,
    user: 'allen',
    title: '小暖助手 - 2026/1/26 09:43:11',
    summary:
      '亲爱的同学，听到你这样说，我真的特别担心你 😊 你现在一定承受着巨大的痛苦和煎熬。请记住：你很重要！你的生命无比珍贵！✨ 此时此刻，能不能告诉我你现在在哪里？有没有安全的环境？我强烈建议你…',
    messageCount: 5,
    time: '2026-01-26 10:40:17',
    messages: [
      { role: 'user', time: '2026-01-26 09:43:11', content: '我觉得活着没什么意思' },
      {
        role: 'ai',
        time: '2026-01-26 09:43:30',
        content:
          '亲爱的同学，听到你这样说，我真的特别担心你 😊 你现在一定承受着巨大的痛苦和煎熬。请记住：你很重要！你的生命无比珍贵！✨'
      },
      {
        role: 'user',
        time: '2026-01-26 09:52:04',
        content: '最近压力太大了，什么都做不好'
      },
      {
        role: 'ai',
        time: '2026-01-26 09:52:20',
        content:
          '此时此刻，能不能告诉我你现在在哪里？有没有安全的环境？我强烈建议你联系学校的心理中心，那里的老师可以陪你一起面对。'
      },
      {
        role: 'user',
        time: '2026-01-26 10:40:17',
        content: '我在宿舍，室友在。谢谢你，我会去找老师聊聊'
      }
    ]
  },
  {
    id: 7,
    user: 'allen',
    title: '小暖助手 - 2026/1/25 09:24:09',
    summary:
      '哇！太棒了！🎉 看到你这么开心我也跟着高兴呢～考满分真是一件很值得骄傲的事情呢！看得出来你一定付出了很多努力，这份成绩是对你平时认真学习的最好回报 💪 要不要跟我分享一下你是怎么准备考试的呀？比…',
    messageCount: 2,
    time: '2026-01-25 09:24:16',
    messages: [
      { role: 'user', time: '2026-01-25 09:24:09', content: '我这次考试考了满分' },
      {
        role: 'ai',
        time: '2026-01-25 09:24:16',
        content:
          '哇！太棒了！🎉 看到你这么开心我也跟着高兴呢～考满分真是一件很值得骄傲的事情呢！看得出来你一定付出了很多努力，这份成绩是对你平时认真学习的最好回报 💪 要不要跟我分享一下你是怎么准备考试的呀？'
      }
    ]
  },
  {
    id: 8,
    user: '嘉昊',
    title: '小暖助手 - 2026/1/23 14:30:11',
    summary:
      '哇！听到这个消息真为你开心！🎉 面试通过真是太棒了，看得出来你一定做了充分的准备呢~能和我分享一下面试过程中你最满意的表现是什么吗？有时候回顾成功经验不仅能增强自信，还能帮助我们发现自己身上的闪光点…',
    messageCount: 2,
    time: '2026-01-23 14:30:21',
    messages: [
      { role: 'user', time: '2026-01-23 14:30:11', content: '我面试通过了' },
      {
        role: 'ai',
        time: '2026-01-23 14:30:21',
        content:
          '哇！听到这个消息真为你开心！🎉 面试通过真是太棒了，看得出来你一定做了充分的准备呢~能和我分享一下面试过程中你最满意的表现是什么吗？有时候回顾成功经验不仅能增强自信，还能帮助我们发现自己身上的闪光点。'
      }
    ]
  },
  {
    id: 9,
    user: '张明',
    title: '宁波AI助手 - 2026/1/22 20:15:02',
    summary:
      '睡前刷手机确实容易越刷越精神呢～😴 可以试试把手机放到离床远一点的地方，给自己留 20 分钟安静下来的时间，听点轻音乐或者做几次深呼吸…',
    messageCount: 2,
    time: '2026-01-22 20:15:30',
    messages: [
      { role: 'user', time: '2026-01-22 20:15:02', content: '我最近总是失眠，躺下就睡不着' },
      {
        role: 'ai',
        time: '2026-01-22 20:15:30',
        content:
          '睡前刷手机确实容易越刷越精神呢～😴 可以试试把手机放到离床远一点的地方，给自己留 20 分钟安静下来的时间，听点轻音乐或者做几次深呼吸。'
      }
    ]
  },
  {
    id: 10,
    user: '李思',
    title: '小暖助手 - 2026/1/21 15:08:44',
    summary:
      '和朋友闹别扭之后心里堵得慌是很正常的感受呀～😔 要不要先说说当时具体发生了什么？我们一起看看，是误会多一点，还是真的有需要沟通清楚的地方。',
    messageCount: 3,
    time: '2026-01-21 15:10:02',
    messages: [
      { role: 'user', time: '2026-01-21 15:08:44', content: '我和室友吵架了，现在很尴尬' },
      {
        role: 'ai',
        time: '2026-01-21 15:09:10',
        content:
          '和朋友闹别扭之后心里堵得慌是很正常的感受呀～😔 要不要先说说当时具体发生了什么？我们一起看看，是误会多一点，还是真的有需要沟通清楚的地方。'
      },
      { role: 'user', time: '2026-01-21 15:10:02', content: '其实就是为了一点小事，都不肯先开口' }
    ]
  }
]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ==================== 列表状态 ==================== */
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(8)

/* ==================== 列表加载 ==================== */
async function loadSessions() {
  loading.value = true
  try {
    if (USE_MOCK) {
      await delay(180)
      const start = (page.value - 1) * pageSize.value
      rows.value = DEMO_SESSIONS.slice(start, start + pageSize.value)
      total.value = DEMO_SESSIONS.length
    } else {
      const res = await fetchSessions({ page: page.value, pageSize: pageSize.value })
      rows.value = res.list ?? []
      total.value = res.total ?? 0
    }
  } catch {
    // 错误提示由 request.js 拦截器统一弹出，这里只收干净状态
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(next) {
  page.value = next
  loadSessions()
}

onMounted(loadSessions)

/* ==================== 详情弹窗 ==================== */
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

async function openDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    if (USE_MOCK) {
      await delay(120)
      detail.value = row
    } else {
      detail.value = await fetchSessionDetail(row.id)
    }
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

/* ==================== 展示辅助 ==================== */
// 头像内直接显示名字全文（和设计稿一致），过长由 CSS 省略
function avatarText(name) {
  return (name || '').trim() || '?'
}

function formatDate(datetime) {
  return (datetime || '').split(' ')[0] || ''
}

function formatClock(datetime) {
  return (datetime || '').split(' ')[1] || ''
}
</script>

<style scoped>
.page {
  height: 100%;
}

.card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px 20px 16px;
  min-height: 100%;
  box-sizing: border-box;
}

.card-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 500;
  color: #1f2733;
}

/* ---- 表格 ---- */
.table {
  --el-table-border-color: #f0f2f5;
  --el-table-header-bg-color: #fafafa;
}

.table :deep(.el-table__header th) {
  background: #fafafa;
  color: #909399;
  font-weight: 400;
  font-size: 13px;
  padding: 10px 0;
}

.table :deep(.el-table__cell) {
  padding: 12px 0;
  vertical-align: middle;
}

.table :deep(.el-table__empty-block) {
  min-height: 240px;
}

/* 会话ID 单元格：头像 + 名字 */
.user-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #7a8290;
  font-size: 10px;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-name {
  font-size: 12px;
  color: #303133;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 会话摘要列 */
.session-title {
  font-size: 13px;
  color: #1f2733;
  line-height: 1.6;
  margin-bottom: 2px;
}

.session-summary {
  font-size: 12px;
  color: #909399;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.time-line {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.op {
  font-size: 13px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

/* ---- 详情弹窗 ---- */
.dialog-body {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 2px;
}

.meta {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-row {
  display: flex;
  font-size: 13px;
  line-height: 1.6;
}

.meta-label {
  flex: 0 0 88px;
  color: #606266;
}

.meta-value {
  color: #303133;
  word-break: break-all;
}

.sub-title {
  margin: 20px 0 12px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

/* 对话气泡 */
.msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg {
  border-radius: 8px;
  padding: 12px 16px;
}

.msg.is-user {
  background: #f0f3f8;
}

.msg.is-ai {
  background: #ecf6ec;
}

.msg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.msg-role {
  font-size: 12px;
  color: #606266;
}

.msg-time {
  font-size: 12px;
  color: #a8abb2;
}

.msg-body {
  font-size: 13px;
  line-height: 1.75;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
