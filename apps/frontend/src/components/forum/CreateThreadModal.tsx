'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Modal } from '@/components/ui/Modal';
import { useCreatePost } from '@/hooks/useForum';

import { MarkdownEditor } from './MarkdownEditor';

export const threadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  content: z.string().trim().min(1, 'Content is required'),
});

type ThreadFormData = z.infer<typeof threadSchema>;

interface CreateThreadModalProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated?: () => void;
}

/**
 * Modal for creating a new forum thread/post
 */
// eslint-disable-next-line max-lines-per-function -- modal with markdown editor; split in a follow-up
export function CreateThreadModal({
  courseId,
  isOpen,
  onClose,
  onThreadCreated,
}: CreateThreadModalProps) {
  const [error, setError] = useState<string | null>(null);

  const { createPost, isLoading } = useCreatePost(courseId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ThreadFormData>({
    resolver: zodResolver(threadSchema),
    defaultValues: { title: '', content: '' },
  });

  const title = watch('title') ?? '';

  const onSubmit = async (data: ThreadFormData) => {
    setError(null);
    try {
      await createPost(data.title, data.content);
      reset();
      onThreadCreated?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create thread';
      setError(message);
    }
  };

  const busy = isLoading || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start a New Discussion" size="lg">
      {/* Content */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="mb-6">
          <label htmlFor="thread-title" className="block text-sm font-semibold text-gray-900 mb-2">
            Title
          </label>
          <input
            id="thread-title"
            type="text"
            {...register('title')}
            placeholder="What's your question or discussion topic?"
            maxLength={200}
            disabled={busy}
            aria-invalid={!!errors.title}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          {errors.title && (
            <p role="alert" className="text-sm text-red-600 mt-1">
              {errors.title.message}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">{title.length}/200 characters</p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <MarkdownEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Provide details about your question or topic. Markdown is supported."
                disabled={busy}
                minHeight={250}
              />
            )}
          />
          {errors.content && (
            <p role="alert" className="text-sm text-red-600 mt-1">
              {errors.content.message}
            </p>
          )}
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
            disabled={busy}
            className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Discussion'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
