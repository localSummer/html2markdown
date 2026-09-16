---
name: html2md
description: 本地优先的网页转 Markdown 侧栏工具，绿色荧光标记语言，精密仪器感
colors:
  primary: "oklch(0.60 0.16 160)"
  primary-dark: "oklch(0.72 0.15 160)"
  primary-foreground: "oklch(0.99 0.02 160)"
  primary-soft: "oklch(0.95 0.03 160)"
  primary-soft-dark: "oklch(0.30 0.06 160)"
  primary-soft-foreground: "oklch(0.42 0.12 160)"
  destructive: "oklch(0.62 0.24 25)"
  destructive-dark: "oklch(0.70 0.20 25)"
  destructive-soft: "oklch(0.95 0.04 25)"
  background: "oklch(0.99 0.004 155)"
  background-dark: "oklch(0.19 0.02 160)"
  foreground: "oklch(0.26 0.03 160)"
  foreground-dark: "oklch(0.96 0.008 160)"
  card: "oklch(0.995 0.003 155)"
  card-dark: "oklch(0.24 0.025 160)"
  popover: "oklch(0.995 0.003 155)"
  popover-dark: "oklch(0.24 0.025 160)"
  secondary: "oklch(0.96 0.018 170)"
  secondary-dark: "oklch(0.30 0.04 170)"
  muted: "oklch(0.965 0.005 160)"
  muted-dark: "oklch(0.28 0.02 160)"
  muted-foreground: "oklch(0.52 0.02 160)"
  muted-foreground-dark: "oklch(0.70 0.025 162)"
  accent: "oklch(0.94 0.04 165)"
  accent-dark: "oklch(0.32 0.07 165)"
  border: "oklch(0.91 0.012 165)"
  border-dark: "oklch(0.36 0.03 165 / 60%)"
  ring: "oklch(0.60 0.16 160)"
typography:
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  prose-md:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: "0.5rem"
  md: "0.6875rem"
  lg: "0.75rem"
  xl: "0.99rem"
  pill: "999px"
spacing:
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "oklch(0.60 0.16 160 / 0.9)"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-soft-foreground}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary}"
    rounded: "{rounded.md}"
  button-ghost:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    backgroundColor: "transparent"
    rounded: "{rounded.md}"
    height: "36px"
---

# Design System: html2md

## Overview

**Creative North Star: "The Highlighter Lab"（荧光笔实验室）**

html2md 的侧栏是一台精密仪器：窄幅、清爽、低噪音，用一支饱和的荧光绿在阅读材料上留下发亮的标记。产品动作（分区高亮、转换进度、AI 流式输出）都由这支荧光笔驱动——绿色在这里不是装饰，而是「正在进行」的信号。

系统的骨架是克制的 shadcn 风格组件：system-ui 字体、12px 圆角、细边框、几乎平坦的表面。个性全部注入功能性时刻：主按钮与 Switch 的从上到下微渐变、进度条与选中态圆点的荧光 shadow（`0 0 6-8px var(--color-primary)`）、分区切换器上滑动的渐变 tab 指示条。发光永远指向状态，而不是取悦眼睛。

深浅色是对等的两套世界（oklch token 双份定义），不是深色优先或浅色优先。深色下主色提亮到 0.72 以保持同等荧光感。

**Key Characteristics:**

- 功能性发光：荧光 shadow 只出现在「进行中 / 已选中 / 当前身分」的状态上
- 微渐变增加物理质感（按钮 5% 明度差），不制造氛围
- 12px 主圆角 + 胶囊形（999px）用于小元素与进度条
- 窄幅优先：一切在侧栏（约 360-500px 宽）内设计，正文 14px
- 深浅色对等，oklch 双轨 token

## Colors

一支绿色荧光笔在极浅的暖白纸面上书写；深色模式是同一支笔在深灰绿的黑板上。

### Primary

- **荧光苦绿（Fluorescent Moss，oklch(0.60 0.16 160)）**: 品牌主色。主按钮、tab 指示条、进度条、Switch 开态、链接、选区、聚焦环。深色模式提亮为 oklch(0.72 0.15 160)（「夜光苦绿」）。
- **浅苔底（primary-soft，oklch(0.95 0.03 160)）**: 主色的纸面形态——outline 按钮、进度卡片底、ghost hover、success toast。它是荧光笔的「干了之后的痕迹」。
- **深苔字（primary-soft-foreground，oklch(0.42 0.12 160)）**: soft 底上的可读文字与代码。

