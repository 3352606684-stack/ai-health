/**
 * 把源码渲染成一个可读的代码阅读页（自包含单文件 HTML，无 CDN 依赖）
 * 用法：node make-code-html.js <输出.html>
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'D:/Ai心理健康/demo/frontend/src';
const OUT = process.argv[2] || 'D:/Ai心理健康/.workbuddy/previews/code-knowledge.html';

const FILES = [
  { id: 'vue', tab: 'views/knowledge.vue', file: path.join(ROOT, 'views/knowledge.vue'), kind: 'vue' },
  { id: 'api', tab: 'api/knowledge.js', file: path.join(ROOT, 'api/knowledge.js'), kind: 'js' }
];

const ESC = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------- 逐行高亮（带跨行注释状态） ---------------- */
const KW = 'const|let|var|function|async|await|return|if|else|for|of|in|new|try|catch|finally|import|from|export|default|class|extends|this|true|false|null|undefined|typeof|delete|void|instanceof';
const TOKEN = new RegExp(
  '(' + [
    '\\/\\*[\\s\\S]*?\\*\\/',          // 块注释
    '<!--[\\s\\S]*?-->',              // html 注释
    '\\/\\/[^\\n]*',                  // 行注释
    "'(?:[^'\\\\]|\\\\.)*'",          // 单引号
    '"(?:[^"\\\\]|\\\\.)*"',          // 双引号
    '`(?:[^`\\\\]|\\\\.)*`'           // 模板串
  ].join('|') + ')|(<\\/?[a-zA-Z][\\w-]*)|(\\bv-[\\w:.-]+)|(@[\\w.]+)|(\\b(?:' + KW + ')\\b)|(\\b\\d+(?:\\.\\d+)?\\b)',
  'g'
);

function hiLine(line, esc) {
  let out = '';
  let last = 0;
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(esc))) {
    out += esc.slice(last, m.index);
    if (m[1]) {
      const isHtml = m[1].startsWith('&lt;!');
      out += '<span class="' + (isHtml ? 'c-com' : 'c-com') + '">' + m[1] + '</span>';
    } else if (m[2]) out += '<span class="c-tag">' + m[2] + '</span>';
    else if (m[3]) out += '<span class="c-dir">' + m[3] + '</span>';
    else if (m[4]) out += '<span class="c-dir">' + m[4] + '</span>';
    else if (m[5]) out += '<span class="c-kw">' + m[5] + '</span>';
    else if (m[6]) out += '<span class="c-num">' + m[6] + '</span>';
    last = m.index + m[0].length;
  }
  out += esc.slice(last);
  return out;
}

