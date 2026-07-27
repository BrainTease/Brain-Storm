'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
}

/**
 * Markdown editor with live preview
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your message here...',
  disabled = false,
  minHeight = 150,
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={() => insertMarkdown('**', '**', 'bold')}
            className="px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded"
            title="Bold"
            disabled={disabled}
          >
            B
          </button>
          <button
            onClick={() => insertMarkdown('_', '_', 'italic')}
            className="px-2 py-1 text-sm italic text-gray-700 hover:bg-gray-200 rounded"
            title="Italic"
            disabled={disabled}
          >
            I
          </button>
          <button
            onClick={() => insertMarkdown('`', '`', 'code')}
            className="px-2 py-1 text-sm font-mono text-gray-700 hover:bg-gray-200 rounded"
            title="Code"
            disabled={disabled}
          >
            &lt;&gt;
          </button>
          <div className="w-px bg-gray-300 mx-1" />
          <button
            onClick={() => insertMarkdown('- ', '', 'list')}
            className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded"
            title="List"
            disabled={disabled}
          >
            •
          </button>
          <button
            onClick={() => insertMarkdown('> ', '', 'quote')}
            className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded"
            title="Quote"
            disabled={disabled}
          >
            "
          </button>
          <button
            onClick={() => insertMarkdown('[', '](url)', 'link')}
            className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-200 rounded"
            title="Link"
            disabled={disabled}
          >
            🔗
          </button>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={`px-3 py-1 text-sm rounded font-medium transition-colors ${
            showPreview
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          disabled={disabled}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex gap-4 p-4">
        {!showPreview && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 px-3 py-2 border rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            style={{ minHeight: `${minHeight}px` }}
          />
        )}

        {showPreview && (
          <div
            className="flex-1 prose prose-sm max-w-none px-3 py-2 text-sm"
            style={{ minHeight: `${minHeight}px` }}
          >
            <ReactMarkdown>{value || placeholder}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Character count */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-600">
        {value.length} characters
      </div>
    </div>
  );

  function insertMarkdown(before: string, after: string, type: string) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const newValue =
      value.substring(0, start) + before + selected + after + value.substring(end);

    onChange(newValue);

    // Reset cursor position after update
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  }
}
