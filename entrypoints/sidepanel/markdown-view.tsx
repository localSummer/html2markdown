import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

type PreviewMode = 'preview' | 'source';

type Shot = { src: string; alt: string };

function ImageLightbox({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [base, setBase] = useState<{ w: number; h: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const fitToView = (img: HTMLImageElement) => {
    const box = viewportRef.current;
    if (!box || !img.naturalWidth) return;
    const availW = Math.max(80, box.clientWidth - 32);
    const availH = Math.max(80, box.clientHeight - 32);
    const fit = Math.min(availW / img.naturalWidth, availH / img.naturalHeight, 1);
    setBase({ w: img.naturalWidth * fit, h: img.naturalHeight * fit });
  };

  useLayoutEffect(() => {
    setZoom(1);
    const img = imgRef.current;
    if (img?.complete) fitToView(img);
    else setBase(null);
  }, [shot.src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const bump = (delta: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + delta) * 100) / 100)));
  };

  const w = base ? base.w * zoom : undefined;
  const h = base ? base.h * zoom : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-end gap-1.5 px-3 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mr-auto text-xs text-white/80">{Math.round(zoom * 100)}%</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => bump(-ZOOM_STEP)}
        >
          <ZoomOut />
          缩小
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => bump(ZOOM_STEP)}
        >
          <ZoomIn />
          放大
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setZoom(1)}>
          适应
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X />
          关闭
        </Button>
      </div>
      <div className="html2md-scroll flex-1" onClick={onClose}>
        <div
          ref={viewportRef}
          className="html2md-scroll-body"
          onClick={onClose}
        >
        <div
          className="flex items-center justify-center p-4"
          style={{ minHeight: '100%', minWidth: '100%', width: w ? Math.max(w + 32, 0) : undefined }}
        >
          <img
            ref={imgRef}
            src={shot.src}
            alt={shot.alt}
            className="rounded-md shadow-lg"
            style={
              base
                ? { width: w, height: h, maxWidth: 'none', maxHeight: 'none' }
                : { maxWidth: '90%', maxHeight: '80vh' }
            }
            onLoad={(e) => fitToView(e.currentTarget)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const MD_PROSE_CLASS =
  'prose dark:prose-invert max-w-none html2md-md-prose prose-headings:scroll-mt-0 prose-pre:rounded-lg prose-pre:bg-muted prose-img:my-2 prose-img:rounded-lg';

export function MarkdownPreview({
  markdown,
  onOpenImage,
}: {
  markdown: string;
  onOpenImage?: (shot: Shot) => void;
}) {
  return (
    <div className={MD_PROSE_CLASS}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            if (!src) return null;
            return (
              <img
                src={src}
                alt={alt ?? ''}
                className={onOpenImage ? 'cursor-zoom-in hover:opacity-90' : undefined}
                onClick={onOpenImage ? () => onOpenImage({ src, alt: alt ?? '' }) : undefined}
              />
            );
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  );
}

export function MarkdownScrollBox({
  markdown,
  previewMode,
  converting = false,
  fill = false,
  maxHeightClass = 'max-h-[55vh]',
}: {
  markdown: string;
  previewMode: PreviewMode;
  converting?: boolean;
  fill?: boolean;
  maxHeightClass?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const skipRef = useRef(false);
  const [shot, setShot] = useState<Shot | null>(null);

  useEffect(() => {
    if (converting) stickRef.current = true;
  }, [converting]);

  useEffect(() => {
    if (!converting || !stickRef.current) return;
    const el = boxRef.current;
    if (!el) return;
    skipRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      skipRef.current = false;
    });
  }, [markdown, converting, previewMode]);

  useEffect(() => {
    if (!converting) return;
    const content = contentRef.current;
    if (!content) return;
    const ro = new ResizeObserver(() => {
      if (!stickRef.current) return;
      const el = boxRef.current;
      if (!el) return;
      skipRef.current = true;
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => {
        skipRef.current = false;
      });
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [converting]);

  return (
    <>
      <div
        className={cn(
          'html2md-md flex min-h-0 flex-col overflow-hidden py-3 bg-gradient-to-b from-muted/40 to-muted/20 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]',
          fill
            ? 'h-full'
            : cn('rounded-lg border border-border/70', maxHeightClass),
        )}
      >
        <div
          ref={boxRef}
          onScroll={() => {
            if (skipRef.current || !converting) return;
            const el = boxRef.current;
            if (!el) return;
            if (el.scrollHeight - el.scrollTop - el.clientHeight > 40) {
              stickRef.current = false;
            }
          }}
          className="html2md-scroll-body"
        >
          <div ref={contentRef} className="px-4">
            <div className="html2md-view-swap">
              <div className="html2md-view" data-active={previewMode === 'preview' ? 'true' : 'false'}>
                <MarkdownPreview markdown={markdown} onOpenImage={setShot} />
              </div>
              <div className="html2md-view" data-active={previewMode === 'source' ? 'true' : 'false'}>
                <pre className="html2md-md-source whitespace-pre-wrap break-words">{markdown}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
      {shot ? <ImageLightbox shot={shot} onClose={() => setShot(null)} /> : null}
    </>
  );
}

export function MarkdownFullscreen({
  open,
  title,
  onClose,
  toolbar,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1 truncate text-sm font-medium">{title}</div>
        {toolbar}
        <Button variant="outline" size="sm" onClick={onClose}>
          <Minimize2 />
          退出全屏
        </Button>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>,
    document.body,
  );
}

export function FullscreenButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Maximize2 />
      全屏
    </Button>
  );
}
