export type ThemeMode = 'follow_system' | 'light' | 'dark';

export type ModelSlot = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export type Settings = {
  text: ModelSlot;
  vision: ModelSlot;
  visionEnabled: boolean;
  visionUseTextApiKey: boolean;
  visionMaxImages: number;
  historyLimit: number;
  historyMaxAgeDays: number;
  floatingButton: boolean;
  theme: ThemeMode;
  mdFontSize: number;
  maxHtmlChars: number;
};

export const DEFAULT_BASE_URL = 'https://api.deepseek.com/v1';
export const DEFAULT_MD_FONT_SIZE = 14;
export const MD_FONT_SIZES = [12, 13, 14, 15, 16, 17, 18] as const;
export const DEFAULT_MAX_HTML_CHARS = 100_000;

export const DEFAULT_SETTINGS: Settings = {
  text: {
    baseURL: DEFAULT_BASE_URL,
    apiKey: '',
    model: 'deepseek-v4-flash',
  },
  vision: {
    baseURL: DEFAULT_BASE_URL,
    apiKey: '',
    model: 'deepseek-v4-flash-vision-exp',
  },
  visionEnabled: false,
  visionUseTextApiKey: true,
  visionMaxImages: 10,
  historyLimit: 100,
  historyMaxAgeDays: 0,
  floatingButton: true,
  theme: 'follow_system',
  mdFontSize: DEFAULT_MD_FONT_SIZE,
  maxHtmlChars: DEFAULT_MAX_HTML_CHARS,
};

const STORAGE_KEY = 'html2md.settings';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function mergeSlot(raw: unknown, fallback: ModelSlot): ModelSlot {
  if (!isRecord(raw)) return { ...fallback };
  return {
    baseURL: typeof raw.baseURL === 'string' ? raw.baseURL : fallback.baseURL,
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey : fallback.apiKey,
    model: typeof raw.model === 'string' ? raw.model : fallback.model,
  };
}

export function mergeSettings(raw: unknown): Settings {
  if (!isRecord(raw)) return structuredClone(DEFAULT_SETTINGS);
  return {
    text: mergeSlot(raw.text, DEFAULT_SETTINGS.text),
    vision: mergeSlot(raw.vision, DEFAULT_SETTINGS.vision),
    visionEnabled: typeof raw.visionEnabled === 'boolean' ? raw.visionEnabled : DEFAULT_SETTINGS.visionEnabled,
    visionUseTextApiKey:
      typeof raw.visionUseTextApiKey === 'boolean'
        ? raw.visionUseTextApiKey
        : DEFAULT_SETTINGS.visionUseTextApiKey,
    visionMaxImages:
      typeof raw.visionMaxImages === 'number' && raw.visionMaxImages > 0
        ? Math.floor(raw.visionMaxImages)
        : DEFAULT_SETTINGS.visionMaxImages,
    historyLimit:
      typeof raw.historyLimit === 'number' && raw.historyLimit > 0
        ? Math.floor(raw.historyLimit)
        : DEFAULT_SETTINGS.historyLimit,
    historyMaxAgeDays:
      typeof raw.historyMaxAgeDays === 'number' && raw.historyMaxAgeDays >= 0
        ? Math.floor(raw.historyMaxAgeDays)
        : DEFAULT_SETTINGS.historyMaxAgeDays,
    floatingButton:
      typeof raw.floatingButton === 'boolean' ? raw.floatingButton : DEFAULT_SETTINGS.floatingButton,
    theme:
      raw.theme === 'light' || raw.theme === 'dark' || raw.theme === 'follow_system'
        ? raw.theme
        : DEFAULT_SETTINGS.theme,
    mdFontSize:
      typeof raw.mdFontSize === 'number' && (MD_FONT_SIZES as readonly number[]).includes(raw.mdFontSize)
        ? raw.mdFontSize
        : DEFAULT_SETTINGS.mdFontSize,
    maxHtmlChars:
      typeof raw.maxHtmlChars === 'number' && raw.maxHtmlChars >= 0
        ? Math.floor(raw.maxHtmlChars)
        : DEFAULT_SETTINGS.maxHtmlChars,
  };
}

export function resolveVisionApiKey(settings: Settings): string {
  return settings.visionUseTextApiKey ? settings.text.apiKey : settings.vision.apiKey;
}

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return mergeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export function watchSettings(onChange: (settings: Settings) => void): () => void {
  const listener = (changes: { [key: string]: { newValue?: unknown } }, area: string) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    onChange(mergeSettings(changes[STORAGE_KEY].newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
