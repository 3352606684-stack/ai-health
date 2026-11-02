<template>
  <div class="dashboard">
    <!-- 加载中 -->
    <div v-if="loading" class="panel">
      <el-skeleton :rows="9" animated />
    </div>

    <!-- 加载失败 -->
    <el-result
      v-else-if="error"
      icon="warning"
      title="数据加载失败"
      :sub-title="error"
    >
      <template #extra>
        <el-button type="primary" @click="load">重新加载</el-button>
      </template>
    </el-result>

    <!-- 正常内容 -->
    <template v-else-if="stats">
      <!-- ===== 顶部四个统计卡片 ===== -->
      <el-row :gutter="16" class="stat-row">
        <el-col :span="6" v-for="item in stats.statCards" :key="item.key">
          <div class="stat-card">
            <div
              class="stat-icon"
              :style="{ background: COLORS[item.key] || '#7c6cf5' }"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path :d="ICONS[item.key] || ICONS.user" />
              </svg>
            </div>
            <div class="stat-body">
              <div class="stat-label">{{ item.label }}</div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-extra">{{ item.extra }}</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <!-- ===== 趋势 + 会话统计 ===== -->
      <el-row :gutter="16" class="chart-row">
        <el-col :span="12">
          <div class="panel">
            <div class="panel-title">情绪趋势分析</div>
            <div ref="moodRef" class="chart chart-lg"></div>
          </div>
        </el-col>

        <el-col :span="12">
          <div class="panel">
            <div class="panel-title">咨询会话统计</div>
            <div class="mini-stats">
              <div class="mini-item">
                <div class="mini-label">总会话数</div>
                <div class="mini-value">{{ stats.consult.total }}</div>
              </div>
              <div class="mini-item">
                <div class="mini-label">平均时长</div>
                <div class="mini-value">
                  {{ stats.consult.avgDuration }}<span class="mini-unit">分钟</span>
                </div>
              </div>
              <div class="mini-item">
                <div class="mini-label">活跃用户</div>
                <div class="mini-value">{{ stats.consult.activeUsers }}</div>
              </div>
            </div>
            <div class="sub-title">咨询活动统计</div>
            <div ref="consultRef" class="chart chart-sm"></div>
          </div>
        </el-col>
      </el-row>

      <!-- ===== 用户活跃趋势 ===== -->
      <div class="panel">
        <div class="panel-title">用户活跃趋势</div>
        <div ref="activeRef" class="chart chart-lg"></div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getDashboardStats } from '../api/dashboard'

