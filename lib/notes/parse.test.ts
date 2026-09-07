import { parseNote } from './parse';
import { NOTE_TEMPLATES, noteFormat, type NoteTemplateId } from './templates';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const table = '| 维度 | A | B |\n| --- | --- | --- |\n| 成本 | 低 | 高 |';
const examples: Record<NoteTemplateId, string> = {
  cornell: '# 标题\n\n## 提示：为什么？\n\n详细笔记。\n\n## 总结\n\n总结正文。',
  outline: '# 标题\n\n## 背景\n\n- 要点\n\n## 方法\n\n### 实现\n\n说明。',
  qa: '# 标题\n\n## 问题：为什么？\n\n因为如此。\n\n## 问题：如何验证？\n\n检查结果。',
  reading: '# 标题\n\n## 核心论点\n\n论点。\n\n## 证据\n\n证据。\n\n## 推理\n\n推理。\n\n## 局限与待核实问题\n\n原文未提供。',
  action: '# 标题\n\n## 目标\n\n目标。\n\n## 前提\n\n前提。\n\n## 步骤\n\n1. 操作\n\n## 验证方法\n\n验证。\n\n## 注意事项\n\n原文未提供。',
  comparison: `# 标题\n\n## 对比对象\n\nA 与 B。\n\n## 维度比较\n\n${table}\n\n表后详细说明。\n\n## 适用条件\n\n条件。\n\n## 结论\n\n结论。`,
};

