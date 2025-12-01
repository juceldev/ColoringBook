export interface HistoryItem {
  id: string;
  prompt: string;
  images: { original: string | null; coloring: string | null }[];
  timestamp: number;
  config?: {
    aspectRatio: AspectRatio;
    resolution: Resolution;
  }
}

export type AspectRatio = '1:1' | '3:4' | '4:3';
export type Resolution = 'standard' | 'hd';
