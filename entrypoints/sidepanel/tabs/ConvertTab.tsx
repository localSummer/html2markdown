import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText, downloadMarkdown } from '../../../lib/export';
import { addRecord, findLatestByUrl } from '../../../lib/history/db';
import { convertHtmlToMarkdown } from '../../../lib/llm/convert';
import { chatCompletions } from '../../../lib/llm/client';
import { assertWithinLimit, VISION_IMAGE_PROMPT } from '../../../lib/llm/prompt';
import { refineReadableHtml } from '../../../lib/dom/readability';
import type { ImageMeta, RegionType } from '../../../lib/messages';
import { getUnsupportedReason } from '../../../lib/page-support';
import { resolveVisionApiKey, type Settings } from '../../../lib/settings';
import { getActiveTab, sendToTab } from '../../../lib/tabs';
import {
  compressDataUrl,
  formatVisionHint,
  insertCaptions,
  selectVisionImages,
} from '../../../lib/vision/images';
import { ConvertTabUI } from './ConvertTabUI.tsx';
import { FRESH_STATE, type Phase, type TabState } from './convert-types.ts';

type SessionSnap = Pick<TabState, 'phase' | 'regions' | 'selected' | 'picked' | 'taskPrompt'>;

type TabRefs = {
  markdown: string;
  abort: AbortController | null;
  scanGen: number;
  paintTimer: ReturnType<typeof setTimeout> | null;
  sessionSnap: SessionSnap | null;
  inflight: 'scan' | 'pick' | null;
};

function captureSession(s: TabState, dropCustom: boolean): SessionSnap {
  if (dropCustom && (s.selected === 'custom' || s.picked)) {
    const phase: Phase =
      s.markdown && (s.phase === 'done' || s.phase === 'cancelled') ? s.phase : 'idle';
    return { phase, regions: [], selected: 'main', picked: null, taskPrompt: '' };
  }
  const phase: Phase =
    s.phase === 'scanning' || s.phase === 'picking' || s.phase === 'converting'
      ? s.regions.length || s.picked
        ? 'ready'
        : s.markdown
          ? 'done'
          : 'idle'
      : s.phase;
  return {
    phase,
    regions: s.regions,
    selected: s.selected,
    picked: dropCustom ? null : s.picked,
    taskPrompt: s.taskPrompt,
  };
}