### Secondary

- **灰绿底（secondary，oklch(0.96 0.018 170)）**: 次级按钮底色，比 primary-soft 更冷静，用于非品牌动作。

### Neutral

- **暖白纸（background，oklch(0.99 0.004 155)）**: 全局底色，接近白但带一丝暖绿。
- **墨绿字（foreground，oklch(0.26 0.03 160)）**: 正文。
- **卡片白（card / popover，oklch(0.995 0.003 155)）**: 表面容器。
- **雾灰边（border，oklch(0.91 0.012 165)）**: 细边框，分割线。深色模式半透明（60% alpha）。
- **弱化字（muted-foreground，oklch(0.52 0.02 160)）**: 次要说明、占位符、未激活 tab。

### Tertiary

- **警示红（destructive，oklch(0.62 0.24 25)）**: 错误与危险动作，配有自己的 soft 底（error toast）。

### Named Rules

**The One Highlighter Rule（单一荧光笔规则）.** 荧光绿 + 发光效果在任一屏内只指向一个「当前动作」：正在扫描的分区、进行中的进度、当前 tab。绝不给静态装饰元素加荧光 shadow。

## Typography

**Display Font:** 无独立 display 字体——侧栏不需要大标题。
**Body Font:** system-ui（跟随系统，无自定义字体栈）
**Label/Mono Font:** system-ui；代码块用等宽默认（prose 内）。

**Character:** 全 system-ui，零字体加载。靠字号/字重的三级阶梯（sm/semibold 标题、sm/regular 正文、xs/medium 标签）在窄幅里建立层级。`font-feature-settings: "cv11", "ss01"` 开启单层 a 与更清晰的 1/数字。

### Hierarchy

- **Title**（600，0.875rem，tracking -0.01em）：区块标题、logo 文字。
- **Body**（400，0.875rem，1.5）：主文案。
- **Label**（500，0.75rem）：辅助说明、计数、tab 文字。
- **Prose/MD**（400，14px，1.65）：Markdown 预览正文；h1 1.45em / h2 1.12em / h3 1.05em 的温和压缩标题阶梯。

### Named Rules

**The Narrow Column Rule（窄幅规则）.** 正文 14px、行高 1.65；不给侧栏 UI 用超过 1rem 的字号。标题压缩比逐级递减（1.45 → 1.12 → 1.05），在窄空间里保住文档结构感又不至于顶天。

## Layout

单列垂直流，无网格系统。侧栏宽约 360-500px。

- **App 骨架**：header（logo + tabs，渐变+backdrop-blur 顶栏）→ main（三个 tab panel 交叉淡入淡出，0.22s）→ floating toaster。
- **滚动模型**：内容区上下留白固定在外框（0.75rem padding-block），内部滚动条 gutter 稳定，滚动中内容不贴边。
- **节奏**：区块内 space-y-1.5~2（6-8px），区块间 gap-3 / py-2.5（12px / 10px），卡片内 p-6（24px）。窄幅里密度偏高，靠留白分组而不是留白喘息。
- **粘性结构**：操作区（进度条/按钮）贴底，border-t + 从背景到卡片的向上渐变 + backdrop-blur。
- **响应式**：容器查询（`container: note-preview / inline-size`）驱动笔记预览，不依赖视口断点。

## Elevation & Depth

混合策略：接近平坦，阴影小而功能性。深度优先用色阶层（background → card → popover）表达。

### Shadow Vocabulary

- **按钮静息**（`0 1px 2px rgba(0,0,0,0.08), 0 4px 12px -2px primary/35`）：主按钮的物理质感。
- **按钮悬停**（`0 2px 4px rgba(0,0,0,0.10), 0 8px 20px -4px primary/45`）+ 上移 1px：可按压感。
- **卡片**（`0 1px 2px rgba(0,0,0,0.04), 0 4px 16px -8px rgba(0,0,0,0.12)`）：几乎察觉不到的托底。
- **荧光聚焦**（`0 0 6-8px var(--color-primary)`）：tab 指示条、选中圆点、进度条。状态语言，非层级语言。
- **弹层**（`shadow-md`，shadcn 默认）：popover / select 下拉。

