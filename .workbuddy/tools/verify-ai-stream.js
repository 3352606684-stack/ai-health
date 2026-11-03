/* 验证前端 → Vite 代理 → Spring Boot SSE 的整条链路是否打通。
   当前后端未配 AI_API_KEY，预期：前端弹出「后端未配置 AI_API_KEY…」，
   气泡被撤掉（不出空框），页面无 JS 报错。 */
const { chromium } = require('C:/Users/ASUS/.workbuddy/binaries/node/workspace/node_modules/playwright-core')

const BASE = process.env.BASE || 'http://localhost:5173'

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  await ctx.addInitScript(() => {
    localStorage.setItem('token', 'mock-token-user-5c1e4a')
    localStorage.setItem('userInfo', JSON.stringify({ nickname: '小林', role: 'user' }))
  })

  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  const apiCalls = []
  page.on('response', (r) => { if (r.url().includes('/api/ai/chat/stream')) apiCalls.push(r.status()) })

  await page.goto(`${BASE}/portal/chat`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const before = await page.$$eval('.msg', (els) => els.length)

  // 发一条消息
  await page.fill('.input', '你好，我最近有点焦虑')
  await page.click('.send')
  await page.waitForTimeout(2500)

  const after = await page.$$eval('.msg', (els) => els.length)
  const toast = await page.$$eval('.el-message', (els) => els.map((e) => e.innerText.trim())).catch(() => [])
  const sendDisabled = await page.$eval('.send', (el) => el.disabled).catch(() => null)
  const readOnlyBar = await page.$$eval('.readonly-bar', (els) => els.length).catch(() => 0)

  console.log('=== 结果 ===')
  console.log('1. 发消息前气泡数        :', before)
  console.log('2. 发消息后气泡数        :', after, '(预期 = before + 1，用户消息留下、AI 空泡被撤)')
  console.log('3. /api/ai/chat/stream   :', apiCalls.length ? apiCalls.join(',') : '未发出请求 ❌')
  console.log('4. 页面弹出的提示        :', toast.length ? JSON.stringify(toast) : '（无）')
  console.log('5. 发送按钮 disabled     :', sendDisabled, '(预期 false：流结束后解锁)')
  console.log('6. readOnly 提示条数量   :', readOnlyBar, '(预期 0)')
  console.log('7. JS 报错               :', errors.length ? errors.join(' | ') : '无')

  await page.screenshot({ path: 'D:/Ai心理健康/.workbuddy/previews/chat-ai-stream-test.png', fullPage: false })
  await browser.close()
})()
