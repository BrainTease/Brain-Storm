'use client';

import React, { useState } from 'react';
import { useCreatePost } from '@/hooks/useForum';
import { MarkdownEditor } from './MarkdownEditor';

interface CreateThreadModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated?: () => void;
}

/**
 * Modal for creating a new forum thread/post
 */
export function CreateThreadModal({
  courseId,
  isOpen,
  onClose,
  onThreadCreated,
}: CreateThreadModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { createPost, isLoading } = useCreatePost(courseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!content.trim()) {
      setError('Content is required');
      return;
    }

    try {
      await createPost(title.trim(), content.trim());
      setTitle('');
      setContent('');
      onThreadCreated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create thread';
      setError(message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 border-b bg-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Start a New Discussion</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or discussion topic?"
              maxLength={200}
              disabled={isLoading}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
          </div>

          {/* Content */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="Provide details about your question or topic. Markdown is supported."
              disabled={isLoading}
              minHeight={250}
            />
          </div>

          {/* Guidelines */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-700">
            <p className="font-semibold text-blue-900 mb-2">✓ Tips for Good Posts:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Be specific and provide context</li>
              <li>Include error messages or code examples if relevant</li>
              <li>Check if your question has already been answered</li>
              <li>Be respectful and follow community guidelines</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Discussion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
