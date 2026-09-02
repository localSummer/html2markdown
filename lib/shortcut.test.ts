import { shortcutLabel, shortcutsPageUrl } from './shortcut';

describe('shortcutsPageUrl', () => {
  it('uses Edge shortcuts page for Edg UA', () => {
    expect(shortcutsPageUrl('Mozilla/5.0 Edg/128.0.0.0')).toBe('edge://extensions/shortcuts');
  });

  it('uses Chrome shortcuts page otherwise', () => {
    expect(shortcutsPageUrl('Mozilla/5.0 Chrome/128.0.0.0')).toBe('chrome://extensions/shortcuts');
  });
});

describe('shortcutLabel', () => {
  it('shows the assigned shortcut', () => {
    expect(shortcutLabel('Alt+Shift+M')).toBe('Alt+Shift+M');
  });

  it('shows 未设置 when empty', () => {
    expect(shortcutLabel('')).toBe('未设置');
    expect(shortcutLabel(undefined)).toBe('未设置');
  });
});
