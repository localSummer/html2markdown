import { isExtensionMessage, type ExtensionResponse } from '../lib/messages';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  async main() {
    const { loadSettings, watchSettings } = await import('../lib/settings');
    const { mountFloatingButton, unmountFloatingButton } = await import('../lib/dom/floating-button');

    let mounted = false;
    const apply = async (enabled: boolean) => {
      if (enabled && !mounted) {
        await mountFloatingButton();
        mounted = true;
      } else if (!enabled && mounted) {
        unmountFloatingButton();
        mounted = false;
      }
    };

    const settings = await loadSettings();
    await apply(settings.floatingButton);
    watchSettings((s) => void apply(s.floatingButton));

    browser.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
      if (!isExtensionMessage(raw)) return;
      if (raw.type === 'PING') {
        sendResponse({ ok: true } satisfies ExtensionResponse);
        return;
      }
      void import('../lib/dom/page-agent')
        .then(({ handlePageMessage }) => handlePageMessage(raw))
        .then((res) => sendResponse(res))
        .catch((err: unknown) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          } satisfies ExtensionResponse);
        });
      return true;
    });
  },
});
