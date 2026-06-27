'use client';

import { useCallback, useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const updateLineNumbers = useCallback(() => {
    if (!textareaRef.current || !lineNumbersRef.current) return;
    const lines = textareaRef.current.value.split('\n').length;
    lineNumbersRef.current.innerHTML = Array.from(
      { length: lines },
      (_, i) => `<span class="text-gray-400 dark:text-gray-600 text-xs leading-6 pr-2 select-none">${i + 1}</span>`,
    ).join('');
  }, []);

  useEffect(() => {
    updateLineNumbers();
  }, [value, updateLineNumbers]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue =
        ta.value.substring(0, start) + '  ' + ta.value.substring(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  }, [onChange]);

  return (
    <div
      className="relative border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900"
      role="region"
      aria-label={`Code editor - ${language}`}
    >
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
          {language}
        </span>
        {readOnly && (
          <span className="text-xs text-gray-500 dark:text-gray-400">Read-only</span>
        )}
      </div>

      <div className="flex">
        <div
          ref={lineNumbersRef}
          className="px-2 py-3 text-right border-r border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 min-w-[3rem] select-none"
          aria-hidden="true"
        />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={() => {
            if (lineNumbersRef.current && textareaRef.current) {
              lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
            }
          }}
          readOnly={readOnly}
          spellCheck={false}
          className="flex-1 p-3 font-mono text-sm leading-6 bg-transparent text-gray-900 dark:text-gray-100 resize-none focus:outline-none tab-size-2"
          style={{ minHeight: '200px' }}
          aria-label="Code editor input"
        />
      </div>
    </div>
  );
}
