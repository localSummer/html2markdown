export type NoteTemplateId = 'cornell' | 'outline' | 'qa' | 'reading' | 'action' | 'comparison';

export type NoteFormat = { templateId: NoteTemplateId; version: 1 };

export const NOTE_TEMPLATES: Array<{
  id: NoteTemplateId;
  label: string;
  instructions: string;
  headings?: readonly string[];
}> = [
  {
    id: 'cornell',
    label: '康奈尔笔记',
    instructions: '一个或多个「## 提示：具体问题」，每个标题下直接写对应的详细笔记。最后以「## 总结」归纳要点。将“具体问题”替换为基于资料的实际问题。',
  },
  {
    id: 'outline',
    label: '大纲笔记',
    instructions: '一个或多个自由命名的「## 章节」，其下用列表或更低层标题组织内容。章节名称应反映原文主题，不要照抄占位词。',
  },
  {
    id: 'qa',
    label: '问答复习笔记',
    instructions: '一个或多个「## 问题：具体问题」，每个标题下直接写答案正文。将“具体问题”替换为基于资料的实际问题。',
  },
  {
    id: 'reading',
    label: '阅读分析笔记',
    instructions: '按顺序使用固定二级标题：## 核心论点、## 证据、## 推理、## 局限与待核实问题。明确区分原文观点与整理推论，整理推论必须标明且有资料依据；每条证据关联对应论点，不要将推论当作原文事实。',
    headings: ['核心论点', '证据', '推理', '局限与待核实问题'],
  },
  {
    id: 'action',
    label: '实践行动笔记',
    instructions: '按顺序使用固定二级标题：## 目标、## 前提、## 步骤、## 验证方法、## 注意事项。「步骤」使用有序列表；「验证方法」按对应步骤编号逐项说明，原文未提供的验证方法明确注明，不要编造。',
    headings: ['目标', '前提', '步骤', '验证方法', '注意事项'],
  },
  {
    id: 'comparison',
    label: '对比决策笔记',
    instructions: '按顺序使用固定二级标题：## 对比对象、## 维度比较、## 适用条件、## 结论。「维度比较」内必须包含 GFM 表格，第一列为维度，后续列为对比对象；缺少对比对象时不得编造对象，明确注明来源不足，仅列原文提供的对象；长内容可在表格后继续使用 Markdown。',
    headings: ['对比对象', '维度比较', '适用条件', '结论'],
  },
];

export function getNoteTemplate(id: string | undefined) {
  return NOTE_TEMPLATES.find((template) => template.id === id);
}

export function noteFormat(templateId: string | undefined): NoteFormat | undefined {
  const template = getNoteTemplate(templateId);
  return template ? { templateId: template.id, version: 1 } : undefined;
}

export function isSupportedNoteFormat(format: unknown): format is NoteFormat {
  if (!format || typeof format !== 'object') return false;
  const candidate = format as Record<string, unknown>;
  return candidate.version === 1 && typeof candidate.templateId === 'string'
    && getNoteTemplate(candidate.templateId) !== undefined;
}
