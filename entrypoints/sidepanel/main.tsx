import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

const port = browser.runtime.connect({ name: 'sidepanel' });

void browser.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
  if (tab?.id !== undefined) {
    port.postMessage({ type: 'SIDEPANEL_READY', tabId: tab.id });
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
