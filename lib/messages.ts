export type RegionType = 'main' | 'nav' | 'main_nav' | 'full' | 'custom';

export type RegionSummary = {
  id: RegionType;
  label: string;
  charCount: number;
  imageTotal: number;
  imageDecorative: number;
};

export type ImageMeta = {
  src: string;
  alt: string;
  width: number;
  height: number;
  role: string | null;
};

export type PingMessage = { type: 'PING' };
export type ScanMessage = { type: 'SCAN' };
export type HighlightMessage = { type: 'HIGHLIGHT'; region: RegionType | null };
export type ClearHighlightMessage = { type: 'CLEAR_HIGHLIGHT' };
export type ExtractMessage = { type: 'EXTRACT'; region: RegionType };
export type FetchImagesMessage = { type: 'FETCH_IMAGES'; urls: string[] };
export type OpenSidePanelMessage = { type: 'OPEN_SIDEPANEL' };
export type PickStartMessage = { type: 'PICK_START' };
export type PickCancelMessage = { type: 'PICK_CANCEL'; forget?: boolean };

export type ExtensionMessage =
  | PingMessage
  | ScanMessage
  | HighlightMessage
  | ClearHighlightMessage
  | ExtractMessage
  | FetchImagesMessage
  | OpenSidePanelMessage
  | PickStartMessage
  | PickCancelMessage;

export type PingResponse = { ok: true };
export type ScanResponse = {
  ok: true;
  title: string;
  url: string;
  regions: RegionSummary[];
};
export type ExtractResponse = {
  ok: true;
  title: string;
  html: string;
  navHtml?: string;
  useReadability?: boolean;
  images: ImageMeta[];
};
export type FetchImagesResponse = {
  ok: true;
  images: { url: string; dataUrl: string }[];
};
export type PickResultResponse = {
  ok: true;
  tag: string;
  charCount: number;
};
export type ErrorResponse = { ok: false; error: string };

export type ExtensionResponse =
  | PingResponse
  | ScanResponse
  | ExtractResponse
  | FetchImagesResponse
  | PickResultResponse
  | { ok: true }
  | ErrorResponse;

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  const type = (value as { type: unknown }).type;
  return (
    type === 'PING' ||
    type === 'SCAN' ||
    type === 'HIGHLIGHT' ||
    type === 'CLEAR_HIGHLIGHT' ||
    type === 'EXTRACT' ||
    type === 'FETCH_IMAGES' ||
    type === 'OPEN_SIDEPANEL' ||
    type === 'PICK_START' ||
    type === 'PICK_CANCEL'
  );
}
