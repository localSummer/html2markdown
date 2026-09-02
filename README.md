# html2md

浏览器扩展：把当前网页的所选区域转成 Markdown。默认在本机转换，无需 API Key；也可选用你配置的 OpenAI 兼容接口做 AI 转换或按任务说明改写。结果可预览、复制、下载，并保存在本机历史里。

## 功能

- **本地转换**：默认把清洗后的 HTML 转为 GitHub Flavored Markdown，不经过 API
- **AI 增强**：配置 API Key 后可开启；填写任务说明时自动走 AI
- **分区转换**：打开转换页会自动扫描；可选「主内容 / 导航 / 内容+导航 / 全文」，并在页面上高亮
- **指定区域**：在页面上点击任意元素作为转换范围（Esc 取消）
- **任务说明**：扫描或点选后均可填写（可空；有内容则走 AI）
- **流式预览**：AI 转换过程中实时显示 Markdown（预览或源码）
- **复制 / 下载**：一键复制或下载 `.md`，导出时附带标题、来源 URL 与时间
- **图片识别**（可选，仅 AI 转换）：跳过装饰图，按面积优先选取不超过上限的图片；优先从页面已加载图片读取，失败再下载；把说明插入 Markdown
- **本地历史**：IndexedDB 存储，可搜索、回看、复制、下载；同一 URL 再次打开侧栏时会回填最近一次结果
- **快捷键**：默认 `Alt+Shift+M` 打开或关闭侧栏；设置页显示当前按键，改键跳转到浏览器的扩展快捷键页
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
2. 点击工具栏图标、页面右侧漂浮按钮，或按 `Alt+Shift+M`，打开侧栏
3. 转换页会自动扫描当前页。也可手动扫描或指定区域
4. 点 **转换为 Markdown** 做本地转换。若已配置 API Key，可打开「AI 增强」
5. 预览结果后复制或下载（导出含出处）

AI 与图片识别：在 **设置** 中填写文本模型的 `baseURL`、`API Key`、`model`（默认 `https://api.deepseek.com/v1` + `deepseek-v4-flash`），可用「测试连接」检查。填写任务说明后必须走 AI。

不支持：`chrome://`、扩展页、Chrome 网上应用店、`view-source:`、本地 `file:`、内置 PDF 查看器。

## 设置说明

| 项 | 说明 |
| --- | --- |
| 文本模型 | 用于 AI 转换与任务说明；需兼容 `/v1/chat/completions`。可用「测试连接」。AI 输入上限默认 10 万字符，`0` 表示不限制；本地转换不受此限制 |
| 图片识别 | 默认关闭；仅 AI 转换时生效。跳过装饰图，按面积优先、受识别上限约束；可与文本共用 API Key |
| 历史 | 保留条数、按天数自动清理（`0` 表示不按时间清理） |
| 漂浮按钮 | 是否在网页上显示快捷入口 |

本地转换不经过 API。开启 AI 或图片识别时，会把所选区域清洗后的 HTML（图片识别还包括图片数据）发到你填写的 API 地址。扩展不设中转服务器，不收集 Key 与正文。

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

技术栈：WXT、React 19、TypeScript、Tailwind CSS 4、Vitest、Mozilla Readability、Turndown。
