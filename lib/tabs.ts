import type { ExtensionMessage, ExtensionResponse } from './messages';

async function rawSend(tabId: number, message: ExtensionMessage): Promise<ExtensionResponse | undefined> {
  try {
    return (await browser.tabs.sendMessage(tabId, message)) as ExtensionResponse | undefined;
  } catch {
    return undefined;
  }
}

/**
 * 复用的自愈 port：只连一次，所有 ENSURE_INJECTED 请求走同一条。
 * background 在注入完成后回 INJECTED ack；每个请求 2s 超时兜底。
 */
const ensurePort = (() => {
  let port: ReturnType<typeof browser.runtime.connect> | null = null;
  const waiters = new Map<number, Set<(ok: boolean) => void>>();

  const settle = (tabId: number) => {
    const set = waiters.get(tabId);
    if (!set) return;
    waiters.delete(tabId);
    for (const w of set) w(true);
  };

  const onMsg = (msg: { type?: string; tabId?: number }) => {
    if (msg?.type === 'INJECTED' && typeof msg.tabId === 'number') settle(msg.tabId);
  };

  return {
    request(tabId: number): Promise<void> {
      return new Promise((resolve) => {
        let set = waiters.get(tabId);
        if (!set) {
          set = new Set();
          waiters.set(tabId, set);
        }
        const done = () => {
          set!.delete(done);
          clearTimeout(timer);
          resolve();
        };
        set.add(done);
        const timer = setTimeout(done, 2000);
      });
    },
    ensureConnected() {
      if (port) return;
      try {
        port = browser.runtime.connect({ name: 'sidepanel-ensure' });
        port.onMessage.addListener(onMsg);
        port.onDisconnect.addListener(() => {
          port = null;
          const pending = [...waiters.values()];
          waiters.clear();
          for (const set of pending) for (const w of set) w(true);
        });
      } catch {
        port = null;
      }
    },
  };
})();

export async function sendToTab(tabId: number, message: ExtensionMessage): Promise<ExtensionResponse> {
  let res = await rawSend(tabId, message);
  if (!res) {
    // 运行时注册的 content script 可能还没注入到这个 tab，补注入后重试一次
    ensurePort.ensureConnected();
    await ensurePort.request(tabId);
    res = await rawSend(tabId, message);
  }
  if (!res) throw new Error('无法连接当前页，请刷新页面后再扫描');
  return res;
}

export async function getActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}
