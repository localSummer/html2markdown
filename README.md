# html2md

浏览器扩展：把当前网页的所选区域转成 Markdown，或按你写的任务说明处理。转换由你配置的 OpenAI 兼容接口完成（默认 DeepSeek），结果可预览、复制、下载，并保存在本机历史里。

## 功能

- **分区转换**：扫描页面后可选「主内容 / 导航 / 内容+导航 / 全文」，并在页面上高亮对应区域
- **指定区域**：在页面上点击任意元素作为转换范围（Esc 取消）
- **自定义 Prompt**：指定区域后可填写任务说明（可空；为空则仍转为 Markdown）
- **流式预览**：转换过程中实时显示 Markdown（预览或源码）
- **复制 / 下载**：一键复制或下载 `.md` 文件
- **图片识别**（可选）：跳过装饰图，按面积优先选取不超过上限的图片；优先从页面已加载图片读取，失败再下载；把说明插入 Markdown
- **本地历史**：IndexedDB 存储，可搜索、回看、复制、下载；同一 URL 再次打开侧栏时会回填最近一次结果
- **漂浮按钮**：网页右侧快捷入口，可上下拖动位置
- **外观**：浅色 / 深色 / 跟随系统；仅影响侧栏

## 环境

- Node.js 18+
- Chrome 或 Edge（Manifest V3，需要 Side Panel）

## 安装

```bash
npm install
npm run dev
```

开发模式下 WXT 会把扩展输出到 `.output/chrome-mv3`。在浏览器打开 `chrome://extensions`（Edge 为 `edge://extensions`），开启「开发者模式」，点击「加载已解压的扩展程序」，选择该目录。

生产构建：

```bash
npm run build          # 输出到 .output/chrome-mv3
npm run zip            # 打包 zip，便于分发
```

## 使用

1. 打开任意 http/https 网页
2. 点击工具栏图标，或页面右侧漂浮按钮，打开侧栏
3. 在 **设置** 中填写文本模型的 `baseURL`、`API Key`、`model`（默认 `https://api.deepseek.com/v1` + `deepseek-v4-flash`）
4. 回到 **转换**，任选一种方式：
   - **扫描当前页** → 选择「主内容 / 导航 / 内容+导航 / 全文」→ 转换
   - **指定区域** → 在页面上点击目标元素 → 可选填写自定义 Prompt → 转换
5. 预览结果后复制或下载

不支持：`chrome://`、扩展页、Chrome 网上应用店、`view-source:`、本地 `file:`、内置 PDF 查看器。

## 设置说明

| 项 | 说明 |
| --- | --- |
| 文本模型 | 用于 HTML → Markdown（指定区域填写任务说明时，也走此接口）；需兼容 `/v1/chat/completions` |
| 图片识别 | 默认关闭；跳过装饰图，按面积优先、受识别上限约束；优先读取页面已加载图片，失败再并发下载；可与文本共用 API Key |
| 历史 | 保留条数、按天数自动清理（`0` 表示不按时间清理） |
| 漂浮按钮 | 是否在网页上显示快捷入口 |

转换会把所选区域清洗后的 HTML（若开启图片识别，还包括图片数据）直接发到你填写的 API 地址。扩展不设中转服务器，不收集 Key 与正文。

## 开发

```bash
npm run dev            # 热更新开发
npm run compile        # TypeScript 类型检查
npm test               # Vitest
```

主要目录：

```
entrypoints/     background、content script、侧栏
lib/             抽取、点选、转换、图片、历史、设置
components/ui/   侧栏 UI 组件
```

技术栈：WXT、React 19、TypeScript、Tailwind CSS 4、Vitest、Mozilla Readability。
