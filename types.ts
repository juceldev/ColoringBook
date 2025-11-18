export interface HistoryItem {
  id: string;
  prompt: string;
  images: { original: string | null; coloring: string | null }[];
  timestamp: number;
}
