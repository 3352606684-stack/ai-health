/* 前端流式对话实拍：发一句，等回答生成完，截图 + 打印最后一条 AI 气泡 */
const { chromium } = require('C:/Users/ASUS/.workbuddy/binaries/node/workspace/node_modules/playwright-core')

;(async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  await ctx.addInitScript(() => {
    localStorage.setItem('token', 'mock-token-user-5c1e4a')
    localStorage.setItem('userInfo', JSON.stringify({ nickname: '小林', role: 'user' }))
  })

  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://localhost:5173/portal/chat', { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  await page.fill('.input', '我最近总是睡不着，一躺下就开始想事情')
  await page.click('.send')

  // 记录字数增长，证明是"逐字"而不是一次性
  const samples = []
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(700)
    const len = await page.$$eval('.msg .bubble', (els) => {
      const last = els[els.length - 1]
      return last ? last.textContent.trim().length : 0
    })
    samples.push(len)
  }

  await page.waitForTimeout(3000)

  const lastText = await page.$$eval('.msg .bubble', (els) => {
    const last = els[els.length - 1]
    return last ? last.textContent.trim() : ''
  })
  const historyTop = await page.$eval('.history-item .history-title', (el) => el.textContent.trim()).catch(() => '(空)')

  console.log('=== 结果 ===')
  console.log('1. 每 0.7s 采样的气泡字数 :', samples.join(' → '))
  console.log('2. 最终 AI 回复           :', lastText)
  console.log('3. 左栏置顶会话标题       :', historyTop)
  console.log('4. JS 报错                :', errors.length ? errors.join(' | ') : '无')

  await page.screenshot({ path: 'D:/Ai心理健康/.workbuddy/previews/chat-ai-stream-live.png' })
  await browser.close()
})()
