const PANEL_PATH = 'sidepanel.html';

export default defineBackground(() => {
  const openTabIds = new Set<number>();
  let lastOpenedTabId: number | undefined;
  let ignoreClosedUntil = 0;

  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  void browser.sidePanel.setOptions({ enabled: false, path: PANEL_PATH });

  function markEnabled(tabId: number): void {
    openTabIds.add(tabId);
    lastOpenedTabId = tabId;
    void browser.sidePanel.setOptions({ tabId, path: PANEL_PATH, enabled: true });
  }

  function openForTab(tabId: number): void {
    markEnabled(tabId);
    // 必须在用户手势同步栈里调用，前面不能 await
    void browser.sidePanel.open({ tabId });
  }

  function disableTab(tabId: number): void {
    openTabIds.delete(tabId);
    void browser.sidePanel.setOptions({ tabId, enabled: false });
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
    if (port.name !== 'sidepanel') return;
    let ownerTabId = lastOpenedTabId;
    port.onMessage.addListener((msg: { type?: string; tabId?: number }) => {
      if (msg?.type === 'SIDEPANEL_READY' && typeof msg.tabId === 'number') {
        ownerTabId = msg.tabId;
      }
    });
    port.onDisconnect.addListener(() => {
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

  browser.tabs.onRemoved.addListener((tabId) => {
    openTabIds.delete(tabId);
  });
});