### Named Rules

**The Glow Means State Rule（发光即状态规则）.** 荧光 shadow 只许出现在交互状态（选中/进行中/聚焦）上；表面层级用背景色差和普通小阴影表达。混用两者会毁掉信号系统。

## Shapes

圆润但精确。主圆角 12px（卡片），次级 10px（按钮/输入框），小元素与进度条用胶囊形（999px 全圆）。分区切换器等分段控件在外框 10px、内件全圆角对齐。边框 1px 细线为主，分区选中态用 `primary/40` 提亮边框而非加粗。

## Components

### Buttons

- **Shape:** 10px 圆角（rounded-md）
- **Primary:** 荧光苦绿渐变（primary → primary/90）+ 白字 + 绿色投影；高 36px、px-4。图标按钮 36px 方形。
- **Hover / Focus:** 阴影加深扩散、上移 1px；active 归位并撤光。聚焦环 3px ring/50。
- **Outline（品牌次级）:** 浅苔底 + 深苔字 + primary/20 边框，hover 边框提亮到 /40。
- **Secondary:** 灰绿底 + 细边框。
- **Ghost:** 纯文字（弱化字色），hover 浅苔底。

### Chips（分区切换器 ToggleGroup）

- **Style:** 分段式；未选中 = 雾灰边框 + 弱化字，选中 = primary/40 边框 + accent 底 + 荧光小圆点（size-2 + 0 0 6px 荧光）+ 荧光阴影描边。
- **State:** 扫描中/选中时页面上有对应高亮，chip 即控制开关。

### Cards / Containers

- **Corner Style:** 12px（rounded-xl）
- **Background:** 卡片白，深色模式 oklch(0.24 0.025 160)
- **Shadow Strategy:** 卡片托底小阴影（见 Elevation）
- **Border:** 1px 雾灰边
- **Internal Padding:** 24px；进度卡片等紧凑型 px-3 py-2.5

### Inputs / Fields

- **Style:** 透明底、1px 输入边框、10px 圆角、h-9；textarea 自动高。深色模式背景 input/30。
- **Focus:** 边框变 ring 色 + 3px ring/50 外环；选区用主色反白。
- **Disabled:** opacity-50/60 + 禁用光标。

### Navigation

顶栏 tabs：图标 + 文字横排，未激活弱化字色，激活前景色；2px 胶囊形渐变指示条（primary 渐变 + 荧光 shadow）随 tab 滑动（0.28s, cubic-bezier(0.22,1,0.36,1)），由 ResizeObserver 驱动。

### Markdown 预览（签名组件）

产品的核心画布。react-markdown + typography 插件，14px / 1.65 行高；链接用主色，代码块浅苔底，引用块主色左边线；选区荧光绿反白。源码/预览切换用透明度交叉淡化（0.22s）。流式输出时 stick-to-bottom 吸底。

### 进度条（签名组件）

h-2 胶囊轨道（primary/15 底），填充条 = 主色渐变（primary → primary/80）+ 端到端荧光 shadow + 宽度过渡 200ms；不确定态为 40% 宽度的滑动光带（1.15s ease-in-out 循环）。进度卡片本身是浅苔底的紧凑卡片。

## Do's and Don'ts

### Do:

- **Do** 把荧光 shadow 保留给状态：选中、进行中、当前 tab、聚焦。
- **Do** 用 `oklch` 双轨 token 写所有新颜色，浅深色成对定义。
- **Do** 保持 14px 正文与 1.65 行高做 Markdown 预览；容器查询适配宽度。
- **Do** 交互元素给出 cursor-pointer 与 3px ring/50 聚焦环。
- **Do** 微渐变只用「自身色 → 自身色/0.9」这种 5% 明度差，制造物理感而非氛围。

### Don't:

- **Don't** 给静态装饰（插画、标题、背景）加发光效果——发光是信号系统。
- **Don't** 引入 webfont；全 system-ui 是特性（扩展不加载远程字体，隐私优先）。
- **Don't** 使用绿色以外的强彩色；警示红仅限错误场景。
- **Don't** 在侧栏里用超过 1rem 的正文字号或宽于 500px 的设计假设。
- **Don't** 用大面积阴影做层级；层级用 background → card → popover 的色阶。
