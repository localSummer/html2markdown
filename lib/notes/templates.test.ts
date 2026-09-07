import { getNoteTemplate, isSupportedNoteFormat, NOTE_TEMPLATES, noteFormat } from './templates';

describe('note templates', () => {
  it('registers exactly the six versioned formats', () => {
    expect(NOTE_TEMPLATES.map(({ id }) => id)).toEqual(['cornell', 'outline', 'qa', 'reading', 'action', 'comparison']);
    for (const template of NOTE_TEMPLATES) {
      expect(getNoteTemplate(template.id)).toBe(template);
      expect(noteFormat(template.id)).toEqual({ templateId: template.id, version: 1 });
      expect(isSupportedNoteFormat(noteFormat(template.id))).toBe(true);
    }
  });

  it.each([undefined, 'plain', '', 'unknown'])('does not assign a format to %s', (id) => {
    expect(noteFormat(id)).toBeUndefined();
    expect(getNoteTemplate(id)).toBeUndefined();
  });

  it('uses the confirmed template names', () => {
    expect(NOTE_TEMPLATES.map(({ label }) => label)).toEqual([
      '康奈尔笔记', '大纲笔记', '问答复习笔记', '阅读分析笔记', '实践行动笔记', '对比决策笔记',
    ]);
  });

  it('ties evidence and inferences to source claims in reading notes', () => {
    const instructions = getNoteTemplate('reading')!.instructions;
    expect(instructions).toContain('明确区分原文观点与整理推论');
    expect(instructions).toContain('整理推论必须标明且有资料依据');
    expect(instructions).toContain('每条证据关联对应论点');
  });

  it('numbers action steps and matches their verification methods', () => {
    const instructions = getNoteTemplate('action')!.instructions;
    expect(instructions).toContain('「步骤」使用有序列表');
    expect(instructions).toContain('「验证方法」按对应步骤编号逐项说明');
    expect(instructions).toContain('原文未提供的验证方法明确注明，不要编造');
  });

  it('defines comparison columns without inventing missing objects', () => {
    const instructions = getNoteTemplate('comparison')!.instructions;
    expect(instructions).toContain('第一列为维度，后续列为对比对象');
    expect(instructions).toContain('缺少对比对象时不得编造对象');
    expect(instructions).toContain('明确注明来源不足');
  });

  it.each([null, undefined, 'cornell', [], {}, { templateId: 'plain', version: 1 }, { templateId: 'qa', version: 2 }, { templateId: 'qa', version: '1' }])('rejects unsupported metadata %j', (format) => {
    expect(isSupportedNoteFormat(format)).toBe(false);
  });
});
