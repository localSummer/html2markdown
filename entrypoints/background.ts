const PANEL_PATH = 'sidepanel.html';
const CONTENT_SCRIPT_PATH = '/content-scripts/content.js';

export default defineBackground(() => {
  const openTabIds = new Set<number>();
  // 注入完成（executeScript 成功返回）的 tab；导航换文档后从中剔除
  const injectedTabIds = new Set<number>();
  // 正在飞行中的注入 Promise：并发的 ENSURE_INJECTED 等同一个，不空 ACK
  const inflightInjections = new Map<number, Promise<void>>();
  let lastOpenedTabId: number | undefined;
  let ignoreClosedUntil = 0;

  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  void browser.sidePanel.setOptions({ enabled: false, path: PANEL_PATH });

  // SW 每次启动都同步漂浮按钮注册状态：没打开过侧栏的用户也能看到按钮
  void (async () => {
    const { loadSettings } = await import('../lib/settings');
    const { setFabScriptEnabled } = await import('../lib/dom/fab-registration');
    const settings = await loadSettings();
    await setFabScriptEnabled(settings.floatingButton);
  })();

  // 用户手势（图标 / 漂浮按钮 / 快捷键）后注入 content script。
  // activeTab 语义：只碰用户正在看的那一页，不做 <all_urls> 常驻注入。
  function injectIntoTab(tabId: number): Promise<void> {
    const done = injectedTabIds.has(tabId);
    const inflight = inflightInjections.get(tabId);
    if (done || inflight) return inflight ?? Promise.resolve();
    const p = browser.scripting
      .executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT_PATH],
      })
      .then(() => {
        // executeScript 成功返回才算注入完成；失败不入 Set，下次还能重试
        injectedTabIds.add(tabId);
      })
      .catch(() => {
        /* 注入失败（受限页面等）：不入 Set，调用方靠 sendMessage 失败兜底 */
      })
      .finally(() => {
        inflightInjections.delete(tabId);
      });
    inflightInjections.set(tabId, p);
    return p;
  }

  function markEnabled(tabId: number): void {
    openTabIds.add(tabId);
    lastOpenedTabId = tabId;
    void browser.sidePanel.setOptions({ tabId, path: PANEL_PATH, enabled: true });
    void injectIntoTab(tabId);
  }

  function openForTab(tabId: number): void {
    markEnabled(tabId);
    // 必须在用户手势同步栈里调用，前面不能 await
    void browser.sidePanel.open({ tabId });
  }

  function disableTab(tabId: number): void {
    openTabIds.delete(tabId);
    void browser.sidePanel.setOptions({ tabId, enabled: false });
    void browser.tabs.sendMessage(tabId, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
  }

  async function syncTab(tabId: number): Promise<void> {
    await browser.sidePanel.setOptions({
      tabId,
      path: PANEL_PATH,
      enabled: openTabIds.has(tabId),
    });
  }

  function onPanelClosed(ownerTabId: number | undefined): void {
    if (ownerTabId === undefined) return;
    // 等 onActivated 先跑：切 tab 导致的卸载不要当成用户关掉侧栏
    setTimeout(() => {
      if (Date.now() < ignoreClosedUntil) return;
      void browser.tabs.query({ active: true, lastFocusedWindow: true }).then(([active]) => {
        if (active?.id !== ownerTabId) return;
        disableTab(ownerTabId);
      });
    }, 80);
  }

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'sidepanel' && port.name !== 'sidepanel-ensure') return;
    let ownerTabId = lastOpenedTabId;
    port.onMessage.addListener((msg: { type?: string; tabId?: number }) => {
      if (msg?.type === 'SIDEPANEL_READY' && typeof msg.tabId === 'number') {
        ownerTabId = msg.tabId;
      }
      // 侧栏切到未注入的 tab 时自愈：注入完成后再回一个 ack
      if (msg?.type === 'ENSURE_INJECTED' && typeof msg.tabId === 'number') {
        void injectIntoTab(msg.tabId).then(() => {
          port.postMessage({ type: 'INJECTED', tabId: msg.tabId });
        });
      }
    });
    port.onDisconnect.addListener(() => {
      if (port.name !== 'sidepanel') return;
      onPanelClosed(ownerTabId);
    });
  });

  browser.runtime.onMessage.addListener((msg, sender) => {
    if (msg?.type === 'OPEN_SIDEPANEL') {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) openForTab(tabId);
    }
    return false;
  });

  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return;
    if (openTabIds.has(tab.id)) {
      disableTab(tab.id);
      return;
    }
    openForTab(tab.id);
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    ignoreClosedUntil = Date.now() + 400;
    void syncTab(tabId);
  });

  // 同 tab 导航（点链接/跳转）会销毁 executeScript 注入的 content script，
  // 注册型 fab.js 由浏览器自动重注入、不受影响。这里把导航的 tab 从
  // injectedTabIds 剔除，让下一次 sendToTab 走真实的补注入而不是空 ACK。
  browser.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'loading') {
      injectedTabIds.delete(tabId);
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    openTabIds.delete(tabId);
    injectedTabIds.delete(tabId);
  });
});
