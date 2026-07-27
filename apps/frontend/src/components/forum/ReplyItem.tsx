'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Reply } from '@/lib/forumApi';
import { useAuthStore } from '@/store/auth.store';
import { useFlagContent, useMarkAsAnswer, useDeleteReply } from '@/hooks/useForum';

interface ReplyItemProps {
  reply: Reply;
  isAnswer: boolean;
  onAnswerMarked?: () => void;
  canMarkAsAnswer?: boolean;
  courseId: string;
  postId: string;
}

/**
 * Individual forum reply component
 */
export function ReplyItem({
  reply,
  isAnswer,
  onAnswerMarked,
  canMarkAsAnswer = false,
  courseId,
  postId,
}: ReplyItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthor = user?.id === reply.userId;
  const { markAsAnswer, isLoading: isMarkingAnswer } = useMarkAsAnswer();
  const { deleteReply, isLoading: isDeleting } = useDeleteReply();
  const { flagContent, isLoading: isFlagging } = useFlagContent();

  const handleMarkAsAnswer = async () => {
    try {
      await markAsAnswer(reply.id);
      onAnswerMarked?.();
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to mark as answer:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    try {
      await deleteReply(reply.id);
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  const handleFlag = async () => {
    const reason = prompt('Please describe why you are flagging this reply:');
    if (!reason) return;
    try {
      await flagContent('reply', reply.id, reason);
      alert('Reply flagged for review. Thank you!');
      setShowMenu(false);
    } catch (err) {
      console.error('Failed to flag reply:', err);
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isAnswer ? 'bg-green-50 border-green-200' : 'bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          {reply.user?.avatar && (
            <img
              src={reply.user.avatar}
              alt={reply.user.username}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{reply.user?.username || 'Unknown'}</p>
              {isAnswer && (
                <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
                  ✓ Answer
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {new Date(reply.createdAt).toLocaleDateString()} at{' '}
              {new Date(reply.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            aria-label="Options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V16.5H10.5V8.5ZM10.5 16.5H9.5V18.5H10.5V16.5Z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10">
              {canMarkAsAnswer && !isAnswer && (
                <button
                  onClick={handleMarkAsAnswer}
                  disabled={isMarkingAnswer}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  {isMarkingAnswer ? 'Marking...' : 'Mark as Answer'}
                </button>
              )}
              {isAuthor && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              )}
              {!isAuthor && (
                <button
                  onClick={handleFlag}
                  disabled={isFlagging}
                  className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  {isFlagging ? 'Flagging...' : 'Flag for Review'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="prose prose-sm max-w-none text-gray-700">
        <ReactMarkdown>{reply.content}</ReactMarkdown>
      </div>
    </div>
  );
}
