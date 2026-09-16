import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

// SW 被杀后 port 断开：重连并重发 SIDEPANEL_READY，
// 否则 background 的 openTabIds 清空后 syncTab 会把侧栏 disable
function connectPort() {
  const port = browser.runtime.connect({ name: 'sidepanel' });

  const announce = () => {
    void browser.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      if (tab?.id !== undefined) {
        port.postMessage({ type: 'SIDEPANEL_READY', tabId: tab.id });
      }
    });
  };

  port.onDisconnect.addListener(() => {
    // 100ms 防抖：扩展更新时旧 SW 关闭、新 SW 起来的间隙
    setTimeout(connectPort, 100);
  });

  announce();
}

connectPort();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
