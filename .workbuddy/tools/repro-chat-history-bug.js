// 复现：打开历史会话后能否继续对话
const { chromium } = require('C:/Users/ASUS/.workbuddy/binaries/node/workspace/node_modules/playwright-core');
const OUT = 'D:/Ai心理健康/.workbuddy/previews';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars'] });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'zh-CN'
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('token', 'mock-token-user-5c1e4a');
    localStorage.setItem('userInfo', JSON.stringify({ nickname: '小林', role: 'user' }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  const r = {};
  const bubbles = () => page.$$eval('.msg .bubble', (els) => els.map((e) => e.textContent.trim()));

  await page.goto('http://localhost:5199/portal/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 打开第二条历史（和室友闹了点矛盾）
  const items = await page.$$('.history-item');
  await items[1].click();
  await page.waitForTimeout(600);
  r['1_打开历史后气泡'] = (await bubbles()).length;

  // 尝试继续对话
  await page.fill('textarea.input', '我还是有点生气');
  await page.waitForTimeout(200);
  r['2_发送按钮disabled'] = await page.getAttribute('.send', 'disabled');
  r['3_输入框可编辑'] = await page.isEditable('textarea.input');
  await page.click('.send');
  await page.waitForTimeout(1500);
  r['4_发送后气泡'] = await bubbles();
  r['5_输入框值'] = await page.inputValue('textarea.input');
  r['6_历史标题'] = await page.$$eval('.history-item .history-title', (els) =>
    els.map((e) => e.textContent.trim())
  );
  r['7_报错'] = errors;

  await page.screenshot({ path: `${OUT}/chat-history-bug.png` });
  await browser.close();
  console.log(JSON.stringify(r, null, 2));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  process.exit(1);
});
