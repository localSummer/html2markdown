import type { RegionSummary, RegionType } from '../../../lib/messages';

export type Phase = 'idle' | 'scanning' | 'picking' | 'ready' | 'converting' | 'done' | 'cancelled';

export type PickedRegion = {
  tag: string;
  charCount: number;
};

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
  markdown: '',
  visionHint: '',
  progress: 0,
  fromHistory: false,
};
