import { isExtensionMessage, type ExtensionResponse } from '../lib/messages';

export default defineContentScript({
  // 运行时注册（wxt.config.ts 的 host_permissions 承载 matches）：
  // 脚本只在用户与扩展交互后由 background 注入，不用 <all_urls> 常驻。
  // 漂浮按钮不在这里：它由 fab.ts 单独承担（见 lib/dom/fab-registration.ts）。
  matches: ['http://*/*', 'https://*/*'],
  registration: 'runtime',
  runAt: 'document_idle',
  main(ctx) {
    // SW 被杀重建后 background 可能重复 executeScript：靠窗口标记让第二份
    // 脚本直接退出，避免 onMessage 双监听器导致消息处理两次。
    const FLAG = '__html2md_agent__';
    const w = window as typeof window & { [FLAG]?: boolean };
    if (w[FLAG]) return;
    w[FLAG] = true;

    const listener = (
      raw: unknown,
      _sender: unknown,
      sendResponse: (res: ExtensionResponse) => void,
    ): boolean | undefined => {
      if (!isExtensionMessage(raw)) return;
      if (raw.type === 'PING') {
        sendResponse({ ok: true } satisfies ExtensionResponse);
        return;
      }
      void import('../lib/dom/page-agent')
        .then(({ handlePageMessage }) => handlePageMessage(raw))
        .then((res) => {
          if (ctx.isValid) sendResponse(res);
        })
        .catch((err: unknown) => {
          if (ctx.isValid) {
            sendResponse({
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            } satisfies ExtensionResponse);
          }
        });
      return true;
    };

    browser.runtime.onMessage.addListener(listener);
    // WXT context 失效（扩展更新/重载）时反注册，防止旧监听器残留
    ctx.onInvalidated(() => {
      browser.runtime.onMessage.removeListener(listener);
      delete w[FLAG];
    });
  },
});