function renderCode(src) {
  const lines = src.split('\n');
  let inBlock = false;   // /* */ 或 <!-- --> 未闭合
  let rows = [];
  lines.forEach((raw, i) => {
    const esc = ESC(raw);
    let body;
    if (inBlock) {
      body = '<span class="c-com">' + esc + '</span>';
      if (esc.includes('*/') || esc.includes('--&gt;')) inBlock = false;
    } else {
      body = hiLine(raw, esc);
      // 判断本行是否开启了未闭合的块注释
      const open1 = (raw.match(/\/\*/g) || []).length;
      const close1 = (raw.match(/\*\//g) || []).length;
      const open2 = (raw.match(/<!--/g) || []).length;
      const close2 = (raw.match(/-->/g) || []).length;
      if (open1 > close1 || open2 > close2) inBlock = true;
      if (inBlock && (raw.includes('*/') || raw.includes('-->'))) inBlock = false;
    }
    rows.push('<div class="l"><span class="n">' + (i + 1) + '</span><span class="t">' + (body || '&nbsp;') + '</span></div>');
  });
  return rows.join('');
}

/* ---------------- 拆分 vue 文件为三段 ---------------- */
function segments(src, kind) {
  if (kind !== 'vue') return [{ name: '全文', code: src, tag: 'js' }];
  const iT = src.indexOf('<template>');
  const iS = src.indexOf('<script setup>');
  const iC = src.indexOf('<style scoped>');
  const segs = [];
  // 代码优先：template → script → style，注释说明放最后，避免首屏全是注释
  if (iS > 0) segs.push({ name: '<template>', code: src.slice(iT, iS).replace(/\n+$/, ''), tag: 'template' });
  if (iC > 0) segs.push({ name: '<script setup>', code: src.slice(iS, iC).replace(/\n+$/, ''), tag: 'script' });
  segs.push({ name: '<style scoped>', code: src.slice(iC).replace(/\n+$/, ''), tag: 'style' });
  if (iT > 0) segs.push({ name: '头部接口契约', code: src.slice(0, iT).replace(/\n+$/, ''), tag: 'comment' });
  return segs;
}

/* ---------------- 组装 ---------------- */
let totalLines = 0;
let navHtml = '';
let panesHtml = '';

FILES.forEach((f, fi) => {
  const src = fs.readFileSync(f.file, 'utf8').replace(/\r\n/g, '\n');
  const lines = src.split('\n').length;
  totalLines += lines;
  const segs = segments(src, f.kind);

  navHtml += '<button class="tab' + (fi === 0 ? ' on' : '') + '" data-pane="pane-' + f.id + '">'
    + '<span class="tab-name">' + f.tab + '</span>'
    + '<span class="tab-lines">' + lines + ' 行</span></button>';

  let segNav = '';
  let segBody = '';
  const defSeg = f.kind === 'vue' ? 1 : 0;   // vue 默认展示 <script setup>
  segs.forEach((s, si) => {
    const id = f.id + '-' + si;
    segNav += '<button class="chip' + (si === defSeg ? ' on' : '') + '" data-seg="seg-' + id + '">' + ESC(s.name) + '</button>';
    segBody += '<section class="seg' + (si === defSeg ? ' on' : '') + '" id="seg-' + id + '">'
      + '<div class="seg-head"><span class="seg-name">' + ESC(s.name) + '</span>'
      + '<span class="seg-lines">' + s.code.split('\n').length + ' 行</span></div>'
      + '<div class="code">' + renderCode(s.code) + '</div></section>';
  });

  panesHtml += '<div class="pane' + (fi === 0 ? ' on' : '') + '" id="pane-' + f.id + '">'
    + (segs.length > 1 ? '<div class="chips">' + segNav + '</div>' : '')
    + '<div class="segs">' + segBody + '</div></div>';
});

const html = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>知识文章模块 · 代码</title><style>'
  + '*{box-sizing:border-box}'
  + 'body{margin:0;background:#f4f5f7;color:#1f2430;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}'
  + '.wrap{max-width:1080px;margin:0 auto;padding:22px 16px 60px}'
  + '.eyebrow{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a93a3;font-weight:500}'
  + 'h1{margin:6px 0 8px;font-size:22px;font-weight:600;letter-spacing:-.01em}'
  + '.meta{font-size:12.5px;color:#7c8598;line-height:1.7}'
  + '.meta b{color:#1f2430;font-weight:500}'
  + '.tabs{display:flex;gap:8px;margin:18px 0 14px;flex-wrap:wrap}'
  + '.tab{background:#fff;border:1px solid #e2e5ea;border-radius:9px;padding:9px 14px;cursor:pointer;font:inherit;text-align:left;transition:.15s}'
  + '.tab .tab-name{display:block;font-size:12.5px;color:#454d5e;font-family:ui-monospace,Consolas,monospace}'
  + '.tab .tab-lines{display:block;font-size:10.5px;color:#9aa3b2;margin-top:2px}'
  + '.tab.on{border-color:#c3d4ee;background:#f0f5fd}'
  + '.tab.on .tab-name{color:#1a5fb4;font-weight:500}'
  + '.pane{display:none}.pane.on{display:block}'
  + '.chips{display:flex;gap:6px;margin:0 0 12px;flex-wrap:wrap}'
  + '.chip{background:#fff;border:1px solid #e2e5ea;border-radius:20px;padding:5px 12px;font:inherit;font-size:11.5px;color:#5b6478;cursor:pointer}'
  + '.chip.on{background:#1f2430;border-color:#1f2430;color:#fff}'
  + '.seg{display:none;margin-bottom:18px}.seg.on{display:block}'
  + '.seg-head{display:flex;align-items:center;justify-content:space-between;padding:0 2px 7px}'
  + '.seg-name{font-size:11.5px;color:#7c8598;font-family:ui-monospace,Consolas,monospace}'
  + '.seg-lines{font-size:10.5px;color:#a8b0bd}'
  + '.code{background:#1b1f27;border-radius:10px;overflow:auto;padding:12px 0;'
  + 'font:12.5px/1.7 ui-monospace,"Cascadia Code",Consolas,"Courier New",monospace;'
  + 'box-shadow:0 1px 2px rgba(16,24,40,.06)}'
  + '.l{display:grid;grid-template-columns:46px 1fr;min-width:max-content}'
  + '.n{color:#4a5361;text-align:right;padding-right:14px;user-select:none;font-size:11.5px}'
  + '.t{white-space:pre;padding-right:28px;color:#c9d1d9}'
  + '.c-com{color:#6b7784;font-style:italic}'
  + '.c-str{color:#a5d6a7}.c-kw{color:#7fb3ff}.c-num{color:#f0b862}'
  + '.c-tag{color:#ff9e64}.c-dir{color:#4dd0e1}'
  + '.foot{margin-top:24px;font-size:11.5px;color:#9aa3b2;line-height:1.8;border-top:1px solid #e6e8ec;padding-top:14px}'
  + '@media(max-width:520px){h1{font-size:19px}.wrap{padding:16px 12px 44px}.code{font-size:11.5px}.l{grid-template-columns:34px 1fr}.n{padding-right:10px}}'
  + '</style></head><body><div class="wrap">'
  + '<div class="eyebrow">AI 心理健康 · 前端</div>'
  + '<h1>知识文章模块 · 代码</h1>'
  + '<div class="meta">共 <b>' + FILES.length + ' 个文件</b> · <b>' + totalLines + ' 行</b> · 后端未改动<br>'
  + '本次改动：新增 <code>api/knowledge.js</code>（6 个接口封装）· 重写 <code>views/knowledge.vue</code>（服务端分页 + 双层查询封装）</div>'
  + '<div class="tabs">' + navHtml + '</div>'
  + panesHtml
  + '<div class="foot">接口契约写在 <code>knowledge.vue</code> 文件头注释里；后端就绪后把 <code>USE_MOCK</code> 改为 <code>false</code> 即可切换。</div>'
  + '</div><script>'
  + 'document.querySelectorAll(".tab").forEach(function(b){b.onclick=function(){'
  + 'document.querySelectorAll(".tab").forEach(function(x){x.classList.remove("on")});b.classList.add("on");'
  + 'document.querySelectorAll(".pane").forEach(function(p){p.classList.remove("on")});'
  + 'document.getElementById(b.dataset.pane).classList.add("on");};});'
  + 'document.querySelectorAll(".chip").forEach(function(b){b.onclick=function(){'
  + 'var pane=b.closest(".pane");'
  + 'pane.querySelectorAll(".chip").forEach(function(x){x.classList.remove("on")});b.classList.add("on");'
  + 'pane.querySelectorAll(".seg").forEach(function(s){s.classList.remove("on")});'
  + 'document.getElementById(b.dataset.seg).classList.add("on");};});'
  + 'document.querySelectorAll(".pane").forEach(function(p){'
  + 'var f=p.querySelector(".seg");if(f&&!p.querySelector(".seg.on"))f.classList.add("on");});'
  + '</script></body></html>';

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, 'utf8');
console.log(JSON.stringify({ ok: true, out: OUT, kb: (fs.statSync(OUT).size / 1024).toFixed(1), files: FILES.length, totalLines }, null, 1));
