import type { ExtensionMessage, ExtensionResponse } from './messages';

export async function sendToTab(tabId: number, message: ExtensionMessage): Promise<ExtensionResponse> {
  try {
    const res = (await browser.tabs.sendMessage(tabId, message)) as ExtensionResponse | undefined;
    if (!res) throw new Error('empty');
    return res;
  } catch {
    throw new Error('无法连接当前页，请刷新页面后再扫描');
  }
}

export async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}
