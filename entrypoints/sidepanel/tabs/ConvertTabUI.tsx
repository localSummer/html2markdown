import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, Download, MousePointerClick, ScanSearch, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { FullscreenButton, MarkdownFullscreen, MarkdownScrollBox } from '../markdown-view.tsx';
import type { RegionType } from '../../../lib/messages';
import type { Settings } from '../../../lib/settings';
import type { Phase, TabState } from './convert-types.ts';

const REGION_LABELS: Record<RegionType, string> = {
  main: '主内容',
  nav: '导航',
  main_nav: '内容+导航',
  full: '全文',
  custom: '指定区域',
};

function ProgressBar({
  label,
  value,
  indeterminate,
}: {
  label: string;
  value: number;
  indeterminate?: boolean;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary-soft/50 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-primary-soft-foreground">
        <span>{label}</span>
        {indeterminate ? null : <span>{Math.round(value)}%</span>}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary/15">
        {indeterminate ? (
          <div className="html2md-progress-indeterminate h-full rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        ) : (
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-[0_0_8px_var(--color-primary)] transition-[width] duration-200 ease-out"
            style={{ width: `${Math.max(4, Math.min(100, value))}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function ConvertTabUI(props: {
  active: TabState;
  phase: Phase;
  busy: boolean;
  canConvert: boolean;
  complete: boolean;
  displayVisionHint: string;
  previewMode: 'preview' | 'source';
  setPreviewMode: (m: 'preview' | 'source') => void;
  settings: Settings;
  onOpenSettings: () => void;
  onScan: () => void;
  onPick: () => void;
  onCancelScan: () => void;
  onAbort: () => void;
  onConvert: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onHighlight: (r: RegionType | null) => void;
  onSelect: (r: RegionType) => void;
  onTaskPrompt: (prompt: string) => void;
  highlightOn: boolean;
  onToggleHighlight: (on: boolean) => void;
}) {
  const {
    active,
    phase,
    busy,
    canConvert,
    complete,
    displayVisionHint,
    previewMode,
    setPreviewMode,
    settings,
    onOpenSettings,
    onScan,
    onPick,
    onCancelScan,
    onAbort,
    onConvert,
    onCopy,
    onDownload,
    onHighlight,
    onSelect,
    onTaskPrompt,
    highlightOn,
    onToggleHighlight,
  } = props;

  const err = active.error;
  const canRetry =
    phase !== 'converting' &&
    (err.includes('密钥无效') ||
      err.includes('额度') ||
      err.includes('网络错误') ||
      err.includes('稍后重试'));
  const goSettings = err.includes('密钥无效') || err.includes('API Key 为空');
  const [full, setFull] = useState(false);
  const resultTitle = active.fromHistory ? '结果（来自历史）' : '结果';
  const converting = phase === 'converting';
  const outerRef = useRef<HTMLDivElement>(null);
  const outerStickRef = useRef(true);
  const outerSkipRef = useRef(false);
  const outerSmoothedRef = useRef(false);
  const outerSmoothTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (converting) {
      outerStickRef.current = true;
      outerSmoothedRef.current = false;
    }
    return () => {
      if (outerSmoothTimer.current) clearTimeout(outerSmoothTimer.current);
    };
  }, [converting]);

  useLayoutEffect(() => {
    if (!converting || !outerStickRef.current) return;
    const el = outerRef.current;
    if (!el || !active.markdown) return;

    if (!outerSmoothedRef.current) {
      outerSmoothedRef.current = true;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        outerSkipRef.current = true;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        if (outerSmoothTimer.current) clearTimeout(outerSmoothTimer.current);
        outerSmoothTimer.current = setTimeout(() => {
          outerSkipRef.current = false;
          outerSmoothTimer.current = null;
        }, 420);
        return;
      }
    }

    if (outerSkipRef.current) return;
    outerSkipRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      outerSkipRef.current = false;
    });
  }, [converting, active.markdown]);

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="html2md-scroll flex-1">
        <div
          ref={outerRef}
          className="html2md-scroll-body space-y-3 px-3"
          onScroll={() => {
            if (outerSkipRef.current || !converting) return;
            const el = outerRef.current;
            if (!el) return;
            if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) {
              outerStickRef.current = false;
            }
          }}
        >
        {active.unsupported ? (
          <Alert variant="warning">
            <AlertDescription>{active.unsupported}</AlertDescription>
          </Alert>
        ) : null}
        {!settings.text.apiKey ? (
          <Alert variant="warning">
            <AlertDescription>
              未配置文本模型 API Key，仍可扫描。
              <Button variant="link" size="sm" className="h-auto p-0 pl-1" onClick={onOpenSettings}>
                去设置
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card className="gap-3 py-4">
          <CardHeader className="px-4">
            <CardTitle className="truncate">{active.pageTitle || '转换区域'}</CardTitle>
            <CardDescription>
              {active.selected === 'custom' && active.picked
                ? '已选定页面元素，可填写任务说明后转换'
                : '先扫描或指定区域，再转换'}
            </CardDescription>
            <CardAction>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Label htmlFor="highlight-toggle" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    id="highlight-toggle"
                    checked={highlightOn}
                    disabled={phase === 'picking'}
                    onCheckedChange={onToggleHighlight}
                  />
                  高亮
                </Label>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(active.unsupported) || busy}
                    onClick={onScan}
                  >
                    <ScanSearch />
                    {active.regions.length ? '重新扫描' : '扫描当前页'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={Boolean(active.unsupported) || busy}
                    onClick={onPick}
                  >
                    <MousePointerClick />
                    指定区域
                  </Button>
                  {phase === 'scanning' || phase === 'picking' || phase === 'converting' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={phase === 'converting' ? onAbort : onCancelScan}
                    >
                      <X />
                      取消
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="px-4">
            {phase === 'scanning' ? (
              <ProgressBar label="扫描中…原页仍可滚动" value={0} indeterminate />
            ) : null}
            {phase === 'picking' ? (
              <ProgressBar label="请在页面上点击要转换的区域，Esc 取消" value={0} indeterminate />
            ) : null}
            {active.selected === 'custom' && active.picked && phase !== 'picking' ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-primary/40 bg-accent px-3 py-2.5 text-accent-foreground">
                  <span className="size-2 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" />
                  <span>
                    &lt;{active.picked.tag}&gt;
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">约 {active.picked.charCount} 字</span>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="task-prompt" className="text-muted-foreground">
                    自定义 Prompt（可空，空则转为 Markdown）
                  </Label>
                  <textarea
                    id="task-prompt"
                    value={active.taskPrompt}
                    onChange={(e) => onTaskPrompt(e.target.value)}
                    placeholder="例如：转成 Markdown；用三条要点总结"
                    rows={3}
                    className="placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  />
                </div>
              </div>
            ) : active.regions.length > 0 ? (
              <div className="grid gap-1">
                {active.regions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseEnter={() => onHighlight(r.id)}
                    onMouseLeave={() => onHighlight(active.selected)}
                    onClick={() => {
                      onSelect(r.id);
                      onHighlight(r.id);
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all cursor-pointer',
                      active.selected === r.id
                        ? 'border-primary/40 bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_var(--color-primary)/25]'
                        : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:border-primary/30 hover:shadow-[0_2px_6px_-2px_rgba(0,0,0,0.08)]',
                    )}
                  >
                    {active.selected === r.id ? (
                      <span className="size-2 rounded-full bg-primary shadow-[0_0_6px_var(--color-primary)]" />
                    ) : (
                      <span className="size-2 rounded-full bg-muted-foreground/30" />
                    )}
                    <span>{r.label}</span>
                    <span className="ml-auto text-xs text-muted-foreground">约 {r.charCount} 字</span>
                  </button>
                ))}
              </div>
            ) : phase === 'scanning' || phase === 'picking' ? null : active.fromHistory && active.markdown ? (
              <p className="text-xs text-muted-foreground">
                已加载历史转换结果（{REGION_LABELS[active.selected] ?? '指定区域'}）。扫描当前页或指定区域可重新选择。
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">尚未扫描。</p>
            )}
          </CardContent>
        </Card>

        {displayVisionHint ? (
          <Alert variant="info">
            <AlertDescription>{displayVisionHint}</AlertDescription>
          </Alert>
        ) : null}

        {err ? (
          <Alert variant="destructive">
            <AlertDescription>
              {err}
              <span className="ml-2 inline-flex gap-2">
                {goSettings ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-inherit underline"
                    onClick={onOpenSettings}
                  >
                    去设置
                  </Button>
                ) : null}
                {canRetry ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-inherit underline"
                    onClick={onConvert}
                  >
                    重试
                  </Button>
                ) : null}
              </span>
            </AlertDescription>
          </Alert>
        ) : null}

        {active.markdown ? (
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{resultTitle}</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={previewMode}
                    onValueChange={(v) => v && setPreviewMode(v as 'preview' | 'source')}
                  >
                    <ToggleGroupItem value="preview">预览</ToggleGroupItem>
                    <ToggleGroupItem value="source">源码</ToggleGroupItem>
                  </ToggleGroup>
                  <Button variant="outline" size="sm" disabled={!complete} onClick={onCopy}>
                    <Copy />
                    复制
                  </Button>
                  <Button variant="outline" size="sm" disabled={!complete} onClick={onDownload}>
                    <Download />
                    下载
                  </Button>
                  <FullscreenButton onClick={() => setFull(true)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <MarkdownScrollBox
                markdown={active.markdown}
                previewMode={previewMode}
                converting={converting}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
      </div>

      <MarkdownFullscreen
          open={full}
          title={resultTitle}
          onClose={() => setFull(false)}
          toolbar={
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={previewMode}
              onValueChange={(v) => v && setPreviewMode(v as 'preview' | 'source')}
            >
              <ToggleGroupItem value="preview">预览</ToggleGroupItem>
              <ToggleGroupItem value="source">源码</ToggleGroupItem>
            </ToggleGroup>
          }
        >
          <MarkdownScrollBox
            markdown={active.markdown}
            previewMode={previewMode}
            converting={converting}
            fill
          />
        </MarkdownFullscreen>

      <div className="shrink-0 border-t bg-gradient-to-t from-background to-card/40 p-3 backdrop-blur">
        <Button
          disabled={
            !canConvert ||
            busy ||
            (active.selected === 'custom' ? !active.picked : active.regions.length === 0)
          }
          onClick={onConvert}
          className={cn(
            'relative w-full overflow-hidden',
            phase === 'converting' && 'hover:translate-y-0',
          )}
        >
          {phase === 'converting' ? (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-primary-foreground/25 transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(4, Math.min(100, active.progress))}%` }}
            />
          ) : null}
          <span className="relative">
            {phase === 'converting'
              ? `${active.status || '转换中…'} ${Math.round(active.progress)}%`
              : active.markdown
                ? '重新转换'
                : '转换为 Markdown'}
          </span>
        </Button>
      </div>
    </div>
  );
}
