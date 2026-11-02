// 通用页面截图工具：把 HTML/URL 渲染成图片（默认移动端 390x844）
// 用法: node shot.js <input.html|url> <output.png> [--w=390] [--h=844] [--full] [--scale=2] [--wait=600]
const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/ASUS/.workbuddy/binaries/node/workspace/node_modules/playwright-core');

function parseArgs(argv) {
  const pos = [];
  const opt = { w: 390, h: 844, full: false, scale: 2, wait: 600, mobile: true, scroll: 0 };
  for (const a of argv) {
    if (a.startsWith('--w=')) opt.w = parseInt(a.slice(4), 10);
    else if (a.startsWith('--h=')) opt.h = parseInt(a.slice(4), 10);
    else if (a.startsWith('--scale=')) opt.scale = parseFloat(a.slice(8));
    else if (a.startsWith('--wait=')) opt.wait = parseInt(a.slice(7), 10);
    else if (a.startsWith('--scroll=')) opt.scroll = parseInt(a.slice(9), 10);
    else if (a === '--full') opt.full = true;
    else if (a === '--desktop') { opt.mobile = false; opt.w = 1440; opt.h = 900; }
    else pos.push(a);
  }
  return { pos, opt };
}

(async () => {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const [input, output] = pos;
  if (!input || !output) {
    console.error('用法: node shot.js <input.html|url> <output.png> [--w=390] [--h=844] [--full] [--scale=2] [--desktop]');
    process.exit(2);
  }
  let target = input;
  if (!/^https?:\/\//i.test(input) && !input.startsWith('file://')) {
    const abs = path.resolve(input);
    if (!fs.existsSync(abs)) { console.error('文件不存在: ' + abs); process.exit(3); }
    target = 'file:///' + abs.replace(/\\/g, '/');
  }
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', args: ['--hide-scrollbars'] });
  const context = await browser.newContext({
    viewport: { width: opt.w, height: opt.h },
    deviceScaleFactor: opt.scale,
    isMobile: opt.mobile,
    hasTouch: opt.mobile,
    locale: 'zh-CN',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 45000 });
  } catch (e) {
    await page.goto(target, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(opt.wait);
  const pageHeight = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  if (opt.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), opt.scroll);
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: path.resolve(output), type: 'png', fullPage: opt.full });
  await browser.close();
  const kb = (fs.statSync(path.resolve(output)).size / 1024).toFixed(0);
  console.log(JSON.stringify({ ok: true, output: path.resolve(output), sizeKB: kb, viewport: `${opt.w}x${opt.h}`, pageHeight, scroll: opt.scroll, fullPage: opt.full, pageErrors: errors }));
})().catch((e) => { console.error(JSON.stringify({ ok: false, error: String(e && e.message || e) })); process.exit(1); });
