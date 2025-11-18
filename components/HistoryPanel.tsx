import React from 'react';
import { HistoryItem } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

const timeAgo = (timestamp: number): string => {
    const now = Date.now();
    const seconds = Math.floor((now - timestamp) / 1000);

    if (seconds < 5) return "just now";
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }

    return `${seconds} seconds ago`;
};


const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  history,
  onSelectItem,
  onClearHistory,
  onClose,
}) => {
  return (
    <div 
        className={`fixed inset-0 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-labelledby="slide-over-title" 
        role="dialog" 
        aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80"
        onClick={onClose}
      ></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className={`transform transition ease-in-out duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="w-screen max-w-md h-full flex flex-col bg-white dark:bg-gray-800 shadow-xl">
            <header className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                <h2 id="slide-over-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Generation History
                </h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    aria-label="Close history panel"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {history.length > 0 ? (
                <ul className="space-y-4">
                    {history.map((item) => {
                        const firstImage = item.images.find(img => img.original || img.coloring);
                        const thumbnailUrl = firstImage?.original || firstImage?.coloring;
                        return (
                            <li key={item.id}>
                            <button
                                onClick={() => onSelectItem(item)}
                                className="w-full text-left p-3 rounded-lg flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                {thumbnailUrl ? (
                                    <img src={thumbnailUrl} alt="Thumbnail of generated image" className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-white" />
                                ) : (
                                    <div className="w-16 h-16 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                    </div>
                                )}
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{item.prompt}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeAgo(item.timestamp)}</p>
                                </div>
                            </button>
                            </li>
                        );
                    })}
                </ul>
                ) : (
                <div className="text-center py-10 h-full flex flex-col justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No history yet</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your generated images will appear here.</p>
                </div>
                )}
            </div>

            {history.length > 0 && (
                <footer className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClearHistory}
                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-red-500"
                    >
                        Clear All History
                    </button>
                </footer>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;