describe('parseNote', () => {
  it.each(NOTE_TEMPLATES)('parses $id without losing source content', ({ id }) => {
    const parsed = parseNote(examples[id], noteFormat(id));
    expect(parsed).not.toBeNull();
    expect(parsed!.title).toBe('标题');
    expect(parsed!.titleMarkdown).toBe('# 标题');
    expect(parsed!.format).toEqual(noteFormat(id));
    expect(parsed!.titleMarkdown + parsed!.preamble + parsed!.sections.map((section) => section.headingMarkdown + section.body).join('')).toBe(examples[id]);
  });

  it.each([undefined, 'plain', 'qa', { templateId: 'unknown', version: 1 }, { templateId: 'qa', version: 2 }])('returns null for unsupported format %j', (format) => {
    expect(parseNote(examples.qa, format)).toBeNull();
  });

  it.each([
    '', '## 问题：为什么？\n答案', '# 标题', '#\n\n## 问题：为什么？\n答案',
    '前置正文\n\n# 标题\n\n## 问题：为什么？\n答案',
    '# 标题\n\n## 问题：为什么？', '# 标题\n\n## 问题：为什么？\n\n<!-- empty -->',
    '# 标题\n\n## 问题：为什么？\n\n[ref]: https://example.com',
    '# 标题\n\n## 问题：为什么？\n\n### 只有小标题',
    '# 标题\n\n## 问题：\n答案', '# 标题\n\n## 问题：为什么？\n答案\n\n# 另一篇\n正文',
  ])('rejects incomplete or anomalous structure %j', (markdown) => {
    expect(parseNote(markdown, noteFormat('qa'))).toBeNull();
  });

  it('requires all fixed headings in order, Cornell summary, outline structure and a real comparison table', () => {
    expect(parseNote(examples.reading.replace('## 证据', '## 资料'), noteFormat('reading'))).toBeNull();
    expect(parseNote(examples.action.replace('## 目标', '## 前提'), noteFormat('action'))).toBeNull();
    expect(parseNote(examples.cornell.split('## 总结')[0]!, noteFormat('cornell'))).toBeNull();
    expect(parseNote('# 标题\n\n## 章节\n\n只有段落', noteFormat('outline'))).toBeNull();
    expect(parseNote(examples.comparison.replace(table, '无表格'), noteFormat('comparison'))).toBeNull();
    expect(parseNote(examples.comparison.replace(table, '```md\n' + table + '\n```'), noteFormat('comparison'))).toBeNull();
  });

  it('does not split code fences or blockquote headings', () => {
    const appendix = '\n\n```md\n## 问题：伪标题\n# 伪标题\n```\n\n> ## 引用中的标题\n> 正文\n';
    const parsed = parseNote(examples.qa + appendix, noteFormat('qa'))!;
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[1]!.body).toContain(appendix);
  });

  it('preserves formatted headings, images, reference definitions and added paragraphs verbatim', () => {
    const markdown = '# **笔记** [来源][ref]\n\n引言。\n\n## 问题：*如何*看图？\n\n[资料][ref]\n\n![原图][img]\n\n附加段落。\n\n### 图片描述\n\n详细图说。\n\n[ref]: https://example.com "来源"\n[img]: https://example.com/image.png\n';
    const parsed = parseNote(markdown, noteFormat('qa'))!;
    expect(parsed.title).toBe('笔记 来源');
    expect(parsed.titleMarkdown).toBe('# **笔记** [来源][ref]');
    expect(parsed.preamble).toBe('\n\n引言。\n\n');
    expect(parsed.sections[0]!.headingMarkdown).toBe('## 问题：*如何*看图？');
    expect(parsed.sections[0]!.body).toContain('![原图][img]');
    expect(parsed.references).toBe('[ref]: https://example.com "来源"\n\n[img]: https://example.com/image.png');
    expect(parsed.titleMarkdown + parsed.preamble + parsed.sections.map((section) => section.headingMarkdown + section.body).join('')).toBe(markdown);
  });

  it('preserves extra outline headings and falls back on unexpected fixed-template image captions', () => {
    const caption = '\n\n## 图片描述\n\n![图](https://example.com/a.png)\n\n图说正文。';
    expect(parseNote(examples.reading + caption, noteFormat('reading'))).toBeNull();
    const extra = '\n\n## 附录\n\n- 附加内容\n';
    const parsed = parseNote(examples.outline + extra, noteFormat('outline'))!;
    expect(parsed.sections).toHaveLength(3);
    expect(parsed.sections[2]!.body).toContain('附加内容');
  });

  it('retains CRLF source slices', () => {
    const markdown = examples.qa.replaceAll('\n', '\r\n');
    const parsed = parseNote(markdown, noteFormat('qa'))!;
    expect(parsed.titleMarkdown + parsed.preamble + parsed.sections.map((section) => section.headingMarkdown + section.body).join('')).toBe(markdown);
  });

  it.each([
    '\n\n依据[^a]。\n\n[^a]: 参考说明\n    第二行。\n',
    '\n\n> 依据[^a]。\n>\n> [^a]: 引用内的说明\n',
    '\n\n[^unused]: 尚未引用的脚注\n',
  ])('falls back for footnotes anywhere in the document', (appendix) => {
    expect(parseNote(examples.qa + appendix, noteFormat('qa'))).toBeNull();
  });

  it('does not treat fenced footnote syntax as a footnote', () => {
    expect(parseNote(examples.qa + '\n\n```md\n[^a]: 示例\n```', noteFormat('qa'))).not.toBeNull();
  });

  it.each([
    { content: '[资料][ref]', selector: 'a', attribute: 'href', first: 'https://first.example/', second: 'https://second.example/' },
    { content: '![原图][ref]', selector: 'img', attribute: 'src', first: 'https://first.example/image.png', second: 'https://second.example/image.png' },
  ])('keeps the first global $selector definition in every rendered fragment', ({ content, selector, attribute, first, second }) => {
    const markdown = `# ${content}\n\n## 问题：一\n\n${content}\n\n[ref]: ${first}\n\n## 问题：二\n\n${content}\n\n[REF]: ${second}`;
    const parsed = parseNote(markdown, noteFormat('qa'))!;
    const render = (source: string) => new DOMParser().parseFromString(
      renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm], children: source })), 'text/html',
    );
    expect(Array.from(render(markdown).querySelectorAll(selector), (node) => node.getAttribute(attribute))).toEqual([first, first, first]);
    for (const fragment of [parsed.titleMarkdown, ...parsed.sections.map((section) => section.body)]) {
      const document = render(`${parsed.references}\n\n${fragment}`);
      expect(document.querySelector(selector)?.getAttribute(attribute)).toBe(first);
    }
    expect(render(parsed.sections[1]!.body).querySelector(selector)?.getAttribute(attribute)).toBe(second);
  });

  it('keeps unique footnote IDs and all backlinks in the full Markdown fallback', () => {
    const markdown = '# 笔记\n\n## 问题：一\n\n依据[^a]。\n\n## 问题：二\n\n也参考[^a]。\n\n[^a]: 参考说明 [来源][ref] ![图][img]\n    第二行。\n\n[ref]: https://example.com/source\n[img]: https://example.com/image.png';
    expect(parseNote(markdown, noteFormat('qa'))).toBeNull();
    const document = new DOMParser().parseFromString(
      renderToStaticMarkup(createElement(Markdown, { remarkPlugins: [remarkGfm], children: markdown })), 'text/html',
    );
    const ids = Array.from(document.querySelectorAll('[id]'), (node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const references = Array.from(document.querySelectorAll('a[data-footnote-ref]'));
    expect(references).toHaveLength(2);
    expect(references[0]!.id).not.toBe(references[1]!.id);
    const footnote = document.getElementById(references[0]!.getAttribute('href')!.slice(1))!;
    expect(references[1]!.getAttribute('href')).toBe(`#${footnote.id}`);
    expect(footnote.textContent).toContain('参考说明');
    expect(footnote.textContent).toContain('第二行。');
    expect(footnote.querySelector('a')?.getAttribute('href')).toBe('https://example.com/source');
    expect(footnote.querySelector('img')?.getAttribute('src')).toBe('https://example.com/image.png');
    expect(Array.from(footnote.querySelectorAll('a[data-footnote-backref]'), (node) => node.getAttribute('href')))
      .toEqual(references.map((reference) => `#${reference.id}`));
  });
});
