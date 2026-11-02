<!--
  知识文章管理页 —— 前端已完成接口接入（后端待实现）

  ============================== 接口契约 ==============================
  统一响应外壳：{ code, message, data }，code = 200 视为成功。
  utils/request.js 的响应拦截器会自动剥壳，所以页面里拿到的就是 data 本身。
  分页响应 data 的形状：{ list: Article[], total: number, page: number, pageSize: number }

  Article 字段：
    id            number    文章 id，后端生成
    title         string    标题
    category      string    分类，必须属于 GET /categories 返回的列表
    author        string    作者，后端取当前登录用户，前端不传
    views         number    阅读量，新增时为 0
    publishedAt   string    发布时间，格式 yyyy-MM-dd HH:mm:ss，后端生成
    status        string    只允许「已上线」/「已下线」
    content       string    正文（列表接口可不返回，编辑时再取）

  ① GET    /api/knowledge/articles
     参数：title(模糊) / category(精确) / status(精确) / page(从 1 开始) / pageSize(默认 8)
     返回：data = { list, total, page, pageSize }

  ② GET    /api/knowledge/categories
     参数：无
     返回：data = string[]，例如 ["人际关系","压力缓解"]

  ③ POST   /api/knowledge/articles
     body：{ title, category, status, content }
     返回：data = Article（含后端生成的 id / author / publishedAt）

  ④ PUT    /api/knowledge/articles/{id}
     body：{ title, category, status, content }（全量更新）
     返回：data = Article

  ⑤ PATCH  /api/knowledge/articles/{id}/status
     body：{ status }（只改状态，用于上线 / 下线）
     返回：data = Article

  ⑥ DELETE /api/knowledge/articles/{id}
     返回：data = null

  校验与错误：标题非空且 ≤100 字；分类必须在列表中；正文 ≤5000 字。
  400 / 404 时后端返回 { message }，request.js 会直接把这个 message 弹出来。

  ============================== 联调方法 ==============================
  1. 后端 6 个接口就绪后，把下方 USE_MOCK 改成 false；
  2. 删除 DEMO_ROWS / DEMO_CATEGORIES / delay / formatNow，以及 requestPage、handleSubmit、
     toggleStatus、handleDelete 里的 mock 分支；
  3. 页面上方黄色「演示数据」提示会自动消失（它绑的就是 USE_MOCK）。

  ============================== 本次改动说明 ==============================
  · 查询封装成两层：requestPage(params) 只负责「按条件拿一页数据」，
    loadArticles() 负责「读当前条件 → 写状态 → 管 loading」。
    mock 与真实接口的差异只存在于 requestPage 内部，页面逻辑不出现分支。
  · 分页从「前端切片」改为「服务端分页」：原 filteredRows / pagedRows 已删除，
    表格直接渲染 rows，total 由接口返回并驱动分页器。
  · 自动加载与手动查询共用同一个 loadArticles()：
    onMounted 拉首次，查询 / 重置 / 翻页在事件函数里调它，不会出现两份请求逻辑。
