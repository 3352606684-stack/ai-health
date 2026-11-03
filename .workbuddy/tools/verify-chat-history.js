// 验证：在历史会话里继续对话 + 每轮问答实时写回历史
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
  const bubbles = (sel = '.msg .bubble') =>
    page.$$eval(sel, (els) => els.map((e) => e.textContent.trim()));
  const titles = () =>
    page.$$eval('.history-item .history-title', (els) => els.map((e) => e.textContent.trim()));
  const times = () =>
    page.$$eval('.history-item .history-time', (els) => els.map((e) => e.textContent.trim()));
  const active = () =>
    page.$$eval('.history-item.is-active .history-title', (els) =>
      els.map((e) => e.textContent.trim())
    );
  const focused = () =>
    page.evaluate(() => document.activeElement && document.activeElement.className);

  await page.goto('http://localhost:5199/portal/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // ① 打开第二条历史，焦点应自动进输入框
  let items = await page.$$('.history-item');
  await items[1].click();
  await page.waitForTimeout(600);
  r['1_打开历史_气泡数'] = (await bubbles()).length;
  r['2_打开历史_高亮'] = await active();
  r['3_自动聚焦'] = await focused();

  // ② 在历史会话里用 Enter 发一条
  await page.fill('textarea.input', '我还是有点生气，不知道怎么说');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  r['4_历史会话里发送_气泡数'] = (await bubbles()).length;
  r['5_历史会话里发送_最后一条'] = (await bubbles()).slice(-1)[0];
  r['6_发送后列表顺序'] = await titles();
  r['7_发送后时间'] = await times();
  r['8_发送后高亮'] = await active();

  // ③ 再发第二轮，点别的会话再点回来，内容应完整
  await page.fill('textarea.input', '我想一个人待一会儿');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  const beforeLeave = (await bubbles()).length;

  items = await page.$$('.history-item');
  await items[1].click(); // 切到「最近总是睡不着」
  await page.waitForTimeout(500);
  r['9_切到另一条_首条用户消息'] = (await bubbles('.msg.is-user .bubble'))[0];

  items = await page.$$('.history-item');
  await items[0].click(); // 切回来
  await page.waitForTimeout(500);
  r['10_切回_气泡数一致'] = (await bubbles()).length === beforeLeave;
  r['11_切回_最后一条'] = (await bubbles('.msg.is-user .bubble')).slice(-1)[0];
  await page.screenshot({ path: `${OUT}/chat-history-continue.png` });

  // ④ 新建 → 空白；发第一条消息应立刻进历史且高亮
  await page.click('.head-add');
  await page.waitForTimeout(400);
  r['12_新建确认文案'] = (await page.textContent('.el-message-box__message')).trim();
  await page.click('.el-message-box__btns .el-button--primary');
  await page.waitForTimeout(700);
  r['13_新建后高亮'] = await active();

  await page.fill('textarea.input', '今天想聊聊考试焦虑');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  r['14_新会话首条消息后_列表'] = await titles();
  r['15_新会话首条消息后_高亮'] = await active();

  // ⑤ 空白会话不应入库：再新建一次，列表长度不变
  const lenBefore = (await titles()).length;
  await page.click('.head-add');
  await page.waitForTimeout(400);
  await page.click('.el-message-box__btns .el-button--primary');
  await page.waitForTimeout(600);
  r['16_空白不占条目'] = (await titles()).length === lenBefore;
  r['17_最终列表'] = await titles();

  r['18_报错'] = errors;
  await browser.close();
  console.log(JSON.stringify(r, null, 2));
})().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  process.exit(1);
});
