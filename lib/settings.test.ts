import { mergeSettings, resolveVisionApiKey, DEFAULT_SETTINGS } from './settings';

describe('mergeSettings', () => {
  it('returns defaults for empty input', () => {
    const s = mergeSettings(undefined);
    expect(s.text.model).toBe('deepseek-v4-flash');
    expect(s.vision.model).toBe('deepseek-v4-flash-vision-exp');
    expect(s.visionEnabled).toBe(false);
    expect(s.visionUseTextApiKey).toBe(true);
    expect(s.visionMaxImages).toBe(10);
    expect(s.historyLimit).toBe(100);
    expect(s.historyMaxAgeDays).toBe(0);
    expect(s.floatingButton).toBe(true);
    expect(s.theme).toBe('follow_system');
    expect(s.mdFontSize).toBe(14);
  });

  it('keeps valid overrides', () => {
    const s = mergeSettings({
      text: { apiKey: 'k', model: 'custom', baseURL: 'http://localhost:11434/v1' },
      visionMaxImages: 3.8,
      mdFontSize: 16,
    });
    expect(s.text.apiKey).toBe('k');
    expect(s.text.model).toBe('custom');
    expect(s.visionMaxImages).toBe(3);
    expect(s.mdFontSize).toBe(16);
  });

  it('falls back to default mdFontSize when invalid', () => {
    expect(mergeSettings({ mdFontSize: 11 }).mdFontSize).toBe(14);
    expect(mergeSettings({ mdFontSize: '16' }).mdFontSize).toBe(14);
  });
});

describe('resolveVisionApiKey', () => {
  it('inherits text key when toggle is on', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      text: { ...DEFAULT_SETTINGS.text, apiKey: 'text-key' },
      vision: { ...DEFAULT_SETTINGS.vision, apiKey: 'vision-key' },
      visionUseTextApiKey: true,
    };
    expect(resolveVisionApiKey(s)).toBe('text-key');
  });

  it('uses vision key when toggle is off', () => {
    const s = {
      ...DEFAULT_SETTINGS,
      text: { ...DEFAULT_SETTINGS.text, apiKey: 'text-key' },
      vision: { ...DEFAULT_SETTINGS.vision, apiKey: 'vision-key' },
      visionUseTextApiKey: false,
    };
    expect(resolveVisionApiKey(s)).toBe('vision-key');
  });
});
