'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fuzzySearch } from '@/lib/fuzzy-search';
import { createNavigationCommands, createActionCommands, createCourseCommands, Command } from '@/lib/command-palette-items';
import { useCoursesStore } from '@/store/courses.store';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { courses } = useCoursesStore();

  const allCommands = useMemo(() => {
    const nav = createNavigationCommands(router);
    const actions = createActionCommands();
    const courseCommands = createCourseCommands(courses);
    
    return [...nav, ...actions, ...courseCommands];
  }, [router, courses]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show recent items (navigation + actions) when empty
      return allCommands.filter(cmd => cmd.category === 'navigation' || cmd.category === 'actions').slice(0, 10);
    }
    
    return fuzzySearch(
      allCommands.map(cmd => ({
        id: cmd.id,
        title: cmd.title,
        description: cmd.description,
        category: cmd.category,
        ...cmd,
      })),
      query,
      10,
    );
  }, [query, allCommands]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleSelect(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement;
    if (selected && listRef.current) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (command: Command) => {
      command.onSelect();
      onClose();
      setQuery('');
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
      />
      
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="w-full bg-transparent outline-none text-sm placeholder-gray-400 dark:placeholder-gray-600"
            aria-label="Command search"
            aria-autocomplete="list"
            aria-expanded={filteredCommands.length > 0}
            aria-controls="command-list"
          />
        </div>

        {/* Results list */}
        {filteredCommands.length > 0 ? (
          <ul
            ref={listRef}
            id="command-list"
            className="max-h-64 overflow-y-auto"
            role="listbox"
          >
            {filteredCommands.map((command, index) => (
              <li
                key={command.id}
                role="option"
                aria-selected={index === selectedIndex}
                className={`px-3 py-2 cursor-pointer flex items-start gap-3 transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleSelect(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="text-lg pt-0.5 flex-shrink-0" aria-hidden="true">
                  {command.icon || '⌘'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {command.title}
                  </div>
                  {command.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {command.description}
                    </div>
                  )}
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {command.category}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No commands found
          </div>
        )}

        {/* Footer with help text */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <span>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd> <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd> to navigate</span>
          <span>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
