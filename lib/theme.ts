import type { ThemeMode } from './settings';
import { DEFAULT_MD_FONT_SIZE } from './settings';

function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveDarkClass(theme: ThemeMode, prefersDark = systemPrefersDark()): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return prefersDark;
}

export function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolveDarkClass(theme));
}

export function applyMdFontSize(px: number): void {
  document.documentElement.style.setProperty(
    '--html2md-md-font',
    `${px > 0 ? px : DEFAULT_MD_FONT_SIZE}px`,
  );
}
