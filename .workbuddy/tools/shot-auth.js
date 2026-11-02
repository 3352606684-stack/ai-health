// 需要登录态的后台页面截图：先注入 localStorage token 再访问
// 用法: node shot-auth.js <url> <out.png> [--w=1440] [--h=900] [--token=mock] [--click=<selector>] [--wait=1500] [--full]
const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/ASUS/.workbuddy/binaries/node/workspace/node_modules/playwright-core');

function parseArgs(argv) {
  const pos = [];
  const opt = { w: 1440, h: 900, token: 'mock-token', click: null, wait: 1500, full: false, scale: 1 };
  for (const a of argv) {
    if (a.startsWith('--w=')) opt.w = parseInt(a.slice(4), 10);
    else if (a.startsWith('--h=')) opt.h = parseInt(a.slice(4), 10);
    else if (a.startsWith('--scale=')) opt.scale = parseFloat(a.slice(8));
    else if (a.startsWith('--wait=')) opt.wait = parseInt(a.slice(7), 10);
    else if (a.startsWith('--token=')) opt.token = a.slice(8);
    else if (a.startsWith('--click=')) opt.click = a.slice(8);
    else if (a === '--full') opt.full = true;
    else pos.push(a);
  }
  return { pos, opt };
}

(async () => {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const [url, output] = pos;
  if (!url || !output) {
    console.error('用法: node shot-auth.js <url> <out.png> [--w=] [--h=] [--token=] [--click=] [--wait=] [--full]');
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars'] });
  const context = await browser.newContext({
    viewport: { width: opt.w, height: opt.h },
    deviceScaleFactor: opt.scale,
    locale: 'zh-CN',
  });
  // 在页面任何脚本执行前写入登录态，绕过全局路由守卫
  await context.addInitScript((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify({ nickname: '管理员', role: 'admin' }));
  }, opt.token);

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  });
  await page.waitForTimeout(opt.wait);

  if (opt.click) {
    try {
      await page.click(opt.click, { timeout: 5000 });
      await page.waitForTimeout(600);
    } catch (e) {
      errors.push('click failed: ' + opt.click);
    }
  }

  await page.screenshot({ path: path.resolve(output), fullPage: opt.full, type: 'png' });
  await browser.close();
  const kb = (fs.statSync(path.resolve(output)).size / 1024).toFixed(0);
  console.log(JSON.stringify({ ok: true, output: path.resolve(output), sizeKB: kb, errors }));
})().catch((e) => { console.error(JSON.stringify({ ok: false, error: String((e && e.message) || e) })); process.exit(1); });