// 按需注册，避免把整个 echarts 打进包里
echarts.use([LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

const ICONS = {
  user: 'M9 10.5a3 3 0 100-6 3 3 0 000 6M3.5 19.5c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8M16 5.2a2.8 2.8 0 010 5.2M17.5 19.5c0-2.2-.7-3.7-1.8-4.6',
  emotion: 'M12 20.2s-7.2-4.4-7.2-9.2a4.1 4.1 0 017.2-2.6 4.1 4.1 0 017.2 2.6c0 4.8-7.2 9.2-7.2 9.2z',
  session: 'M4 5.5h16v10H9.5L4 19.5z',
  mood: 'M12 4a8 8 0 100 16 8 8 0 000-16M8.8 14.2c.8 1.2 1.9 1.8 3.2 1.8s2.4-.6 3.2-1.8'
}

const COLORS = {
  user: '#7c6cf5',
  emotion: '#f56a9e',
  session: '#29c2df',
  mood: '#4bd07a'
}

const loading = ref(true)
const error = ref('')
const stats = ref(null)

const moodRef = ref(null)
const consultRef = ref(null)
const activeRef = ref(null)
let charts = []

const axisCommon = (dates) => ({
  type: 'category',
  data: dates,
  axisLine: { lineStyle: { color: '#e8eaef' } },
  axisTick: { show: false },
  axisLabel: { color: '#9aa0ac', fontSize: 11, interval: 1 }
})

const legendCommon = {
  top: 0,
  itemWidth: 12,
  itemHeight: 8,
  icon: 'circle',
  textStyle: { color: '#8a8f9c', fontSize: 12 }
}

const tooltipCommon = {
  trigger: 'axis',
  axisPointer: { type: 'line', lineStyle: { color: '#dfe2ea' } }
}

function buildMoodChart(data) {
  return {
    tooltip: tooltipCommon,
    legend: { ...legendCommon, data: ['平均情绪评分', '记录数量'] },
    grid: { left: 34, right: 34, top: 46, bottom: 28 },
    xAxis: { ...axisCommon(data.dates), boundaryGap: false },
    yAxis: [
      {
        type: 'value',
        min: 0,
        max: 8,
        interval: 2,
        splitLine: { lineStyle: { color: '#f2f3f7' } },
        axisLabel: { color: '#9aa0ac', fontSize: 11 }
      },
      {
        type: 'value',
        min: 0,
        max: 1,
        interval: 0.2,
        splitLine: { show: false },
        axisLabel: { color: '#9aa0ac', fontSize: 11 }
      }
    ],
    series: [
      {
        name: '平均情绪评分',
        type: 'line',
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 5,
        data: data.moodTrend.score,
        itemStyle: { color: '#f5a623' },
        lineStyle: { width: 2 }
      },
      {
        name: '记录数量',
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 5,
        data: data.moodTrend.count,
        itemStyle: { color: '#c8cbd4' },
        lineStyle: { width: 2 }
      }
    ]
  }
}

function buildConsultChart(data) {
  return {
    tooltip: tooltipCommon,
    legend: { ...legendCommon, data: ['会话数量', '参与用户数'] },
    grid: { left: 34, right: 20, top: 42, bottom: 26 },
    xAxis: axisCommon(data.dates),
    yAxis: {
      type: 'value',
      min: 0,
      max: 3.5,
      interval: 0.5,
      splitLine: { lineStyle: { color: '#f2f3f7' } },
      axisLabel: { color: '#9aa0ac', fontSize: 11 }
    },
    series: [
      {
        name: '会话数量',
        type: 'bar',
        barWidth: 6,
        data: data.consult.sessionCount,
        itemStyle: { color: '#5b8ff9', borderRadius: [3, 3, 0, 0] }
      },
      {
        name: '参与用户数',
        type: 'bar',
        barWidth: 6,
        data: data.consult.participantCount,
        itemStyle: { color: '#f6bd16', borderRadius: [3, 3, 0, 0] }
      }
    ]
  }
}

function buildActiveChart(data) {
  return {
    tooltip: tooltipCommon,
    legend: {
      ...legendCommon,
      data: ['活跃用户', '新增用户', '日志用户', '咨询用户']
    },
    grid: { left: 34, right: 24, top: 46, bottom: 28 },
    xAxis: { ...axisCommon(data.dates), boundaryGap: false },
    yAxis: {
      type: 'value',
      min: 0,
      max: 1,
      interval: 0.2,
      splitLine: { lineStyle: { color: '#f2f3f7' } },
      axisLabel: { color: '#9aa0ac', fontSize: 11 }
    },
    series: [
      { name: '活跃用户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 5, data: data.activeTrend.active, itemStyle: { color: '#5b8ff9' }, lineStyle: { width: 2 } },
      { name: '新增用户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 5, data: data.activeTrend.newUser, itemStyle: { color: '#f6bd16' }, lineStyle: { width: 2 } },
      { name: '日志用户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 5, data: data.activeTrend.logUser, itemStyle: { color: '#5ad8a6' }, lineStyle: { width: 2 } },
      { name: '咨询用户', type: 'line', smooth: 0.3, symbol: 'circle', symbolSize: 5, data: data.activeTrend.consultUser, itemStyle: { color: '#ff9845' }, lineStyle: { width: 2 } }
    ]
  }
}

function disposeCharts() {
  charts.forEach((chart) => chart.dispose())
  charts = []
}

function renderCharts() {
  disposeCharts()
  const data = stats.value
  if (!data) return

  charts = [
    [moodRef.value, buildMoodChart(data)],
    [consultRef.value, buildConsultChart(data)],
    [activeRef.value, buildActiveChart(data)]
  ]
    .filter(([el]) => el)
    .map(([el, option]) => {
      const instance = echarts.init(el)
      instance.setOption(option)
      return instance
    })
}

function handleResize() {
  charts.forEach((chart) => chart.resize())
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    stats.value = await getDashboardStats()
    loading.value = false
    await nextTick()
    renderCharts()
  } catch (e) {
    loading.value = false
    error.value = e?.message || '无法连接后端服务'
  }
}

onMounted(() => {
  load()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  disposeCharts()
})
</script>

<style scoped>
.dashboard {
  padding-bottom: 8px;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 100%;
  box-sizing: border-box;
}

.stat-icon {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 11px;
  box-sizing: border-box;
}

.stat-icon svg {
  width: 100%;
  height: 100%;
}

.stat-body {
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 23px;
  font-weight: 600;
  color: #1f2430;
  line-height: 1.35;
}

.stat-extra {
  font-size: 12px;
  color: #b0b4bd;
}

.chart-row {
  margin-bottom: 16px;
}

.panel {
  background: #ffffff;
  border-radius: 10px;
  padding: 16px 18px 10px;
  box-sizing: border-box;
  height: 100%;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2430;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f2f5;
}

.chart {
  width: 100%;
}

.chart-lg {
  height: 268px;
}

.chart-sm {
  height: 200px;
}

.mini-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 0 8px;
}

.mini-item {
  text-align: center;
}

.mini-label {
  font-size: 12px;
  color: #909399;
}

.mini-value {
  font-size: 19px;
  font-weight: 600;
  color: #1f2430;
  margin-top: 4px;
}

.mini-unit {
  font-size: 11px;
  font-weight: 400;
  color: #909399;
  margin-left: 2px;
}

.sub-title {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #303133;
  padding-top: 6px;
}
</style>