-->
<template>
  <div class="page">
    <div class="card">
      <!-- 后端未就绪时的显式提示，避免把演示数据误当成接口结果 -->
      <el-alert
        v-if="USE_MOCK"
        type="warning"
        :closable="false"
        show-icon
        title="当前为演示数据"
        description="后端 6 个文章接口尚未实现。接口就绪后，把 knowledge.vue 里的 USE_MOCK 改为 false 即可切换。"
        class="demo-tip"
      />

      <!-- ===== 标题栏 ===== -->
      <div class="card-head">
        <h2 class="card-title">知识文章</h2>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </div>

      <!-- ===== 筛选区 ===== -->
      <div class="filter">
        <div class="filter-item">
          <span class="filter-label">文章标题</span>
          <el-input
            v-model="filters.title"
            placeholder="请输入文章标题"
            clearable
            class="w-170"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">分类</span>
          <el-select
            v-model="filters.category"
            placeholder="选择分类"
            clearable
            class="w-195"
          >
            <el-option
              v-for="item in categories"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">状态</span>
          <el-select
            v-model="filters.status"
            placeholder="选择状态"
            clearable
            class="w-190"
          >
            <el-option label="已上线" value="已上线" />
            <el-option label="已下线" value="已下线" />
          </el-select>
        </div>
      </div>

      <div class="filter-actions">
        <el-button type="primary" @click="handleSearch">查询</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>

      <!-- ===== 表格 ===== -->
      <el-table
        v-loading="loading"
        :data="rows"
        class="table"
        row-key="id"
        stripe
        empty-text="暂无文章"
      >
        <el-table-column label="文章标题" min-width="300">
          <template #default="{ row }">
            <span class="title-cell">
              <svg class="doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 3.5H7.5a2 2 0 00-2 2v13a2 2 0 002 2h9a2 2 0 002-2V8z" />
                <path d="M14 3.5V8h4.5" />
              </svg>
              {{ row.title }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" min-width="150" />
        <el-table-column prop="author" label="作者" min-width="150" />
        <el-table-column prop="views" label="阅读量" min-width="110" />
        <el-table-column prop="publishedAt" label="发布时间" min-width="170" />
        <el-table-column label="状态" min-width="110">
          <template #default="{ row }">
            <!-- 状态是枚举值，用颜色区分，避免只能靠读文字判断 -->
            <el-tag :type="row.status === '已上线' ? 'success' : 'info'" size="small" effect="plain">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="left">
          <template #default="{ row }">
            <el-button link type="primary" class="op" @click="openEdit(row)">编辑</el-button>
            <el-button link class="op op-offline" @click="toggleStatus(row)">
              {{ row.status === '已上线' ? '下线' : '上线' }}
            </el-button>
            <el-button link type="danger" class="op" @click="handleDelete(row)">删除</el-button>
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

    <!-- ===== 新增 / 编辑弹窗 ===== -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑文章' : '新增文章'"
      width="760px"
      @closed="resetForm"
    >
      <el-form :model="form" label-width="88px">
        <el-form-item label="文章标题" required>
          <el-input v-model="form.title" maxlength="100" show-word-limit placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.category" placeholder="请选择分类" class="w-full">
            <el-option
              v-for="item in categories"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" class="w-full">
            <el-option label="已上线" value="已上线" />
            <el-option label="已下线" value="已下线" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <CoverUpload v-model="form.cover" />
        </el-form-item>

      <el-form-item label="正文">
         <RichEditor v-model="form.content" height="320px" placeholder="请输入正文内容" />
      </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 函数式组件（ElMessage / ElMessageBox）不会被 unplugin 自动注入样式，必须手动引入，
// 否则提示框和确认框会失去定位与外观。
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import {
  fetchArticles,
  fetchCategories,
  createArticle,
  updateArticle,
  updateArticleStatus,
  deleteArticle
} from '../api/knowledge'
import CoverUpload from '../component/CoverUpload.vue'
import RichEditor from '../component/RichEditor.vue'


/* ==================================================================
   演示开关：后端接口就绪后改成 false，页面上方的黄色提示会自动消失。
   ================================================================== */
const USE_MOCK = true

/* ==================== 演示数据（切到真实接口后整段删除） ==================== */
const DEMO_CATEGORIES = ['人际关系', '压力缓解', '情绪管理', '心理健康基础']

const DEMO_ROWS = [
  { id: 1, title: '测试233', category: '人际关系', author: '系统管理员', views: 0, publishedAt: '2026-01-20 09:45:37', status: '已上线', content: '' },
  { id: 2, title: '学生心理压力应对策略', category: '压力缓解', author: '系统管理员', views: 35, publishedAt: '2025-09-07 08:30:00', status: '已上线', content: '' },
  { id: 3, title: '正念练习入门指南1', category: '情绪管理', author: '系统管理员', views: 42, publishedAt: '2025-09-06 13:10:00', status: '已上线', content: '' },
  { id: 4, title: '睡眠质量与心理健康', category: '心理健康基础', author: '系统管理员', views: 27, publishedAt: '2025-09-05 11:45:00', status: '已下线', content: '' },
  { id: 5, title: '建立健康的人际关系', category: '人际关系', author: '系统管理员', views: 18, publishedAt: '2025-09-04 16:20:00', status: '已上线', content: '' },
  { id: 6, title: '职场压力管理指南', category: '压力缓解', author: '系统管理员', views: 31, publishedAt: '2025-09-03 09:15:00', status: '已上线', content: '' },
  { id: 7, title: '情绪调节的五个有效策略', category: '情绪管理', author: '系统管理员', views: 23, publishedAt: '2025-09-02 14:30:00', status: '已下线', content: '' },
  { id: 8, title: '如何识别和管理焦虑情绪', category: '心理健康基础', author: '系统管理员', views: 15, publishedAt: '2025-09-01 10:00:00', status: '已上线', content: '' },
  { id: 9, title: '冥想与呼吸训练入门', category: '情绪管理', author: '系统管理员', views: 12, publishedAt: '2025-08-28 15:05:00', status: '已上线', content: '' },
  { id: 10, title: '大学生常见心理困扰识别', category: '心理健康基础', author: '系统管理员', views: 9, publishedAt: '2025-08-26 09:20:00', status: '已下线', content: '' }
]

// 用 let：新增 / 删除会整体替换数组
let demoRows = [...DEMO_ROWS]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function formatNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/* ==================== 状态 ==================== */
const loading = ref(false)
const submitting = ref(false)
const rows = ref([])
const total = ref(0)
const categories = ref([])

// filters 是输入框里的值，query 是点「查询」后才生效的值。
// 两者分离，才能支持「改了条件但没点查询」这种情况。
const emptyFilters = () => ({ title: '', category: '', status: '' })
const filters = reactive(emptyFilters())
const query = reactive(emptyFilters())

const page = ref(1)
const pageSize = ref(8)

/* ==================================================================
   查询封装（本次重点）
   requestPage —— 只负责「按条件拿一页数据」，返回统一形状 { list, total }
   loadArticles —— 负责「读当前条件 → 写状态 → 管 loading」，是页面唯一的取数入口
   mock 与真实接口的差异全部藏在 requestPage 里，页面逻辑不出现分支
   ================================================================== */
async function requestPage(params) {
  if (!USE_MOCK) {
    // 真实接口：params = { title, category, status, page, pageSize }
    // 返回值已由 request.js 剥掉 { code, message, data } 外壳
    return await fetchArticles(params)
  }

  // —— 以下是演示实现，模拟服务端的筛选 + 分页 ——
  await delay(180)
  const keyword = (params.title || '').trim()
  const list = demoRows.filter((row) => {
    if (keyword && !row.title.includes(keyword)) return false
    if (params.category && row.category !== params.category) return false
    if (params.status && row.status !== params.status) return false
    return true
  })
  const start = (params.page - 1) * params.pageSize
  return {
    list: list.slice(start, start + params.pageSize),
    total: list.length,
    page: params.page,
    pageSize: params.pageSize
  }
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await requestPage({
      ...query,
      page: page.value,
      pageSize: pageSize.value
    })
    rows.value = res.list ?? []
    total.value = res.total ?? 0
  } catch {
    // 错误提示由 request.js 拦截器统一弹出（400 / 404 / 断网都有中文文案），
    // 这里只把状态收干净，避免 loading 卡住或残留旧数据。
    rows.value = []
    total.value = 0
  } finally {
    // 必须放 finally：否则请求失败后表格会一直转圈
    loading.value = false
  }
}

