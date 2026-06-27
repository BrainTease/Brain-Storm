'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { VTTLine, parseVTT } from '@/lib/vtt-parser';

interface TranscriptPanelProps {
  src: string;
  currentTime: number;
  onSeek: (time: number) => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
  availableLanguages?: { code: string; label: string }[];
}

export function TranscriptPanel({
  src,
  currentTime,
  onSeek,
  language = 'en',
  onLanguageChange,
  availableLanguages = [],
}: TranscriptPanelProps) {
  const [lines, setLines] = useState<VTTLine[]>([]);
  const [loading, setLoading] = useState(true);
  const activeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) return;
    setLoading(true);
    fetch(src)
      .then((res) => res.text())
      .then((text) => {
        setLines(parseVTT(text));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [src]);

  const activeIndex = lines.findIndex(
    (line) => currentTime >= line.start && currentTime < line.end,
  );

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex]);

  const handleLineClick = useCallback(
    (time: number) => {
      onSeek(time);
    },
    [onSeek],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, time: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSeek(time);
      }
    },
    [onSeek],
  );

  if (loading) {
    return (
      <div
        className="p-4 text-sm text-gray-400"
        role="status"
        aria-label="Loading transcript"
      >
        Loading transcript…
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="p-4 text-sm text-gray-400" role="status">
        No transcript available.
      </div>
    );
  }

  return (
    <div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
      role="region"
      aria-label="Video transcript"
    >
      {(availableLanguages.length > 1 || onLanguageChange) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Transcript
          </span>
          {onLanguageChange && availableLanguages.length > 1 && (
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-gray-700 dark:text-gray-300"
              aria-label="Transcript language"
            >
              {availableLanguages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="overflow-y-auto max-h-[400px] p-2 space-y-0.5"
        tabIndex={0}
        role="list"
        aria-label="Transcript lines"
      >
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={i}
              ref={isActive ? activeRef : undefined}
              role="listitem"
              onClick={() => handleLineClick(line.start)}
              onKeyDown={(e) => handleKeyDown(e, line.start)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="text-xs text-gray-400 dark:text-gray-500 mr-2 font-mono tabular-nums shrink-0">
                {formatTimestamp(line.start)}
              </span>
              <span>{line.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
