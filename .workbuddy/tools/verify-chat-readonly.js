// 验证：历史会话只读浏览（输入框禁用 / 不发请求 / 可退出）
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
  const requests = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  page.on('request', (r) => {
    if (r.url().includes('/api/')) requests.push(r.method() + ' ' + r.url());
  });

  const r = {};
  const bubbles = (sel = '.msg .bubble') =>
    page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
  const titles = () =>
    page.$$eval('.history-item .history-title', (els) => els.map((e) => e.textContent.trim()));
  const cls = () =>
    page.$$eval('.history-item', (els) =>
      els.map((e) => ({
        t: e.querySelector('.history-title').textContent.trim(),
        c: e.className
      }))
    );

  await page.goto('http://localhost:5199/portal/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ① 当前对话里发一条，进入历史
  await page.fill('textarea.input', '我今天心情还不错');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  r['1_发送后列表'] = await titles();
  r['2_发送后状态'] = await cls();
  r['3_当前输入框disabled'] = await page.isDisabled('textarea.input');

  // ② 点历史（demo-1）→ 只读
  let items = await page.$$('.history-item');
  await items[items.length - 1].click(); // 最旧那条（最近总是睡不着）
  await page.waitForTimeout(600);
  r['4_只读_输入框disabled'] = await page.isDisabled('textarea.input');
  r['5_只读_提示条'] = await page.textContent('.readonly-text');
  r['6_只读_placeholder'] = await page.getAttribute('textarea.input', 'placeholder');
  r['7_只读_发送按钮disabled'] = await page.isDisabled('.send');
  r['8_只读_气泡'] = (await bubbles()).length;
  r['9_只读_列表状态'] = await cls();
  await page.screenshot({ path: `${OUT}/chat-history-readonly.png` });

  // ③ 只读时强行触发发送（绕过 disabled 直接调 click）
  await page.$eval('.send', (el) => el.click());
  await page.waitForTimeout(900);
  r['10_强点发送后气泡'] = (await bubbles()).length;
  r['11_强点发送_提示'] = await page
    .$$eval('.el-message__content', (els) => els.map((e) => e.textContent.trim()))
    .catch(() => []);

  // ④ 点「返回当前对话」→ 解禁，内容回到当前会话
  await page.click('.readonly-back');
  await page.waitForTimeout(500);
  r['12_退出后_输入框disabled'] = await page.isDisabled('textarea.input');
  r['13_退出后_提示条还在'] = (await page.$('.readonly-bar')) !== null;
  r['14_退出后_气泡'] = await bubbles();
  r['15_退出后_焦点'] = await page.evaluate(() => document.activeElement.className);

  // ⑤ 再点历史，然后点「当前对话」那条 → 也应退出
  items = await page.$$('.history-item');
  await items[1].click();
  await page.waitForTimeout(500);
  r['16_再进只读'] = await page.isDisabled('textarea.input');
  items = await page.$$('.history-item');
  await items[0].click(); // 第 0 条是当前对话（刚聊过的那条）
  await page.waitForTimeout(500);
  r['17_点当前对话_退出只读'] = !(await page.isDisabled('textarea.input'));
  r['18_点当前对话_气泡数'] = (await bubbles()).length;

  // ⑥ 只读时新建
  items = await page.$$('.history-item');
  await items[1].click();
  await page.waitForTimeout(400);
  await page.click('.head-add');
  await page.waitForTimeout(400);
  await page.click('.el-message-box__btns .el-button--primary');
  await page.waitForTimeout(700);
  r['19_只读时新建_气泡'] = (await bubbles()).length;
  r['20_只读时新建_输入框disabled'] = await page.isDisabled('textarea.input');
  r['21_最终列表'] = await titles();

  r['22_api请求'] = requests;
  r['23_报错'] = errors;
  await browser.close();
  console.log(JSON.stringify(r, null, 2));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  process.exit(1);
});
