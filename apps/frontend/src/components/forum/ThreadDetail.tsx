'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Post, Reply } from '@/lib/forumApi';
import { useAuthStore } from '@/store/auth.store';
import { useCreateReply, useFlagContent, useDeletePost } from '@/hooks/useForum';
import { MarkdownEditor } from './MarkdownEditor';
import { ReplyItem } from './ReplyItem';

interface ThreadDetailProps {
  post: Post;
  replies: Reply[];
  courseId: string;
  onReplyCreated?: () => void;
  canMarkAsAnswer?: boolean;
}

/**
 * Full thread detail view with replies and composer
 */
export function ThreadDetail({
  post,
  replies,
  courseId,
  onReplyCreated,
  canMarkAsAnswer = false,
}: ThreadDetailProps) {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthor = user?.id === post.userId;

  const { createReply, isLoading: isCreatingReply } = useCreateReply(post.id);
  const { flagContent, isLoading: isFlagging } = useFlagContent();
  const { deletePost, isLoading: isDeleting } = useDeletePost();

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;

    try {
      await createReply(replyContent.trim());
      setReplyContent('');
      setShowReplyForm(false);
      onReplyCreated?.();
    } catch (err) {
      console.error('Failed to create reply:', err);
    }
  };

  const handleFlagPost = async () => {
    const reason = prompt('Please describe why you are flagging this post:');
    if (!reason) return;
    try {
      await flagContent('post', post.id, reason);
      alert('Post flagged for review. Thank you!');
    } catch (err) {
      console.error('Failed to flag post:', err);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.'))
      return;
    try {
      await deletePost(post.id);
      // Navigate back to forum list
      window.location.href = `/courses/${courseId}/forum`;
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const answeredReply = replies.find((r) => r.id === post.answerReplyId);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Thread Header */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
            <div className="flex items-center gap-3">
              {post.user?.avatar && (
                <img
                  src={post.user.avatar}
                  alt={post.user?.username}
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="font-semibold text-gray-900">{post.user?.username || 'Unknown'}</p>
                <p className="text-xs text-gray-500">
                  {new Date(post.createdAt).toLocaleDateString()} at{' '}
                  {new Date(post.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Post Actions */}
          <div className="flex gap-2">
            {isAuthor && (
              <button
                onClick={handleDeletePost}
                disabled={isDeleting}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            {!isAuthor && (
              <button
                onClick={handleFlagPost}
                disabled={isFlagging}
                className="px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 rounded disabled:opacity-50"
              >
                {isFlagging ? 'Flagging...' : 'Flag'}
              </button>
            )}
          </div>
        </div>

        {/* Thread Content */}
        <div className="prose prose-sm max-w-none text-gray-700 mb-4">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {post.isPinned && (
            <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
              📌 Pinned
            </span>
          )}
          {answeredReply && (
            <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
              ✓ Answered
            </span>
          )}
        </div>
      </div>

      {/* Answered Reply Highlight */}
      {answeredReply && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">✓ Accepted Answer</h2>
          <ReplyItem
            reply={answeredReply}
            isAnswer={true}
            courseId={courseId}
            postId={post.id}
            canMarkAsAnswer={canMarkAsAnswer}
          />
        </div>
      )}

      {/* Other Replies */}
      {replies.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Replies ({replies.filter((r) => r.id !== answeredReply?.id).length})
          </h2>
          <div className="space-y-4">
            {replies
              .filter((r) => r.id !== answeredReply?.id)
              .map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  isAnswer={reply.isAnswer}
                  courseId={courseId}
                  postId={post.id}
                  onAnswerMarked={onReplyCreated}
                  canMarkAsAnswer={canMarkAsAnswer}
                />
              ))}
          </div>
        </div>
      )}

      {/* Reply Form */}
      {user ? (
        <div className="bg-white rounded-lg border p-6">
          {!showReplyForm ? (
            <button
              onClick={() => setShowReplyForm(true)}
              className="w-full px-4 py-2 text-left text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Write a reply...
            </button>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Write a Reply</h3>
              <MarkdownEditor
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Share your thoughts, solutions, or questions..."
                minHeight={200}
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyContent('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={isCreatingReply || !replyContent.trim()}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {isCreatingReply ? 'Posting...' : 'Post Reply'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-gray-700">
            <a href="/login" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </a>{' '}
            to reply to this thread.
          </p>
        </div>
      )}
    </div>
  );
}
