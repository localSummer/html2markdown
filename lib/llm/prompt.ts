export const VISION_IMAGE_PROMPT = `请用中文完整描述这张图片，目标是让没看到原图的人也能还原结构和关键内容，而不是写摘要。
要求：
- 先说明图的类型与布局结构（分区、层级、阅读顺序、元素之间的关系）
- 再按结构顺序写清图中可见的文字、数据、标签、图例和要点
- 信息量大时用分点或短段落写全，不要压缩成一两句
- 不要开场白、不要评价、不要臆造看不清的内容`;

export const SYSTEM_PROMPT = `你将把用户提供的 HTML 片段转成 GitHub Flavored Markdown。
规则：
- 保留原有标题层级（h1–h6 对应 # 到 ######）
- 表格使用 GFM 表格语法
- 代码块使用围栏，能判断语言时标注语言
- 链接与图片使用标准 Markdown 语法；图片 src 保持原绝对 URL
- 列表、引用按原文结构转换
- 不要用 \`\`\`markdown 把整篇结果包起来
- 不要编造原文没有的段落、标题或内容
- 只输出 Markdown 正文，不要前言或解释`;

export const TASK_SYSTEM_PROMPT = `你将根据用户的任务说明，仅基于提供的 HTML 片段作答。
规则：
- 只使用这段 HTML 中的信息，不要编造原文没有的内容
- 按用户任务要求的格式输出
- 不要前言或解释，不要用 \`\`\`markdown 把整篇结果包起来`;

export function buildConvertMessages(
  html: string,
  taskPrompt?: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const task = taskPrompt?.trim();
  if (!task) {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: html },
    ];
  }
  return [
    { role: 'system', content: TASK_SYSTEM_PROMPT },
    { role: 'user', content: `${task}\n\n---\n${html}` },
  ];
}

export const MAX_HTML_CHARS = 80_000;

export function assertWithinLimit(html: string, limit = MAX_HTML_CHARS): void {
  if (html.length > limit) {
    throw new Error(
      `内容约 ${html.length} 字，超出安全上限 ${limit}。请改选「主内容」或更小区域后再转换`,
    );
  }
}

export function completionsUrl(baseURL: string): string {
  const trimmed = baseURL.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function modelsUrl(baseURL: string): string {
  const trimmed = baseURL.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed.replace(/\/chat\/completions$/, '/models');
  return `${trimmed}/models`;
}
