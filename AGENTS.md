# AGENTS.md

浏览器扩展：把当前网页所选区域交给用户配置的 OpenAI 兼容接口，转成 Markdown。无自建后端，API Key 与正文只走本机 → 用户填写的 API。

技术栈：WXT（Manifest V3）、React 19、TypeScript、Tailwind CSS 4、Vitest、`@mozilla/readability`。目标浏览器：Chrome / Edge（需要 Side Panel）。

## 命令

```bash
npm install
npm run dev          # 输出到 .output/chrome-mv3，用「加载已解压的扩展程序」安装
npm run build
npm run zip
npm run compile      # tsc --noEmit
npm test             # vitest run；用例只收 lib/**/*.test.ts
```

改完逻辑后跑 `npm run compile` 与相关测试。不要为侧栏 UI 硬加 React Testing Library，现有测试覆盖 `lib/` 的纯逻辑。

## 目录

```
entrypoints/           # 扩展入口，勿把业务算法堆在这里
  background.ts        # 侧栏开关、与 tab 绑定
  content.ts           # 消息分发、漂浮按钮
  sidepanel/           # 侧栏 React：转换 / 历史 / 设置
lib/                   # 可测的核心逻辑
  messages.ts          # 扩展消息协议（改契约先改这里）
  dom/                 # 扫描分区、抽取、点选、高亮、去噪
  llm/                 # HTML→Markdown 流式调用
  vision/              # 选图、拉取、压缩、插入图说
  history/             # IndexedDB
  settings.ts          # chrome.storage
components/ui/         # shadcn 风格组件，保持通用
```

侧栏职责拆分：`ConvertTab.tsx` 管转换状态与副作用，`ConvertTabUI.tsx` 管展示。页面 DOM 操作走 content script 的 `lib/dom/page-agent.ts`，不要从侧栏直接碰网页 DOM。

## 架构要点

- **消息**：侧栏 / background ↔ content，类型以 `lib/messages.ts` 为准。content 对未知消息忽略；`handlePageMessage` 异步时 listener 必须 `return true`。
- **侧栏**：按 tab 启用。`browser.sidePanel.open` 必须在用户手势的同步栈里调用，前面不能 `await`。工具栏图标再点一次会关掉该 tab 的侧栏。
- **转换流**：扫描或点选 → `EXTRACT` 拿到清洗后的 HTML → 流式写入 `markdown` → 可选 vision 插图说 → 写入 IndexedDB。流式预览约 80ms 节流一次。
- **跟滚**：`MarkdownScrollBox` 在转换中用 `ResizeObserver` 跟随内容高度（含图片撑开）。用户上翻超过约 40px 停止跟随。不要再引入增高启发式或图片 `load` 双通道。
- **不支持的页面**：`lib/page-support.ts`（`chrome://`、扩展页、网上应用店、`view-source:`、`file:`、内置 PDF）。新限制补在这里并补测试。
- **设置 / 历史**：`chrome.storage` + IndexedDB，不要改成远程存储。

## 约定

- UI 文案用中文。代码标识符、提交说明用现有风格：短句、说明为什么。
- 奥卡姆：只改与任务相关的文件；能复用 `lib/` 就不要在 entrypoint 里复制算法。
- 组件放 `components/ui/` 时保持无业务耦合；业务 UI 放 `entrypoints/sidepanel/`。
- 新增纯函数优先放 `lib/` 并加 `*.test.ts`。Vitest 的 `include` 目前不含 `entrypoints/`。
- 不要添加后端、代理或把 Key 发到第三方。默认模型配置在 `lib/settings.ts`。
- 不要扩大权限：现有为 `storage`、`tabs`、`sidePanel` 与 `http(s)://*/*`。新权限要能说明为什么。
- 提交仅在用户明确要求时进行。

## 验证

- 逻辑 / 协议：对应 `lib/**/*.test.ts` + `npm run compile`。
- 侧栏交互：`npm run dev` 后在真实网页上走扫描 → 转换 → 预览/复制。扩展 UI 无法用普通浏览器页面代替。
- 流式预览：确认有图页面在图片出现后仍跟滚；用户上翻后不再强制贴底。
