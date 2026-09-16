/**
 * 漂浮按钮的动态 content script 注册。
 *
 * MV3 商店合规模型：主 content script 用 registration: 'runtime'（只随用户手势注入），
 * 漂浮按钮作为可选功能，开启时才通过 scripting.registerContentScripts 持久注册，
 * 关闭时注销。浏览器重启后 Chrome 自动恢复注册，无需 storage 标记。
 *
 * 注册只对新导航生效（Chrome 114 无 injectImmediately）：
 * 设置切换时由调用方对已打开页面补一次 executeScript / CLEAR。
 */
const FAB_SCRIPT_ID = 'html2md-fab';
const FAB_SCRIPT_PATH = '/fab.js';

async function isRegistered(): Promise<boolean> {
  const existing = await browser.scripting.getRegisteredContentScripts();
  return existing.some((s) => s.id === FAB_SCRIPT_ID);
}

export async function setFabScriptEnabled(enabled: boolean): Promise<void> {
  if (!enabled) {
    try {
      await browser.scripting.unregisterContentScripts({ ids: [FAB_SCRIPT_ID] });
    } catch {
      /* 未注册时注销报错，忽略 */
    }
    return;
  }
  try {
    if (await isRegistered()) return;
    await browser.scripting.registerContentScripts([
      {
        id: FAB_SCRIPT_ID,
        js: [FAB_SCRIPT_PATH],
        matches: ['http://*/*', 'https://*/*'],
        runAt: 'document_idle',
        persistAcrossSessions: true,
      },
    ]);
  } catch {
    /* 注册失败（如无权限）保持无按钮状态 */
  }
}

/** 设置切换后对已打开页面立即生效：开启=补注入，关闭=通知已注入页自行卸载。 */
export async function applyFabToOpenTabs(enabled: boolean): Promise<void> {
  const tabs = await browser.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (tab.id === undefined) continue;
    if (enabled) {
      // fab.js 的 main() 会先读 storage：开关真实状态由 storage 决定，
      // 这里补注入只是让它尽快出现在已打开页面上
      void browser.scripting.executeScript({ target: { tabId: tab.id }, files: [FAB_SCRIPT_PATH] }).catch(() => {});
    } else {
      void browser.tabs.sendMessage(tab.id, { type: 'FAB_DISABLE' } as never).catch(() => {});
    }
  }
}
