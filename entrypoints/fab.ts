/**
 * 漂浮按钮专用入口：由 scripting.registerContentScripts 持久注册，
 * 只挂按钮 + 转发 OPEN_SIDEPANEL，不承担页面消息代理职责。
 *
 * 注意：WXT 把本文件当 unlisted script 打包（runtime 无 ContentScriptContext，
 * main 不带 ctx 参数），防护逻辑不能依赖 ctx.onInvalidated。
 */
import { loadSettings, watchSettings } from '../lib/settings';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_idle',
  async main() {
    // 注册型注入 + 设置切换时的补注入可能叠加：靠窗口标记让第二份退出。
    // 导航换文档后标记随 window 销毁，无需手动清理。
    const FLAG = '__html2md_fab__';
    const w = window as typeof window & { [FLAG]?: boolean };
    if (w[FLAG]) return;
    w[FLAG] = true;

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
    // 注册注销由设置页驱动；这里监听是为了让已打开页面上的按钮即时消失
    watchSettings((s) => void apply(s.floatingButton));
    // 设置页关闭开关时对已打开页面的广播（storage 监听已覆盖多数场景，双保险）
    browser.runtime.onMessage.addListener((raw: { type?: string }) => {
      if (raw?.type === 'FAB_DISABLE') void apply(false);
    });
  },
});
