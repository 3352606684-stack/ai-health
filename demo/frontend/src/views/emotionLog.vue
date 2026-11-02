<!--
  情绪日志 —— 日志列表（查询 / 重置 / 详情 / 删除）+ 情绪日记详情弹窗

  【待接入的后端接口】
    GET    /api/emotion/logs?page=1&pageSize=8&userId=&scoreRange=
        → { list: [{ id, user, userId, nickname, date, score, sleep, pressure,
                     trigger, content, emotion, aiEmotion, intensity,
                     riskLevel, nature, advice, riskDesc, improve }], total }
        scoreRange 取值：high(8-10) | mid(5-7) | low(1-4)，空串表示不限
    GET    /api/emotion/logs/{id}
        → 单条完整记录（字段同上）
    DELETE /api/emotion/logs/{id}
        → { code:200 }  删除成功

  USE_MOCK 置为 false 后，上面三个函数即生效，演示数据整段可删。
-->
<template>
  <div class="page">
    <div class="card">
      <h2 class="card-title">情绪日志</h2>

      <!-- ===== 查询条件 ===== -->
      <div class="filters">
        <label class="field">
          <span class="field-label">用户ID</span>
          <el-input
            v-model="queryForm.userId"
            class="field-input"
            placeholder="请输入用户ID"
            clearable
            @keyup.enter="handleSearch"
          />
        </label>

        <label class="field">
          <span class="field-label">情绪评分</span>
          <el-select
            v-model="queryForm.scoreRange"
            class="field-input"
            placeholder="选择评分范围"
            clearable
          >
            <el-option
              v-for="item in SCORE_RANGES"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </label>
      </div>

      <div class="actions">
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <!-- ===== 列表 ===== -->
      <el-table
        v-loading="loading"
        :data="rows"
        class="table"
        row-key="id"
        stripe
        empty-text="暂无情绪记录"
      >
        <el-table-column prop="id" label="ID" width="76" />

        <el-table-column label="会话ID" width="110">
          <template #default="{ row }">
            <div class="avatar" :title="row.user">{{ avatarText(row.user) }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="date" label="记录日期" width="130" />

        <el-table-column label="情绪评分" width="176">
          <template #default="{ row }">
            <div class="stars">
              <svg
                v-for="i in 10"
                :key="i"
                class="star"
                :class="{ on: i <= row.score }"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z" />
              </svg>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="生活指标" width="120">
          <template #default="{ row }">
            <div class="metric">睡眠: {{ row.sleep }}/5</div>
            <div class="metric">压力: {{ row.pressure }}/5</div>
          </template>
        </el-table-column>

        <el-table-column prop="trigger" label="情绪触发因素" min-width="170" show-overflow-tooltip />

        <el-table-column prop="content" label="日记内容" min-width="160" show-overflow-tooltip />

        <el-table-column label="操作" width="112" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" class="op" @click="openDetail(row)">详情</el-button>
            <el-button link type="danger" class="op" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          small
          background
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- ===== 情绪日记详情 ===== -->
    <el-dialog
      v-model="detailVisible"
      title="情绪日记详情"
      width="82%"
      top="5vh"
      :close-on-click-modal="false"
      class="log-dialog"
      @closed="detail = null"
    >
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detail">
          <!-- 用户信息 -->
          <section class="block">
            <h4 class="block-title">用户信息</h4>
            <div class="kv">
              <div class="k">用户名</div>
              <div class="v">{{ detail.user }}</div>
              <div class="k">昵称</div>
              <div class="v">{{ detail.nickname }}</div>

              <div class="k">用户ID</div>
              <div class="v">{{ detail.userId }}</div>
              <div class="k">记录日期</div>
              <div class="v">{{ detail.date }}</div>
            </div>
          </section>

          <!-- 情绪状态 -->
          <section class="block">
            <h4 class="block-title">情绪状态</h4>
            <div class="kv">
              <div class="k">情绪评分</div>
              <div class="v">
                <div class="score-cell">
                  <div class="stars">
                    <svg
                      v-for="i in 10"
                      :key="i"
                      class="star"
                      :class="{ on: i <= detail.score }"
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      aria-hidden="true"
                    >
                      <path d="M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z" />
                    </svg>
                  </div>
                  <span class="score-num">{{ detail.score }}</span>
                </div>
              </div>
              <div class="k">主要情绪</div>
              <div class="v">
                <span class="tag" :class="tagClass(detail.emotion)">{{ detail.emotion }}</span>
              </div>

              <div class="k">睡眠质量</div>
              <div class="v">{{ detail.sleep }}/5</div>
              <div class="k">压力水平</div>
              <div class="v">{{ detail.pressure }}/5</div>
            </div>
          </section>

          <!-- 日记内容 -->
          <section class="block">
            <h4 class="block-title">日记内容</h4>
            <div class="kv">
              <div class="k">情绪触发因素</div>
              <div class="v">{{ detail.trigger }}</div>
              <div class="k">日记内容</div>
              <div class="v">{{ detail.content }}</div>
            </div>
          </section>

          <!-- AI 情绪分析结果 -->
          <section class="block">
            <h4 class="block-title">AI情绪分析结果</h4>
            <div class="kv">
              <div class="k">主要情绪</div>
              <div class="v">
                <span class="tag" :class="tagClass(detail.aiEmotion)">{{ detail.aiEmotion }}</span>
              </div>
              <div class="k">情绪强度</div>
              <div class="v">
                <div class="intensity">
                  <div class="bar">
                    <div class="bar-fill" :style="{ width: detail.intensity + '%' }"></div>
                  </div>
                  <span class="bar-text">{{ detail.intensity }}%</span>
                </div>
              </div>

              <div class="k">风险等级</div>
              <div class="v">
                <span class="tag" :class="tagClass(detail.riskLevel)">{{ detail.riskLevel }}</span>
              </div>
              <div class="k">情绪性质</div>
              <div class="v">
                <span class="tag" :class="tagClass(detail.nature)">{{ detail.nature }}</span>
              </div>
            </div>
          </section>

          <!-- 建议区 -->
          <div class="advice-list">
            <div class="advice">
              <div class="advice-title">专业建议</div>
              <div class="advice-body">{{ detail.advice }}</div>
            </div>
            <div class="advice">
              <div class="advice-title">风险描述</div>
              <div class="advice-body">{{ detail.riskDesc }}</div>
            </div>
            <div class="advice">
              <div class="advice-title">改善建议</div>
              <div class="advice-body">{{ detail.improve }}</div>
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 函数式组件不会被按需导入插件注入样式，这两行不能删
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import { deleteLog, fetchLogDetail, fetchLogs } from '../api/emotion'

/* ==================================================================
   演示开关：后端接口就绪后改成 false，下面的演示数据整段删除
   ================================================================== */
const USE_MOCK = true

const SCORE_RANGES = [
  { value: 'high', label: '高分（8-10）' },
  { value: 'mid', label: '中等（5-7）' },
  { value: 'low', label: '低分（1-4）' }
]

/* ==================== 演示数据 ==================== */
const DEMO_LOGS = [
  {
    id: 31,
    user: 'allen',
    userId: 5,
    nickname: 'allen',
    date: '2026-01-29',
    score: 10,
    sleep: 3,
    pressure: 1,
    trigger: '无事发生',
    content: '风平浪静',
    emotion: '平静',
    aiEmotion: '中性',
    intensity: 50,
    riskLevel: '正常',
    nature: '正面情绪',
    advice: '情绪状态平稳，慢慢来就好',
    riskDesc: '当前情绪状态稳定，无需特别关注',
    improve: '保持规律作息，每天固定时间记录一次，有助于看清自己的情绪节律。'
  },
  {
    id: 30,
    user: 'allen',
    userId: 5,
    nickname: 'allen',
    date: '2026-01-21',
    score: 10,
    sleep: 4,
    pressure: 3,
    trigger: '彩票中奖了',
    content: '开心',
    emotion: '开心',
    aiEmotion: '正面',
    intensity: 72,
    riskLevel: '正常',
    nature: '正面情绪',
    advice: '这份喜悦值得被记住，可以写清楚当时发生了什么。',
    riskDesc: '情绪积极，未发现风险信号',
    improve: '把开心的细节具体记录下来，情绪低落时回看会有帮助。'
  },
  {
    id: 29,
    user: 'luna',
    userId: 8,
    nickname: '小鹿',
    date: '2026-01-28',
    score: 6,
    sleep: 2,
    pressure: 4,
    trigger: '项目上线前加班',
    content: '有点焦虑，晚上睡不着',
    emotion: '焦虑',
    aiEmotion: '负面',
    intensity: 68,
    riskLevel: '关注',
    nature: '负面情绪',
    advice: '焦虑多来自对结果的担忧，可以先拆解成能立刻动手的小步骤。',
    riskDesc: '近期睡眠不足且压力偏高，建议持续观察一周',
    improve: '睡前 30 分钟离开屏幕，用深呼吸或身体扫描帮助入睡。'
  },
  {
    id: 28,
    user: 'kevin',
    userId: 12,
    nickname: '凯文',
    date: '2026-01-26',
    score: 3,
    sleep: 1,
    pressure: 5,
    trigger: '和家人争吵',
    content: '很累，什么都不想做',
    emotion: '低落',
    aiEmotion: '负面',
    intensity: 84,
    riskLevel: '预警',
    nature: '负面情绪',
    advice: '这段时间对自己要求可以放低一些，先保证吃饭和睡眠。',
    riskDesc: '情绪强度较高且伴随明显压力，建议尽快联系咨询师',
    improve: '尝试把想说的话写下来，或约一次线下咨询把情绪说出来。'
  },
  {
    id: 27,
    user: 'allen',
    userId: 5,
    nickname: 'allen',
    date: '2026-01-24',
    score: 8,
    sleep: 4,
    pressure: 2,
    trigger: '散步时看到落日',
    content: '心情不错',
    emotion: '轻松',
    aiEmotion: '正面',
    intensity: 45,
    riskLevel: '正常',
    nature: '正面情绪',
    advice: '自然环境对情绪有稳定的正向作用，可以保持这个习惯。',
    riskDesc: '无风险信号',
    improve: '把让你感到放松的场景拍下来，做成一个小小的收藏夹。'
  },
  {
    id: 26,
    user: 'mia',
    userId: 15,
    nickname: '米娅',
    date: '2026-01-22',
    score: 5,
    sleep: 3,
    pressure: 3,
    trigger: '考试临近',
    content: '紧张但也还行',
    emotion: '紧张',
    aiEmotion: '中性',
    intensity: 58,
    riskLevel: '关注',
    nature: '中性情绪',
    advice: '适度的紧张有助于发挥，重点是把复习拆成可完成的小块。',
    riskDesc: '情绪波动在正常范围内',
    improve: '每复习 45 分钟起身活动 5 分钟，避免长时间紧绷。'
  },
  {
    id: 25,
    user: '嘉昊',
    userId: 21,
    nickname: '嘉昊',
    date: '2026-01-19',
    score: 7,
    sleep: 4,
    pressure: 2,
    trigger: '朋友约饭',
    content: '聊得挺开心的',
    emotion: '愉快',
    aiEmotion: '正面',
    intensity: 52,
    riskLevel: '正常',
    nature: '正面情绪',
    advice: '稳定的社交联系是情绪的重要支撑，值得持续维护。',
    riskDesc: '无风险信号',
    improve: '记录下这次聊得最好的一个话题，下次可以再深入聊。'
  },
  {
    id: 24,
    user: 'luna',
    userId: 8,
    nickname: '小鹿',
    date: '2026-01-16',
    score: 4,
    sleep: 2,
    pressure: 4,
    trigger: '连续几天失眠',
    content: '白天没精神，容易烦躁',
    emotion: '烦躁',
    aiEmotion: '负面',
    intensity: 76,
    riskLevel: '关注',
    nature: '负面情绪',
    advice: '睡眠是情绪的底盘，优先解决入睡困难，比调节情绪更有效。',
    riskDesc: '连续多日睡眠不足，建议留意是否形成恶性循环',
    improve: '固定起床时间比固定入睡时间更有效，先从这个开始。'
  }
]

let demoData = [...DEMO_LOGS]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ==================== 查询条件 ==================== */
// queryForm 是输入框绑定的草稿值；filters 是点击「查询」后才生效的值。
// 分开的好处：用户边打字边改，列表不会跟着乱跳。
const queryForm = reactive({ userId: '', scoreRange: '' })
const filters = reactive({ userId: '', scoreRange: '' })

/* ==================== 列表状态 ==================== */
const loading = ref(false)
const rows = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(8)

/* 演示模式下在前端做筛选，后端模式下把条件交给接口 */
function applyFilters(list) {
  const keyword = filters.userId.trim().toLowerCase()
  return list.filter((item) => {
    if (keyword) {
      const hitId = String(item.userId).includes(keyword)
      const hitName = (item.user || '').toLowerCase().includes(keyword)
      if (!hitId && !hitName) return false
    }
    if (filters.scoreRange === 'high' && item.score < 8) return false
    if (filters.scoreRange === 'mid' && (item.score < 5 || item.score > 7)) return false
    if (filters.scoreRange === 'low' && item.score > 4) return false
    return true
  })
}

async function loadLogs() {
  loading.value = true
  try {
    if (USE_MOCK) {
      await delay(160)
      const filtered = applyFilters(demoData)
      const start = (page.value - 1) * pageSize.value
      rows.value = filtered.slice(start, start + pageSize.value)
      total.value = filtered.length

      // 删掉当前页最后一条时，自动回退一页，避免停在空白页
      if (rows.value.length === 0 && page.value > 1) {
        page.value -= 1
        const nextStart = (page.value - 1) * pageSize.value
        rows.value = filtered.slice(nextStart, nextStart + pageSize.value)
      }
    } else {
      const res = await fetchLogs({
        page: page.value,
        pageSize: pageSize.value,
        userId: filters.userId,
        scoreRange: filters.scoreRange
      })
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

function handleSearch() {
  Object.assign(filters, {
    userId: queryForm.userId,
    scoreRange: queryForm.scoreRange
  })
  page.value = 1
  loadLogs()
}

function handleReset() {
  Object.assign(queryForm, { userId: '', scoreRange: '' })
  Object.assign(filters, { userId: '', scoreRange: '' })
  page.value = 1
  loadLogs()
}

function handlePageChange(next) {
  page.value = next
  loadLogs()
}

onMounted(loadLogs)

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
      detail.value = { ...row }
    } else {
      detail.value = await fetchLogDetail(row.id)
    }
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

/* ==================== 删除 ==================== */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除「${row.user} · ${row.date}」这条情绪记录吗？删除后不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )
  } catch {
    return // 用户点了取消或关闭，静默返回
  }

  try {
    if (USE_MOCK) {
      await delay(160)
      demoData = demoData.filter((item) => item.id !== row.id)
    } else {
      await deleteLog(row.id)
    }
    ElMessage.success('删除成功')
    await loadLogs()
  } catch {
    // 失败提示已由 request.js 拦截器弹出
  }
}

