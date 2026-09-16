# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- 笔记/知识管理用户：把网页内容存入 Obsidian/Notion 等笔记库，是核心人群。
- 开发者/技术写作者：需要可靠、可复现的 Markdown 输出（喂给 LLM、批量整理资料）。
- 普通内容消费者：不想截图拼贴，希望一键把页面整理成可编辑文本。

使用场景：浏览任意 http/https 网页时，通过侧栏快速转换、复制、下载或存入本地历史。

## Product Purpose

浏览器扩展（Chrome/Edge MV3 Side Panel）：把当前网页的所选区域转成 Markdown。默认本机转换（Turbown/GFM），无需 API Key；可选用户自配的 OpenAI 兼容接口做 AI 转换或按任务说明改写。结果可预览、复制、下载，并保存在本机 IndexedDB 历史里。

成功标准：一次点击得到干净、可直接入笔记的 Markdown；全程默认不出网。

## Positioning

本地优先 + 隐私：正文默认不经过任何服务器，零配置即可用；AI 增强是可选项，且只发往用户自己填写的 API。无自建后端。

## Operating Context

- 载体是浏览器侧栏（窄幅 UI），入口有三个：工具栏图标、页面右侧漂浮按钮、快捷键 `Alt+Shift+M`。
- 页面 DOM 操作（扫描分区、点选、高亮）全部走 content script（`lib/dom/page-agent.ts`），侧栏不直接碰网页 DOM。
- AI/图片识别需用户在设置里填写 baseURL / API Key / model（默认 DeepSeek）；填写任务说明则强制走 AI。
- 外观支持浅色/深色/跟随系统，仅影响侧栏。

## Capabilities and Constraints

- 本地转换：Readability 清洗 + Turndown → GitHub Flavored Markdown。
- 分区转换：主内容/导航/内容+导航/全文，页面上实时高亮；也可点击任意元素指定范围（Esc 取消）。
- AI 增强：流式输出实时预览；任务说明可空（空则本地转换）。
- 图片识别（可选，仅 AI）：跳过装饰图、面积优先、数量上限；优先读已加载图片，失败再下载。
- 导出：复制或下载 `.md`，附带标题、来源 URL、时间（出处只在导出时拼接）。
- 历史：IndexedDB 本地存储，可搜索回看；同一 URL 重开侧栏回填最近结果。
- 约束：目标浏览器 Chrome/Edge（Manifest V3，需要 Side Panel），保持现状，暂无 Firefox 计划；无后端。
- 术语：分区（主内容/导航/…）、任务说明、漂浮按钮。

## Brand Commitments

名称 html2md。中文优先的界面文案（README、AGENTS.md 均为中文）。视觉基调：绿色系 oklch token、shadcn 风格组件（现有实现为准，未做正式设计承诺）。

## Evidence on Hand

- README.md、AGENTS.md：功能与架构事实的权威来源。
- `entrypoints/sidepanel/` + `components/ui/`：可运行的现有实现（绿色 oklch 主题、浅/深色）。
- 无用户数据、无 testimonials、无落地页；未来不得虚构这些。

## Product Principles

1. 本地优先：默认路径零网络、零配置；任何出网都必须是用户显式配置的结果。
2. 干净输出优先于花哨：转换质量与分区/点选控制是产品根基。
3. 侧栏是窄幅舞台：UI 必须在窄空间内保持可扫读、低噪音。
4. AI 是增强不是前提：没配 Key 时产品依然完整可用。
5. 隐私可解释：用户能一眼看清数据去了哪里（只在本机 / 只发往自己填的 API）。

## Accessibility & Inclusion

未确立产品特定无障碍标准（未记录）。