async function loadCategories() {
  try {
    categories.value = USE_MOCK ? [...DEMO_CATEGORIES] : await fetchCategories()
  } catch {
    categories.value = []
  }
}

/* ==================== 自动加载（生命周期） ==================== */
onMounted(async () => {
  await loadCategories()
  await loadArticles()
})

/* ==================== 查询 / 重置 / 分页 ==================== */
function handleSearch() {
  Object.assign(query, filters)
  page.value = 1
  loadArticles()
}

function handleReset() {
  Object.assign(filters, emptyFilters())
  Object.assign(query, emptyFilters())
  page.value = 1
  loadArticles()
}

function handlePageChange(next) {
  page.value = next
  loadArticles()
}

// 删除后总数变少，当前页可能越界（比如停在第 3 页但只剩 1 页）
watch(total, (value) => {
  const maxPage = Math.max(1, Math.ceil(value / pageSize.value))
  if (page.value > maxPage) {
    page.value = maxPage
    loadArticles()
  }
})

/* ==================== 新增 / 编辑 ==================== */
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ id: null, title: '', category: '', status: '已上线', cover: '', content: '' })



function resetForm() {
  Object.assign(form, { id: null, title: '', category: '', status: '已上线', cover: '', content: '' })

  isEdit.value = false
}

