import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Eye, EyeOff } from 'lucide-react';
import { parseNote, type ParsedNote } from '@/lib/notes/parse';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import './notes.css';

type RenderMarkdown = (markdown: string, comparison?: boolean) => ReactNode;

type TableNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TableNode[];
};

export function rehypeNoteTables() {
  return (tree: TableNode) => {
    const text = (node: TableNode): string => node.value ?? node.children?.map(text).join('') ?? '';
    const visit = (node: TableNode) => {
      if (node.tagName === 'table') {
        const header = node.children?.find((child) => child.tagName === 'thead');
        const labels = header?.children?.find((child) => child.tagName === 'tr')?.children
          ?.filter((child) => child.tagName === 'th').map(text) ?? [];
        const body = node.children?.find((child) => child.tagName === 'tbody');
        body?.children?.filter((child) => child.tagName === 'tr').forEach((row) => {
          row.children?.filter((child) => child.tagName === 'td').forEach((cell, index) => {
            cell.properties = { ...cell.properties, 'data-label': labels[index] ?? '' };
          });
        });
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function NoteBody({ note, renderMarkdown }: { note: ParsedNote; renderMarkdown: RenderMarkdown }) {
  const [testing, setTesting] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const render = (markdown: string) => renderMarkdown(`${note.references}\n\n${markdown}`, note.format.templateId === 'comparison');
  const kind = note.format.templateId;
  return (
    <article className={`html2md-note html2md-note-${kind}`}>
      <header className="html2md-note-title">{render(note.titleMarkdown)}</header>
      {note.preamble.trim() ? <div className="html2md-note-preamble">{render(note.preamble)}</div> : null}
      {kind === 'qa' ? (
        <div className="html2md-note-tools">
          <ToggleGroup type="single" size="sm" variant="outline" value={testing ? 'test' : 'read'} onValueChange={(value) => {
            if (!value) return;
            setTesting(value === 'test');
            setRevealed(new Set());
          }} aria-label="问答模式">
            <ToggleGroupItem value="read"><BookOpen />阅读</ToggleGroupItem>
            <ToggleGroupItem value="test"><EyeOff />自测</ToggleGroupItem>
          </ToggleGroup>
          {testing ? <Button size="sm" variant="outline" onClick={() => setRevealed(new Set(note.sections.map((_, index) => index)))}><Eye />全部显示</Button> : null}
        </div>
      ) : null}
      {note.sections.map((section, index) => {
        const heading = render(section.headingMarkdown);
        const body = render(section.body);
        if (kind === 'outline') {
          return <details className="html2md-note-section" key={index} open><summary>{heading}</summary><div className="html2md-note-body">{body}</div></details>;
        }
        if (kind === 'qa' && testing) {
          return (
            <details className="html2md-note-section" key={index} open={revealed.has(index)} onToggle={(event) => {
              const open = event.currentTarget.open;
              setRevealed((previous) => {
                if (previous.has(index) === open) return previous;
                const next = new Set(previous);
                if (open) next.add(index); else next.delete(index);
                return next;
              });
            }}>
              <summary>{heading}</summary><div className="html2md-note-body">{body}</div>
            </details>
          );
        }
        const summary = kind === 'cornell' && index === note.sections.length - 1;
        return (
          <section key={index} className={`html2md-note-section${summary ? ' html2md-note-summary' : ''}${kind === 'action' && section.heading === '步骤' ? ' html2md-note-steps' : ''}`}>
            <div className="html2md-note-heading">{heading}</div>
            <div className="html2md-note-body">{body}</div>
          </section>
        );
      })}
    </article>
  );
}

export function NotesView({ markdown, noteFormat, renderMarkdown }: {
  markdown: string;
  noteFormat: unknown;
  renderMarkdown: RenderMarkdown;
}) {
  const note = useMemo(() => parseNote(markdown, noteFormat), [markdown, noteFormat]);
  return (
    <div className="html2md-notes-container">
      {note ? <NoteBody key={`${note.format.templateId}:${markdown}`} note={note} renderMarkdown={renderMarkdown} /> : (
        <div className="html2md-note">
          <p className="html2md-note-fallback" role="status">笔记结构未匹配，已显示完整 Markdown。</p>
          {renderMarkdown(markdown)}
        </div>
      )}
    </div>
  );
}