/* ==================== 展示辅助 ==================== */
function avatarText(name) {
  return (name || '').trim() || '?'
}

// 标签配色：正面 / 负面 / 风险等级各一套
function tagClass(text) {
  const value = (text || '').trim()
  if (['正常', '正面', '正面情绪', '中性'].includes(value)) {
    return value === '中性' ? 'is-gray' : 'is-success'
  }
  if (['关注', '预警', '负面', '负面情绪'].includes(value)) {
    return value === '关注' ? 'is-warning' : 'is-danger'
  }
  return 'is-gray'
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
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 500;
  color: #1f2733;
}

/* ---- 查询条件 ---- */
.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.field-input {
  width: 210px;
}

.actions {
  display: flex;
  gap: 10px;
  margin: 14px 0 6px;
}

/* ---- 表格 ---- */
.table {
  --el-table-border-color: #f0f2f5;
  --el-table-header-bg-color: #fafafa;
}

.table :deep(.el-table__header th) {
  background: #fafafa;
  color: #606266;
  font-weight: 400;
  font-size: 13px;
  padding: 10px 0;
}

.table :deep(.el-table__cell) {
  padding: 11px 0;
  vertical-align: middle;
  font-size: 13px;
  color: #303133;
}

.table :deep(.el-table__empty-block) {
  min-height: 240px;
}

