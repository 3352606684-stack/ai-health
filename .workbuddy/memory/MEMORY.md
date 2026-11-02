# Ai心理健康 — 项目长期记忆

## 交付与展示约定（重要）
- 用户在移动端对话，**成果必须直接渲染在对话里**：移动端看不到 present_files 的图片卡片（用户 10-26 明确反馈"看不到你生成的图片"）。
  - **首选 `show_widget` 内联渲染**（HTML/SVG，主题自适应，用户直接可见）
  - 复杂/长页面再用截图 PNG 作为补充：先 `--full` 出整页长图存档，再用 `--scroll=0/610/1220` 分段截图
  - docx / pptx → 用对应版式的 HTML 渲染后截图
- 内联 widget 设计约束：无渐变/阴影、字号 ≥11px、字重只用 400/500、外层透明、用 CSS 变量适配明暗主题。
- 仓库里仍要留一份可打开的 HTML 原件（`.workbuddy/previews/`），方便用户后续自己看。
- 截图工具：`D:\Ai心理健康\.workbuddy\tools\shot.js`（playwright-core + 本机 Chrome，无需下载浏览器）
  - 用法：`node .workbuddy/tools/shot.js <input.html|url> <out.png> [--w=390] [--h=844] [--full] [--scale=2] [--desktop] [--scroll=N]`
  - 长页面展示：先 `--full` 出整页长图存档，再用 `--scroll=0/610/1220` 出分段截图给对话看（`clip` 超出视口会出空白，别用）
  - 截图输出目录：`D:\Ai心理健康\.workbuddy\previews\`
- 展示时把预览图放在 present_files 的首位（图片优先于文件）。

## 环境
- Node: `C:\Users\ASUS\.workbuddy\binaries\node\versions\22.22.2-6\node.exe`
- playwright-core 已装在 `C:\Users\ASUS\.workbuddy\binaries\node\workspace\node_modules`
- 本机可用浏览器：Chrome（`C:\Program Files\Google\Chrome\Application\chrome.exe`）、Edge

## 项目结构
- 工作区根：`D:\Ai心理健康`，主项目在 `demo/`（前端工程）

## 个人知识库（复习/学习用）
- 位置：`D:\filetest\kb-vault`（Obsidian，claude-obsidian 契约）。结构：`wiki/{concepts,entities,sources,questions,meta}` + `.raw/captured` + `index/overview/hot/log.md`；frontmatter 必带 type/title/status/created/updated/tags。
- 原库主线是 `sssss` 项目（Spring Boot 4.1.1 + Vue3 + MyBatis-Plus + Sa-Token）。
- 本项目分支：`wiki/branches/ai-health/`（6 页），页面名统一 `AIH ` 前缀防撞名。
- **用户要求原库保持不变**：新增内容只放分支目录；已在 `wiki/index.md` 追加「分支（独立演进，不并入主线）」小节 6 条链接（用户 10-26 15:37 明确同意），其余原库页面未动。
