import { useEffect, useRef, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { ACTION_COMMAND, shortcutLabel, shortcutsPageUrl } from '../../../lib/shortcut';
import { applyMdFontSize, applyTheme } from '../../../lib/theme';
import { probeCompletions } from '../../../lib/llm/client';
import {
  DEFAULT_MD_FONT_SIZE,
  MD_FONT_SIZES,
  saveSettings,
  type Settings,
  type ThemeMode,
} from '../../../lib/settings';
import { MarkdownPreview } from '../markdown-view';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'follow_system', label: '跟随系统', icon: Monitor },
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
];

const MD_FONT_SAMPLE = `## 标题示例

这是转换结果的正文字号。**加粗**、*斜体* 与 \`代码\` 会随基础字号一起变化。`;

function Field({
  id,
  label,
  ...inputProps
}: {
  id: string;
  label: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-muted-foreground">
        {label}
      </Label>
      <Input id={id} {...inputProps} />
    </div>
  );
}

export function SettingsTab({
  settings,
  onChange,
  active = true,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  active?: boolean;
}) {
  useEffect(() => {
    applyTheme(settings.theme);
    applyMdFontSize(settings.mdFontSize);
  }, [settings.theme, settings.mdFontSize]);

  const patch = (next: Settings) => {
    onChange(next);
    void saveSettings(next);
  };

  const [probeMsg, setProbeMsg] = useState<string | null>(null);
  const [probeOk, setProbeOk] = useState<boolean | null>(null);
  const [probing, setProbing] = useState(false);
  const probeAbort = useRef<AbortController | null>(null);
  const [shortcut, setShortcut] = useState<string | undefined>(undefined);

  useEffect(() => {
    return () => probeAbort.current?.abort();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      void browser.commands.getAll().then((cmds) => {
        if (cancelled) return;
        const cmd = cmds.find((c) => c.name === ACTION_COMMAND);
        setShortcut(cmd?.shortcut);
      });
    };
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [active]);

  const onProbe = async () => {
    probeAbort.current?.abort();
    const ac = new AbortController();
    probeAbort.current = ac;
    setProbing(true);
    setProbeMsg(null);
    setProbeOk(null);
    try {
      await probeCompletions({
        baseURL: settings.text.baseURL,
        apiKey: settings.text.apiKey,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      setProbeOk(true);
      setProbeMsg('连接成功');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setProbeOk(false);
      setProbeMsg(err instanceof Error ? err.message : String(err));
    } finally {
      if (!ac.signal.aborted) setProbing(false);
    }
  };

  return (
    <div className="html2md-scroll h-full">
      <div className="html2md-scroll-body space-y-3 px-3 text-sm">
      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>外观</CardTitle>
          <CardDescription>主题与基础字号只影响侧栏，页面高亮颜色固定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4">
          <div className="grid gap-2">
            <Label htmlFor="theme-select" className="text-muted-foreground">
              主题
            </Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => patch({ ...settings, theme: v as ThemeMode })}
            >
              <SelectTrigger id="theme-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {THEME_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <t.icon />
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="md-font-size" className="text-muted-foreground">
              基础字号
            </Label>
            <Select
              value={String(settings.mdFontSize)}
              onValueChange={(v) => patch({ ...settings, mdFontSize: Number(v) })}
            >
              <SelectTrigger id="md-font-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MD_FONT_SIZES.map((px) => (
                  <SelectItem key={px} value={String(px)}>
                    {px === DEFAULT_MD_FONT_SIZE ? `${px}px（默认）` : `${px}px`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="html2md-md rounded-lg border border-border/70 bg-gradient-to-b from-muted/40 to-muted/20 p-3">
              <MarkdownPreview markdown={MD_FONT_SAMPLE} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>快捷键</CardTitle>
          <CardDescription>打开或关闭侧栏。Chrome / Edge 不允许扩展自己改快捷键，只能到浏览器页面修改</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground">当前快捷键</p>
              <p className="font-medium">{shortcutLabel(shortcut)}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                void browser.tabs.create({ url: shortcutsPageUrl(navigator.userAgent) });
              }}
            >
              去修改
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>文本模型</CardTitle>
          <CardDescription>用于 AI 转换与任务说明；本地转换不需要</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <Field
            id="text-base-url"
            label="baseURL"
            value={settings.text.baseURL}
            onChange={(e) =>
              patch({ ...settings, text: { ...settings.text, baseURL: e.target.value } })
            }
          />
          <Field
            id="text-api-key"
            label="API Key"
            type="password"
            value={settings.text.apiKey}
            onChange={(e) =>
              patch({ ...settings, text: { ...settings.text, apiKey: e.target.value } })
            }
          />
          <Field
            id="text-model"
            label="model"
            value={settings.text.model}
            onChange={(e) =>
              patch({ ...settings, text: { ...settings.text, model: e.target.value } })
            }
          />
          <Field
            id="max-html-chars"
            label="AI 输入上限（字符，0 表示不限制）"
            inputMode="numeric"
            value={String(settings.maxHtmlChars)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n) || n < 0) return;
              patch({ ...settings, maxHtmlChars: Math.floor(n) });
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={probing || !settings.text.apiKey.trim() || !settings.text.baseURL.trim()}
              onClick={() => void onProbe()}
            >
              {probing ? '测试中…' : '测试连接'}
            </Button>
            {probeMsg ? (
              <span className={probeOk ? 'text-xs text-primary-soft-foreground' : 'text-xs text-destructive'}>
                {probeMsg}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>图片识别</CardTitle>
          <CardDescription>默认关闭；开启后按文档顺序识别</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="vision-enabled">启用图片识别</Label>
            <Switch
              id="vision-enabled"
              checked={settings.visionEnabled}
              onCheckedChange={(visionEnabled) => patch({ ...settings, visionEnabled })}
            />
          </div>
          <Field
            id="vision-max"
            label="识别上限"
            inputMode="numeric"
            value={String(settings.visionMaxImages)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n) || n <= 0) return;
              patch({ ...settings, visionMaxImages: Math.floor(n) });
            }}
          />
          <div className="flex items-center justify-between">
            <Label htmlFor="vision-inherit-key">与文本使用相同 API Key</Label>
            <Switch
              id="vision-inherit-key"
              checked={settings.visionUseTextApiKey}
              onCheckedChange={(visionUseTextApiKey) =>
                patch({ ...settings, visionUseTextApiKey })
              }
            />
          </div>
          <Field
            id="vision-base-url"
            label="baseURL"
            value={settings.vision.baseURL}
            onChange={(e) =>
              patch({ ...settings, vision: { ...settings.vision, baseURL: e.target.value } })
            }
          />
          <Field
            id="vision-api-key"
            label="API Key"
            type="password"
            disabled={settings.visionUseTextApiKey}
            value={settings.visionUseTextApiKey ? settings.text.apiKey : settings.vision.apiKey}
            onChange={(e) =>
              patch({ ...settings, vision: { ...settings.vision, apiKey: e.target.value } })
            }
          />
          <Field
            id="vision-model"
            label="model"
            value={settings.vision.model}
            onChange={(e) =>
              patch({ ...settings, vision: { ...settings.vision, model: e.target.value } })
            }
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>历史</CardTitle>
          <CardDescription>只保留在本地浏览器</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <Field
            id="history-limit"
            label="保留条数"
            inputMode="numeric"
            value={String(settings.historyLimit)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n) || n <= 0) return;
              patch({ ...settings, historyLimit: Math.floor(n) });
            }}
          />
          <Field
            id="history-max-age"
            label="自动清理（天，0 表示永久保留）"
            inputMode="numeric"
            value={String(settings.historyMaxAgeDays)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n) || n < 0) return;
              patch({ ...settings, historyMaxAgeDays: Math.floor(n) });
            }}
          />
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="px-4">
          <CardTitle>页面漂浮按钮</CardTitle>
          <CardDescription>在网页右侧显示快捷按钮，点击唤起侧栏，可上下拖动</CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="floating-button">显示漂浮按钮</Label>
            <Switch
              id="floating-button"
              checked={settings.floatingButton}
              onCheckedChange={(floatingButton) => patch({ ...settings, floatingButton })}
            />
          </div>
        </CardContent>
      </Card>

      <Alert variant="info">
        <AlertDescription>
          本地转换不经过 API。开启 AI 或图片识别时，会将所选区域清洗后的 HTML（图片识别还包括图片数据）发送到你填写的 API 地址。本扩展不设中转服务器，不收集 Key 与正文。
        </AlertDescription>
      </Alert>
      </div>
    </div>
  );
}