export function ConvertTab({
  settings,
  onOpenSettings,
}: {
  settings: Settings;
  onOpenSettings: () => void;
}) {
  const [activeTabId, setActiveTabId] = useState<number | undefined>();
  const [states, setStates] = useState<Record<number, TabState>>({});
  const [previewMode, setPreviewMode] = useState<'preview' | 'source'>('preview');
  const [highlightOn, setHighlightOn] = useState(true);
  const refsRef = useRef<Map<number, TabRefs>>(new Map());
  const prevActiveRef = useRef<number | undefined>(undefined);

  const active = activeTabId !== undefined ? states[activeTabId] : undefined;

  const getRefs = useCallback((id: number): TabRefs => {
    let r = refsRef.current.get(id);
    if (!r) {
      r = { markdown: '', abort: null, scanGen: 0, paintTimer: null, sessionSnap: null, inflight: null };
      refsRef.current.set(id, r);
    }
    return r;
  }, []);

  const patchState = useCallback((id: number, patch: Partial<TabState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? FRESH_STATE), ...patch } }));
  }, []);

  const resetTabScan = useCallback(
    (id: number) => {
      const r = getRefs(id);
      r.scanGen += 1;
      r.abort?.abort();
      r.abort = null;
      r.markdown = '';
      r.sessionSnap = null;
      r.inflight = null;
      if (r.paintTimer != null) {
        clearTimeout(r.paintTimer);
        r.paintTimer = null;
      }
      patchState(id, {
        regions: [],
        picked: null,
        taskPrompt: '',
        markdown: '',
        phase: 'idle',
        status: '',
        error: '',
        visionHint: '',
        progress: 0,
        fromHistory: false,
      });
      void sendToTab(id, { type: 'PICK_CANCEL', forget: true }).catch(() => {});
      void sendToTab(id, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
    },
    [getRefs, patchState],
  );

  const hydrateFromHistory = useCallback(
    async (id: number, url: string | undefined) => {
      if (!url) return;
      const rec = await findLatestByUrl(url);
      if (!rec) return;
      setStates((prev) => {
        const cur = prev[id];
        if (!cur || cur.tabUrl !== url) return prev;
        if (cur.phase === 'scanning' || cur.phase === 'converting' || cur.phase === 'picking') return prev;
        if (cur.regions.length > 0 || cur.picked || (cur.markdown && !cur.fromHistory)) return prev;
        const r = getRefs(id);
        r.markdown = rec.markdown;
        return {
          ...prev,
          [id]: {
            ...cur,
            pageTitle: rec.title || cur.pageTitle,
            markdown: rec.markdown,
            selected: rec.regionType,
            phase: 'done',
            status: '',
            error: '',
            progress: 0,
            fromHistory: true,
          },
        };
      });
    },
    [getRefs],
  );

  useEffect(() => {
    const sync = async () => {
      const tab = await getActiveTab();
      const nextId = tab?.id;
      const nextUrl = tab?.url;
      if (nextId === undefined) return;
      setStates((prev) => {
        const cur = prev[nextId] ?? FRESH_STATE;
        const urlChanged = cur.tabUrl !== nextUrl;
        let nextEntry: TabState = {
          ...cur,
          tabUrl: nextUrl,
          pageTitle: tab?.title ?? '',
          unsupported: getUnsupportedReason(nextUrl),
        };
        if (urlChanged) {
          const r = getRefs(nextId);
          r.scanGen += 1;
          r.abort?.abort();
          r.abort = null;
          r.markdown = '';
          r.sessionSnap = null;
      r.inflight = null;
          if (r.paintTimer != null) {
            clearTimeout(r.paintTimer);
            r.paintTimer = null;
          }
          nextEntry = {
            ...nextEntry,
            regions: [],
            picked: null,
            taskPrompt: '',
            markdown: '',
            phase: 'idle',
            status: '',
            error: '',
            visionHint: '',
            progress: 0,
            fromHistory: false,
          };
          void sendToTab(nextId, { type: 'PICK_CANCEL', forget: true }).catch(() => {});
          void sendToTab(nextId, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
        }
        return { ...prev, [nextId]: nextEntry };
      });
      setActiveTabId(nextId);
      void hydrateFromHistory(nextId, nextUrl);
    };
    void sync();
    const onActivated = () => void sync();
    const onUpdated = (id: number, info: { url?: string; status?: string }) => {
      if (info.url) {
        resetTabScan(id);
        void getActiveTab().then((t) => {
          if (t?.id === id) {
            patchState(id, {
              tabUrl: t.url,
              pageTitle: t.title ?? '',
              unsupported: getUnsupportedReason(t.url),
            });
            void hydrateFromHistory(id, t.url);
          }
        });
      } else if (info.status === 'complete') {
        void sync();
      }
    };
    const onRemoved = (id: number) => {
      setStates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refsRef.current.delete(id);
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.tabs.onRemoved.addListener(onRemoved);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.tabs.onRemoved.removeListener(onRemoved);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const prev = prevActiveRef.current;
    if (prev !== undefined && prev !== activeTabId) {
      void sendToTab(prev, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
    }
    if (highlightOn && activeTabId !== undefined && active && (active.regions.length > 0 || active.selected === 'custom')) {
      void sendToTab(activeTabId, { type: 'HIGHLIGHT', region: active.selected }).catch(() => {});
    }
    prevActiveRef.current = activeTabId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  if (activeTabId === undefined || active === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        请打开一个网页后使用。
      </div>
    );
  }

  const id = activeTabId;
  const refs = getRefs(id);
  const phase = active.phase;
  const busy = phase === 'scanning' || phase === 'converting' || phase === 'picking';
  const canConvert =
    Boolean(settings.text.apiKey) && phase !== 'scanning' && phase !== 'picking' && !active.unsupported;
  const complete = phase === 'done';
  const selectedRegion = active.regions.find((r) => r.id === active.selected);
  const preVisionHint =
    settings.visionEnabled && selectedRegion
      ? formatVisionHint(
          selectedRegion.imageTotal,
          selectedRegion.imageDecorative,
          settings.visionMaxImages,
        )
      : '';
  const displayVisionHint = active.visionHint || preVisionHint;

  const highlight = async (region: RegionType | null) => {
    if (!highlightOn || region === null) {
      if (activeTabId !== undefined) {
        await sendToTab(activeTabId, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
      }
      return;
    }
    try {
      await sendToTab(id, { type: 'HIGHLIGHT', region });
    } catch {
      /* ignore */
    }
  };

  const toggleHighlight = (on: boolean) => {
    setHighlightOn(on);
    if (!on && activeTabId !== undefined) {
      void sendToTab(activeTabId, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
    } else if (on && activeTabId !== undefined && active && (active.regions.length > 0 || active.selected === 'custom')) {
      void sendToTab(activeTabId, { type: 'HIGHLIGHT', region: active.selected }).catch(() => {});
    }
  };

  const restoreSession = () => {
    refs.inflight = null;
    const snap = refs.sessionSnap;
    refs.sessionSnap = null;
    if (!snap) {
      patchState(id, {
        phase: 'idle',
        status: '',
        error: '',
        regions: [],
        picked: null,
        selected: 'main',
        progress: 0,
      });
      void sendToTab(id, { type: 'CLEAR_HIGHLIGHT' }).catch(() => {});
      return;
    }
    patchState(id, { ...snap, status: '', error: '', progress: 0 });
    const region = snap.picked ? 'custom' : snap.regions.length ? snap.selected : null;
    void highlight(region);
  };

  const scan = async () => {
    if (active.unsupported || refs.inflight) return;
    const gen = ++refs.scanGen;
    refs.inflight = 'scan';
    refs.sessionSnap = captureSession(active, true);
    void sendToTab(id, { type: 'PICK_CANCEL', forget: true }).catch(() => {});
    patchState(id, {
      phase: 'scanning',
      status: '扫描中…',
      error: '',
      progress: 0,
      regions: [],
      picked: null,
      taskPrompt: '',
      selected: active.selected === 'custom' ? 'main' : active.selected,
    });
    try {
      const ping = await sendToTab(id, { type: 'PING' });
      if (gen !== refs.scanGen) return;
      if (!ping.ok) throw new Error(ping.error);
      const res = await sendToTab(id, { type: 'SCAN' });
      if (gen !== refs.scanGen) return;
      if (!res.ok || !('regions' in res)) throw new Error(res.ok ? '扫描失败' : res.error);
      refs.sessionSnap = null;
      refs.inflight = null;
      const first = res.regions[0]?.id ?? 'full';
      patchState(id, {
        pageTitle: res.title,
        regions: res.regions,
        selected: first,
        picked: null,
        taskPrompt: '',
        phase: 'ready',
        status: '',
        progress: 0,
      });
      await highlight(first);
    } catch (err) {
      if (gen !== refs.scanGen) return;
      restoreSession();
      patchState(id, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const cancelScan = () => {
    refs.scanGen += 1;
    restoreSession();
  };

  const pick = async () => {
    if (active.unsupported || refs.inflight) return;
    const gen = ++refs.scanGen;
    refs.inflight = 'pick';
    refs.abort?.abort();
    refs.sessionSnap = captureSession(active, false);
    patchState(id, {
      phase: 'picking',
      status: '请在页面上点击要转换的区域',
      error: '',
      progress: 0,
      regions: [],
      picked: null,
    });
    try {
      const ping = await sendToTab(id, { type: 'PING' });
      if (gen !== refs.scanGen) return;
      if (!ping.ok) throw new Error(ping.error);
      const res = await sendToTab(id, { type: 'PICK_START' });
      if (gen !== refs.scanGen) return;
      if (!res.ok) {
        if (res.error === '已取消') {
          restoreSession();
          return;
        }
        throw new Error(res.error);
      }
      if (!('tag' in res)) throw new Error('点选失败');
      refs.sessionSnap = null;
      refs.inflight = null;
      patchState(id, {
        selected: 'custom',
        picked: { tag: res.tag, charCount: res.charCount },
        regions: [],
        phase: 'ready',
        status: '',
      });
      await highlight('custom');
    } catch (err) {
      if (gen !== refs.scanGen) return;
      restoreSession();
      patchState(id, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const cancelPick = () => {
    refs.scanGen += 1;
    void sendToTab(id, { type: 'PICK_CANCEL' }).catch(() => {});
    restoreSession();
  };

  const runVision = async (htmlImages: ImageMeta[], md: string, signal: AbortSignal) => {
    const { selected: picked } = selectVisionImages(htmlImages, settings.visionMaxImages);
    if (picked.length === 0) return md;
    const fetched = await sendToTab(id, { type: 'FETCH_IMAGES', urls: picked.map((i) => i.src) });
    if (!fetched.ok || !('images' in fetched) || 'html' in fetched) return md;
    const captions: Array<{ url: string; text: string }> = [];
    let failed = 0;
    const key = resolveVisionApiKey(settings);
    const total = fetched.images.length;
    let done = 0;
    for (const image of fetched.images) {
      if (signal.aborted) throw new DOMException('已取消', 'AbortError');
      patchState(id, {
        status: `正在识别图片 ${done + 1}/${total}…`,
        progress: 86 + Math.floor((done / Math.max(total, 1)) * 10),
      });
      try {
        const compressed = await compressDataUrl(image.dataUrl);
        const text = await chatCompletions({
          baseURL: settings.vision.baseURL,
          apiKey: key,
          model: settings.vision.model,
          stream: false,
          signal,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: VISION_IMAGE_PROMPT },
                { type: 'image_url', image_url: { url: compressed } },
              ],
            },
          ],
        });
        captions.push({ url: image.url, text });
      } catch {
        failed += 1;
      }
      done += 1;
    }
    if (failed) patchState(id, { visionHint: `${active.visionHint}。${failed} 张未识别` });
    return insertCaptions(md, captions);
  };

  const convert = async () => {
    if (active.unsupported) return;
    if (!settings.text.apiKey) return;
    if (settings.visionEnabled && !resolveVisionApiKey(settings)) {
      patchState(id, { error: '已开启图片识别，但 API Key 为空' });
      return;
    }
    refs.abort?.abort();
    if (refs.paintTimer != null) {
      clearTimeout(refs.paintTimer);
      refs.paintTimer = null;
    }
    const ac = new AbortController();
    refs.abort = ac;
    refs.markdown = '';
    patchState(id, {
      phase: 'converting',
      markdown: '',
      status: '正在提取当前区域…',
      error: '',
      progress: 8,
      fromHistory: false,
    });
    try {
      const extracted = await sendToTab(id, { type: 'EXTRACT', region: active.selected });
      if (!extracted.ok || !('html' in extracted)) {
        throw new Error(extracted.ok ? '提取失败' : extracted.error);
      }
      if (ac.signal.aborted) throw new DOMException('已取消', 'AbortError');
      let html = extracted.useReadability
        ? refineReadableHtml(extracted.html, active.tabUrl || extracted.title)
        : extracted.html;
      if (extracted.navHtml) html = `${extracted.navHtml}\n${html}`;
      assertWithinLimit(html);
      patchState(id, {
        pageTitle: extracted.title || active.pageTitle,
        status: '正在转换为 Markdown…',
        progress: 18,
      });
      const md = await convertHtmlToMarkdown({
        html,
        baseURL: settings.text.baseURL,
        apiKey: settings.text.apiKey,
        model: settings.text.model,
        taskPrompt: active.selected === 'custom' ? active.taskPrompt : undefined,
        onDelta: (delta) => {
          refs.markdown += delta;
          if (refs.paintTimer != null) return;
          refs.paintTimer = setTimeout(() => {
            refs.paintTimer = null;
            patchState(id, {
              markdown: refs.markdown,
              progress: Math.min(82, 18 + Math.floor(refs.markdown.length / 24)),
            });
          }, 80);
        },
        signal: ac.signal,
      });
      if (refs.paintTimer != null) {
        clearTimeout(refs.paintTimer);
        refs.paintTimer = null;
      }
      patchState(id, {
        markdown: md,
        progress: settings.visionEnabled ? 82 : 96,
      });
      let finalMd = md;
      if (settings.visionEnabled) {
        patchState(id, { status: '正在识别图片…', progress: 86 });
        finalMd = await runVision(extracted.images, md, ac.signal);
        patchState(id, { markdown: finalMd, progress: 96 });
      }
      await addRecord(
        {
          title: extracted.title || active.pageTitle || '未命名',
          url: active.tabUrl || '',
          regionType: active.selected,
          visionEnabled: settings.visionEnabled,
          markdown: finalMd,
        },
        settings.historyLimit,
      );
      patchState(id, { phase: 'done', status: '', progress: 100, fromHistory: false });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        patchState(id, { phase: 'cancelled', status: '', error: '已取消' });
      } else {
        patchState(id, {
          phase: refs.markdown ? 'cancelled' : 'ready',
          status: '',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  return (
    <ConvertTabUI
      key={id}
      active={active}
      phase={phase}
      busy={busy}
      canConvert={canConvert}
      complete={complete}
      displayVisionHint={displayVisionHint}
      previewMode={previewMode}
      setPreviewMode={setPreviewMode}
      settings={settings}
      onOpenSettings={onOpenSettings}
      onScan={() => void scan()}
      onPick={() => void pick()}
      onCancelScan={phase === 'picking' ? cancelPick : cancelScan}
      onAbort={() => refs.abort?.abort()}
      onConvert={() => void convert()}
      onCopy={() => void copyText(active.markdown)}
      onDownload={() => downloadMarkdown(active.markdown, active.pageTitle)}
      onHighlight={(r: RegionType | null) => void highlight(r)}
      onSelect={(r: RegionType) => patchState(id, { selected: r })}
      onTaskPrompt={(taskPrompt: string) => patchState(id, { taskPrompt })}
      highlightOn={highlightOn}
      onToggleHighlight={toggleHighlight}
    />
  );
}
