import type { RegionSummary, RegionType } from '../../../lib/messages';

export type Phase = 'idle' | 'scanning' | 'ready' | 'converting' | 'done' | 'cancelled';

export type TabState = {
  tabUrl: string | undefined;
  pageTitle: string;
  unsupported: string | null;
  phase: Phase;
  status: string;
  error: string;
  regions: RegionSummary[];
  selected: RegionType;
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
  markdown: '',
  visionHint: '',
  progress: 0,
  fromHistory: false,
};
