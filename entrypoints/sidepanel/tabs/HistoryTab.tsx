import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Copy, Download, ExternalLink, Search, Trash2 } from 'lucide-react';
import { copyText, downloadMarkdown, withSourceMeta } from '../../../lib/export';
import {
  clearRecords,
  deleteRecord,
  listRecords,
  matchesQuery,
  type HistoryRecord,
} from '../../../lib/history/db';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FullscreenButton, MarkdownFullscreen, MarkdownScrollBox } from '../markdown-view.tsx';

export function HistoryTab({ active = true }: { active?: boolean }) {
  const [rows, setRows] = useState<HistoryRecord[]>([]);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [fullId, setFullId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = async () => {
    setRows(await listRecords());
  };

  useEffect(() => {
    if (active) void reload();
  }, [active]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!openId) return;
    const raf = requestAnimationFrame(() => setExpandedId(openId));
    return () => cancelAnimationFrame(raf);
  }, [openId]);

  const resetOpen = () => {
    setOpenId(null);
    setExpandedId(null);
    setClosingId(null);
    setFullId(null);
  };

  const toggle = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openId === id) {
      setExpandedId(null);
      setOpenId(null);
      setClosingId(id);
      closeTimer.current = setTimeout(() => setClosingId(null), 360);
      return;
    }
    if (openId) {
      setClosingId(openId);
      closeTimer.current = setTimeout(() => setClosingId(null), 360);
    }
    setExpandedId(null);
    setOpenId(id);
  };

  const filtered = useMemo(() => rows.filter((r) => matchesQuery(r, query)), [rows, query]);
  const fullRow = fullId ? rows.find((r) => r.id === fullId) : undefined;

  return (
    <div className="flex h-full min-h-0 flex-col text-sm">
      <div className="shrink-0 px-3 pt-3">
        <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、URL 或正文"
            className="pl-8"
          />
        </div>
        {rows.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!confirm('清空全部历史？')) return;
              void clearRecords().then(reload);
              resetOpen();
            }}
          >
            <Trash2 />
            清空
          </Button>
        ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="px-3 pt-3">
        <Alert>
          <AlertDescription>暂无记录</AlertDescription>
        </Alert>
        </div>
      ) : (
        <div className="html2md-scroll flex-1">
          <div className="html2md-scroll-body space-y-2 px-3">
          {filtered.map((r) => {
            const open = expandedId === r.id;
            const mounted = openId === r.id || closingId === r.id;
            return (
              <Card key={r.id} className="gap-0 py-0 transition-shadow duration-200 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]">
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className="flex w-full items-start gap-2 rounded-t-xl px-4 py-3 text-left transition-colors hover:bg-accent/50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">{r.url}</div>
                  </div>
                  <ChevronDown
                    className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-300 ${
                      openId === r.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className="html2md-expand" data-open={open ? 'true' : 'false'}>
                  <div className="html2md-expand-inner">
                    {mounted ? (
                      <CardContent className="space-y-3 border-t px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              void copyText(
                                withSourceMeta(r.markdown, {
                                  title: r.title,
                                  url: r.url,
                                  createdAt: r.createdAt,
                                }),
                              )
                            }
                          >
                            <Copy />
                            复制
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadMarkdown(
                                withSourceMeta(r.markdown, {
                                  title: r.title,
                                  url: r.url,
                                  createdAt: r.createdAt,
                                }),
                                r.title,
                              )
                            }
                          >
                            <Download />
                            下载
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void browser.tabs.create({ url: r.url })}
                          >
                            <ExternalLink />
                            打开原页
                          </Button>
                          <FullscreenButton onClick={() => setFullId(r.id)} />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              void deleteRecord(r.id).then(reload);
                              resetOpen();
                            }}
                          >
                            <Trash2 />
                            删除
                          </Button>
                        </div>
                        <MarkdownScrollBox
                          markdown={r.markdown}
                          previewMode="preview"
                          maxHeightClass="max-h-56"
                        />
                      </CardContent>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {fullRow ? (
        <MarkdownFullscreen open title={fullRow.title} onClose={() => setFullId(null)}>
          <MarkdownScrollBox markdown={fullRow.markdown} previewMode="preview" fill />
        </MarkdownFullscreen>
      ) : null}
    </div>
  );
}