/* 会话ID 单元格：灰色圆内显示用户名 */
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #e9ecf2;
  color: #7a8290;
  font-size: 10px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0 3px;
  box-sizing: border-box;
}

/* ---- 星星 ---- */
.stars {
  display: flex;
  align-items: center;
  gap: 2px;
}

.star {
  fill: #e4e7ed;
  flex-shrink: 0;
}

.star.on {
  fill: #f7ba2a;
}

/* ---- 生活指标 ---- */
.metric {
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.op + .op {
  margin-left: 12px;
}

/* ---- 分页 ---- */
.pager {
  display: flex;
  justify-content: flex-start;
  padding: 14px 0 2px;
}

.pager :deep(.el-pagination.is-background .btn-prev),
.pager :deep(.el-pagination.is-background .btn-next),
.pager :deep(.el-pagination.is-background .el-pager li) {
  background: transparent;
  color: #606266;
  font-weight: 400;
  min-width: 26px;
  height: 26px;
  line-height: 26px;
}

/* 当前页也去掉蓝底，改成深色文字（和设计稿的「‹ 1 ›」一致） */
.pager :deep(.el-pagination.is-background .el-pager li.is-active) {
  background: transparent;
  color: #1f2733;
  font-weight: 500;
}

/* ==================== 详情弹窗 ==================== */
.detail-body {
  max-height: 68vh;
  overflow-y: auto;
  padding-right: 4px;
}

.block + .block {
  margin-top: 20px;
}

.block-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

/* 信息表格：4 列 grid（标签 值 标签 值） */
.kv {
  display: grid;
  grid-template-columns: 190px 1fr 190px 1fr;
  border-top: 1px solid #ebeef5;
  border-left: 1px solid #ebeef5;
}

.kv > div {
  min-height: 44px;
  padding: 10px 14px;
  box-sizing: border-box;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  font-size: 13px;
  display: flex;
  align-items: center;
}

.kv .k {
  background: #fafafa;
  color: #606266;
}

.kv .v {
  background: #ffffff;
  color: #303133;
}

.score-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-num {
  font-size: 13px;
  color: #303133;
}

/* ---- 标签 ---- */
.tag {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 20px;
}

.tag.is-success {
  background: #f0f9eb;
  color: #67c23a;
}

.tag.is-warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.tag.is-danger {
  background: #fef0f0;
  color: #f56c6c;
}

.tag.is-gray {
  background: #f4f4f5;
  color: #909399;
}

/* ---- 情绪强度进度条 ---- */
.intensity {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.bar {
  width: 92px;
  height: 6px;
  border-radius: 3px;
  background: #ebeef5;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 3px;
  background: #a8abb2;
}

.bar-text {
  font-size: 13px;
  color: #303133;
}

/* ---- 建议区 ---- */
.advice-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.advice {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
}

.advice-title {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.advice-body {
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  color: #303133;
}
</style>
