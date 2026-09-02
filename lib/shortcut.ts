export const ACTION_COMMAND = '_execute_action';

export function shortcutsPageUrl(userAgent: string): string {
  return /\bEdg\//.test(userAgent) ? 'edge://extensions/shortcuts' : 'chrome://extensions/shortcuts';
}

export function shortcutLabel(shortcut: string | undefined): string {
  const s = shortcut?.trim();
  return s || '未设置';
}
