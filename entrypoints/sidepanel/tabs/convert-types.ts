import type { RegionSummary, RegionType } from '../../../lib/messages';
import type { NoteTemplateId } from '../../../lib/notes/templates';
import type { HistoryRecord } from '../../../lib/history/db';

export type Phase = 'idle' | 'scanning' | 'picking' | 'ready' | 'converting' | 'done' | 'cancelled';

export type ReadingState = {
  resultId: string;
  previewMode: 'notes' | 'preview' | 'source';
  interrupted: boolean;
};

export type PickedRegion = {
  tag: string;
  charCount: number;
};

export type WorkPref = {
  aiWanted: boolean;
  templateId: NoteTemplateId | 'plain';
};

export function nextPageAiConfig(pref: WorkPref | null): WorkPref {
  if (!pref?.aiWanted) return { aiWanted: false, templateId: 'plain' };
  return { aiWanted: true, templateId: pref.templateId };
}

export type TabState = {
  tabUrl: string | undefined;
  pageTitle: string;
  unsupported: string | null;
  phase: Phase;
  status: string;
  error: string;
  regions: RegionSummary[];
  selected: RegionType;
  picked: PickedRegion | null;
  taskPrompt: string;
  aiWanted: boolean;
  templateId: NoteTemplateId | 'plain';
  resultId: string;
  resultNoteFormat?: HistoryRecord['noteFormat'];
  resultConfig?: { useAi: boolean; templateId: string; taskPrompt: string };
  markdown: string;
  visionHint: string;
  progress: number;
  fromHistory: boolean;
};

export const FRESH_STATE: TabState = {
  tabUrl: undefined,
  pageTitle: '',
  unsupported: null,
  phase: 'idle',
  status: '',
  error: '',
  regions: [],
  selected: 'main',
  picked: null,
  taskPrompt: '',
  aiWanted: false,
  templateId: 'plain',
  resultId: '',
  markdown: '',
  visionHint: '',
  progress: 0,
  fromHistory: false,
};
