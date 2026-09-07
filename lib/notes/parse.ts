import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { getNoteTemplate, isSupportedNoteFormat, type NoteFormat } from './templates';

export type ParsedNote = {
  format: NoteFormat;
  title: string;
  titleMarkdown: string;
  preamble: string;
  sections: Array<{ heading: string; headingMarkdown: string; body: string }>;
  references: string;
};

const parser = unified().use(remarkParse).use(remarkGfm);
type Node = ReturnType<typeof parser.parse>['children'][number];
type TextNode = { type: string; value?: string; alt?: string | null; children?: readonly TextNode[] };

function text(node: TextNode): string {
  if (node.children) return node.children.map(text).join('');
  return node.value ?? node.alt ?? '';
}

function hasContent(nodes: Node[]): boolean {
  return nodes.some((node) => {
    if (['heading', 'definition', 'footnoteDefinition', 'thematicBreak'].includes(node.type)) return false;
    if (node.type === 'html') return node.value.replace(/<!--[\s\S]*?-->/g, '').trim().length > 0;
    if (node.type === 'code') return node.value.trim().length > 0;
    return text(node).trim().length > 0 || node.type === 'table'
      || (node.type === 'paragraph' && node.children.some((child) => child.type === 'image' || child.type === 'imageReference'));
  });
}

export function parseNote(markdown: string, format: unknown): ParsedNote | null {
  if (!isSupportedNoteFormat(format)) return null;
  const root = parser.parse(markdown);
  const nodes = root.children;
  const title = nodes[0];
  if (!title || title.type !== 'heading' || title.depth !== 1 || !text(title).trim()) return null;
  const source = (node: Node) => markdown.slice(node.position!.start.offset!, node.position!.end.offset!);
  if (!/^ {0,3}#\s/.test(source(title))) return null;
  if (nodes.slice(1).some((node) => node.type === 'heading' && node.depth === 1)) return null;

  const starts = nodes.flatMap((node, index) => node.type === 'heading' && node.depth === 2 ? [index] : []);
  if (!starts.length) return null;
  const sectionNodes = starts.map((start, index) => nodes.slice(start + 1, starts[index + 1] ?? nodes.length));
  const sections = starts.map((start, index) => {
    const heading = nodes[start]!;
    const next = nodes[starts[index + 1] ?? nodes.length];
    return {
      heading: text(heading).trim(),
      headingMarkdown: source(heading),
      body: markdown.slice(heading.position!.end.offset!, next?.position?.start.offset ?? markdown.length),
    };
  });
  if (sections.some((section, index) => !section.heading || !/^ {0,3}##\s/.test(section.headingMarkdown) || !hasContent(sectionNodes[index]!))) return null;

  const headings = sections.map((section) => section.heading);
  const template = getNoteTemplate(format.templateId)!;
  if (template.headings && (headings.length !== template.headings.length || headings.some((heading, index) => heading !== template.headings![index]))) return null;
  if (format.templateId === 'cornell' && (headings.length < 2 || headings.at(-1) !== '总结' || headings.slice(0, -1).some((heading) => !/^提示：\s*\S/.test(heading)))) return null;
  if (format.templateId === 'qa' && headings.some((heading) => !/^问题：\s*\S/.test(heading))) return null;
  if (format.templateId === 'outline' && sectionNodes.some((children) => !children.some((node) => node.type === 'list' || (node.type === 'heading' && node.depth > 2)))) return null;
  if (format.templateId === 'comparison' && !sectionNodes[1]!.some((node) => node.type === 'table' && node.children.length > 1)) return null;

  const definitions: string[] = [];
  let hasFootnotes = false;
  function collect(node: { type: string; children?: readonly unknown[] }) {
    if (node.type === 'definition') definitions.push(source(node as Node));
    if (node.type === 'footnoteDefinition' || node.type === 'footnoteReference') hasFootnotes = true;
    node.children?.forEach((child) => collect(child as Parameters<typeof collect>[0]));
  }
  collect(root);
  if (hasFootnotes) return null;
  return {
    format: { templateId: format.templateId, version: 1 },
    title: text(title).trim(),
    titleMarkdown: source(title),
    preamble: markdown.slice(0, title.position!.start.offset!) + markdown.slice(title.position!.end.offset!, nodes[starts[0]!]!.position!.start.offset!),
    sections,
    references: definitions.join('\n\n'),
  };
}