function openCreate() {
  resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, { cover: '', ...row })
  isEdit.value = true
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入文章标题')
    return
  }
  if (!form.category) {
    ElMessage.warning('请选择分类')
    return
  }

  // author / views / publishedAt 由后端生成，前端不传
  const payload = {
    title: form.title.trim(),
    category: form.category,
    status: form.status,
    cover: form.cover,
    content: form.content
  }

  submitting.value = true
  try {
    if (USE_MOCK) {
      if (isEdit.value) {
        const target = demoRows.find((item) => item.id === form.id)
        if (target) Object.assign(target, payload)
      } else {
        const nextId = demoRows.reduce((max, item) => Math.max(max, item.id), 0) + 1
        demoRows.unshift({
          id: nextId,
          author: '系统管理员',
          views: 0,
          publishedAt: formatNow(),
          ...payload
        })
      }
    } else if (isEdit.value) {
      await updateArticle(form.id, payload)
    } else {
      await createArticle(payload)
    }

    ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
    dialogVisible.value = false
    if (!isEdit.value) page.value = 1   // 新增后回第一页，否则新文章可能不在当前页
    await loadArticles()
  } catch {
    // 校验失败（400）或其它错误：提示已由拦截器弹出，弹窗保持打开让用户改
  } finally {
    submitting.value = false
  }
}

/* ==================== 上线 / 下线 ==================== */
async function toggleStatus(row) {
  const nextStatus = row.status === '已上线' ? '已下线' : '已上线'
  const action = nextStatus === '已下线' ? '下线' : '上线'
  try {
    await ElMessageBox.confirm(`确定要${action}《${row.title}》吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  try {
    if (USE_MOCK) {
      row.status = nextStatus
    } else {
      await updateArticleStatus(row.id, nextStatus)
    }
    ElMessage.success(`${action}成功`)
    await loadArticles()
  } catch {
    // 失败提示已由拦截器弹出
  }
}

/* ==================== 删除 ==================== */
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`删除后不可恢复，确定要删除《${row.title}》吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return // 用户取消
  }

  try {
    if (USE_MOCK) {
      demoRows = demoRows.filter((item) => item.id !== row.id)
    } else {
      await deleteArticle(row.id)
    }
    ElMessage.success('删除成功')
    await loadArticles()
  } catch {
    // 失败提示已由拦截器弹出
  }
}
</script>

<style scoped>
.page {
  min-height: 100%;
}

.card {
  background: #ffffff;
  border-radius: 10px;
  padding: 18px 22px 12px;
  box-sizing: border-box;
}

.demo-tip {
  margin-bottom: 16px;
}

/* ---- 标题栏 ---- */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2430;
}

/* ---- 筛选区 ---- */
.filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.w-170 {
  width: 170px;
}

.w-195 {
  width: 195px;
}

.w-190 {
  width: 190px;
}

.w-full {
  width: 100%;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 14px 0 6px;
}

/* ---- 表格 ---- */
.table {
  width: 100%;
  margin-top: 4px;
}

.table :deep(.el-table__header th) {
  background: #ffffff;
  color: #909399;
  font-weight: 400;
  font-size: 13px;
  border-bottom: 1px solid #ebeef5;
  padding: 7px 0;
}

.table :deep(.el-table .cell) {
  line-height: 20px;
}

.table :deep(.el-table__row td) {
  font-size: 13px;
  color: #606266;
  padding: 7px 0;
}

.table :deep(.el-table__row--striped td) {
  background: #fafafa;
}

.title-cell {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.doc-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  color: #c0c4cc;
}

.op {
  font-size: 13px;
  padding: 0;
}

.op-offline {
  color: #35b8c8;
}

.op-offline:hover {
  color: #2aa5b4;
}

/* ---- 分页 ---- */
.pager {
  display: flex;
  justify-content: flex-start;
  padding: 18px 0 8px;
}

.pager :deep(.el-pagination.is-background .el-pager li) {
  background: transparent;
  font-weight: 400;
  color: #606266;
}

.pager :deep(.el-pagination.is-background .el-pager li.is-active) {
  color: #409eff;
  background: transparent;
  font-weight: 500;
}

.pager :deep(.el-pagination.is-background .btn-prev),
.pager :deep(.el-pagination.is-background .btn-next) {
  background: transparent;
  color: #909399;
}
</style>
