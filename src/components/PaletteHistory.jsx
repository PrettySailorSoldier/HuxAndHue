import React, { useState, useEffect, useCallback } from 'react';
import { History, Heart, Trash2, Clock } from 'lucide-react';
import { oklchToHex } from '../utils/colorUtils';

const STORAGE_KEY = 'hexandhue_palette_history';
const MAX_HISTORY = 20;

// Custom hook for palette history
export function usePaletteHistory() {
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setHistory(data.history || []);
        setFavorites(data.favorites || []);
      }
    } catch (err) {
      console.error('Failed to load palette history:', err);
    }
  }, []);

  // Save to localStorage whenever history or favorites change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ history, favorites }));
    } catch (err) {
      console.error('Failed to save palette history:', err);
    }
  }, [history, favorites]);

  const addToHistory = useCallback((palette) => {
    if (!palette || palette.length === 0) return;
    
    const entry = {
      id: Date.now(),
      colors: palette,
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => {
      // Don't add duplicate (same colors)
      const isDuplicate = prev.some(p => 
        p.colors.length === palette.length &&
        p.colors.every((c, i) => oklchToHex(c) === oklchToHex(palette[i]))
      );
      if (isDuplicate) return prev;
      
      return [entry, ...prev].slice(0, MAX_HISTORY);
    });
  }, []);

  const toggleFavorite = useCallback((paletteOrId) => {
    // If it's an array (palette colors), find the matching entry by colors
    if (Array.isArray(paletteOrId)) {
      const palette = paletteOrId;
      setHistory(prev => {
        const existingEntry = prev.find(entry =>
          entry.colors.length === palette.length &&
          entry.colors.every((c, i) => oklchToHex(c) === oklchToHex(palette[i]))
        );

        if (existingEntry) {
          // Toggle favorite for existing entry
          setFavorites(favs =>
            favs.includes(existingEntry.id)
              ? favs.filter(id => id !== existingEntry.id)
              : [...favs, existingEntry.id]
          );
          return prev;
        } else {
          // Add new entry and mark as favorite
          const newEntry = {
            id: Date.now(),
            colors: palette,
            timestamp: new Date().toISOString(),
          };
          setFavorites(favs => [...favs, newEntry.id]);
          return [newEntry, ...prev].slice(0, MAX_HISTORY);
        }
      });
    } else {
      // It's an ID
      setFavorites(prev =>
        prev.includes(paletteOrId)
          ? prev.filter(id => id !== paletteOrId)
          : [...prev, paletteOrId]
      );
    }
  }, []);

  const removeFromHistory = useCallback((paletteId) => {
    setHistory(prev => prev.filter(p => p.id !== paletteId));
    setFavorites(prev => prev.filter(id => id !== paletteId));
  }, []);

  const removeFromFavorites = useCallback((paletteId) => {
    setFavorites(prev => prev.filter(id => id !== paletteId));
  }, []);

  const isFavorite = useCallback((palette) => {
    if (!palette || palette.length === 0) return false;
    return history.some(entry =>
      favorites.includes(entry.id) &&
      entry.colors.length === palette.length &&
      entry.colors.every((c, i) => oklchToHex(c) === oklchToHex(palette[i]))
    );
  }, [history, favorites]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setFavorites([]);
  }, []);

  return {
    history,
    favorites,
    addToHistory,
    toggleFavorite,
    removeFromHistory,
    removeFromFavorites,
    isFavorite,
    clearHistory,
  };
}

// UI Component
export default function PaletteHistory({ 
  history = [], 
  favorites = [], 
  onSelect, 
  onToggleFavorite, 
  onRemove, 
  onClear 
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'favorites'

  const filteredHistory = filter === 'favorites' 
    ? history.filter(p => favorites.includes(p.id))
    : history;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (history.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium flex items-center gap-2">
          <History size={14} />
          Palette History
        </h3>
        <div className="p-6 border border-dashed border-[#1a1a24] text-[#55556a] rounded-xl text-center">
          <Clock size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No palettes yet</p>
          <p className="text-xs mt-1">Generated palettes will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs text-[#8888a0] uppercase tracking-wider font-medium flex items-center gap-2">
          <History size={14} />
          History ({history.length})
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded text-[10px] ${
              filter === 'all' ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' : 'text-[#55556a]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-2 py-1 rounded text-[10px] ${
              filter === 'favorites' ? 'bg-[#ff6b4a]/20 text-[#ff6b4a]' : 'text-[#55556a]'
            }`}
          >
            ♥ Favorites
          </button>
          <button
            onClick={onClear}
            className="px-2 py-1 rounded text-[10px] text-[#55556a] hover:text-red-400"
            title="Clear all"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filteredHistory.map((entry) => {
          const isFavorite = favorites.includes(entry.id);
          
          return (
            <div 
              key={entry.id}
              className="group bg-[#12121a] rounded-lg p-2 border border-[#1a1a24] hover:border-[#252530] transition-colors"
            >
              {/* Color swatches */}
              <button
                onClick={() => onSelect && onSelect(entry.colors)}
                className="w-full flex gap-0.5 h-8 rounded overflow-hidden hover:opacity-90 transition-opacity mb-2"
              >
                {entry.colors.slice(0, 6).map((color, i) => (
                  <div 
                    key={i}
                    className="flex-1"
                    style={{ backgroundColor: oklchToHex(color) }}
                  />
                ))}
              </button>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#55556a]">
                  {formatTime(entry.timestamp)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggleFavorite && onToggleFavorite(entry.id)}
                    className={`p-1 rounded ${
                      isFavorite ? 'text-[#ff6b4a]' : 'text-[#55556a] hover:text-[#8888a0]'
                    }`}
                  >
                    <Heart size={12} className={isFavorite ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={() => onRemove && onRemove(entry.id)}
                    className="p-1 rounded text-[#55556a] hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
