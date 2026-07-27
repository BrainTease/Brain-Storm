'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ThreadDetail } from '@/components/forum/ThreadDetail';
import { useForumPost } from '@/hooks/useForum';
import { useAuthStore } from '@/store/auth.store';

interface ThreadDetailPageProps {
  params: { id: string; postId: string };
}

/**
 * Individual thread/post detail page with full discussion
 */
export default function ThreadDetailPage({ params }: ThreadDetailPageProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { post, isLoading, error, mutate } = useForumPost(params.postId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg p-8">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
              <div className="h-40 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Discussion Not Found</h2>
            <p className="text-red-700 mb-4">
              {error ? 'Failed to load this discussion' : 'The discussion you are looking for does not exist.'}
            </p>
            <Link href={`/courses/${params.id}/forum`} className="text-blue-600 hover:underline">
              ← Back to Forum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if user can mark answers (instructor/admin)
  const canMarkAsAnswer = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <Link
          href={`/courses/${params.id}/forum`}
          className="text-blue-600 hover:underline mb-6 inline-block"
        >
          ← Back to Forum
        </Link>

        {/* Content */}
        <ThreadDetail
          post={post}
          replies={post.replies || []}
          courseId={params.id}
          canMarkAsAnswer={canMarkAsAnswer}
          onReplyCreated={() => {
            mutate();
          }}
        />
      </div>
    </div>
  );
}
