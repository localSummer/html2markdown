import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeftRight, History, Settings as SettingsIcon } from 'lucide-react';
import { pruneOldRecords } from '../../lib/history/db';
import { DEFAULT_SETTINGS, loadSettings, watchSettings, type Settings } from '../../lib/settings';
import { applyMdFontSize, applyTheme } from '../../lib/theme';
import { cn } from '@/lib/utils';
import { ConvertTab } from './tabs/ConvertTab';
import { HistoryTab } from './tabs/HistoryTab';
import { SettingsTab } from './tabs/SettingsTab';

type TabId = 'convert' | 'history' | 'settings';

const TABS: { id: TabId; label: string; icon: typeof History }[] = [
  { id: 'convert', label: '转换', icon: ArrowLeftRight },
  { id: 'history', label: '历史', icon: History },
  { id: 'settings', label: '设置', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('convert');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    void loadSettings().then((s) => {
      setSettings(s);
      applyTheme(s.theme);
      applyMdFontSize(s.mdFontSize);
      void pruneOldRecords(s.historyMaxAgeDays);
    });
    return watchSettings((s) => {
      setSettings(s);
      applyTheme(s.theme);
      applyMdFontSize(s.mdFontSize);
      void pruneOldRecords(s.historyMaxAgeDays);
    });
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(settings.theme);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  useEffect(() => {
    applyMdFontSize(settings.mdFontSize);
  }, [settings.mdFontSize]);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const i = TABS.findIndex((t) => t.id === tab);
      const btn = btnRefs.current[i];
      if (!btn) return;
      setIndicator({
        left: btn.offsetLeft + 8,
        width: Math.max(12, btn.offsetWidth - 16),
      });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => ro.disconnect();
  }, [tab]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="shrink-0 border-b bg-gradient-to-b from-card to-background/60 backdrop-blur">
        <div className="flex items-center gap-1 px-2 pt-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 text-[10px] font-bold text-primary-foreground shadow-[0_2px_6px_-1px_var(--color-primary)/40]">
            M
          </div>
          <span className="text-sm font-semibold tracking-tight">HTML2MD</span>
        </div>
        <nav ref={navRef} className="relative mt-1 flex gap-1 px-2">
          {TABS.map((t, i) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <t.icon className="size-4" />
                {t.label}
              </button>
            );
          })}
          <span
            aria-hidden
            className="html2md-tab-indicator"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />
        </nav>
      </header>
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="html2md-tab-panel overflow-hidden"
          data-active={tab === 'convert' ? 'true' : 'false'}
          aria-hidden={tab !== 'convert'}
          inert={tab !== 'convert'}
        >
          <ConvertTab settings={settings} onOpenSettings={() => setTab('settings')} active={tab === 'convert'} />
        </div>
        <div
          className="html2md-tab-panel overflow-hidden"
          data-active={tab === 'history' ? 'true' : 'false'}
          aria-hidden={tab !== 'history'}
          inert={tab !== 'history'}
        >
          <HistoryTab active={tab === 'history'} />
        </div>
        <div
          className="html2md-tab-panel overflow-hidden"
          data-active={tab === 'settings' ? 'true' : 'false'}
          aria-hidden={tab !== 'settings'}
          inert={tab !== 'settings'}
        >
          <SettingsTab settings={settings} onChange={setSettings} active={tab === 'settings'} />
        </div>
      </main>
    </div>
  );
}
