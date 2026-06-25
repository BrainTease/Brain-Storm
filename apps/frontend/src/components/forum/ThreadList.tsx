'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Post } from '@/lib/forumApi';
import { useForumPosts } from '@/hooks/useForum';

interface ThreadListProps {
  courseId: string;
  onThreadClick?: (postId: string) => void;
}

/**
 * Paginated forum thread list with lazy loading
 */
export function ThreadList({ courseId, onThreadClick }: ThreadListProps) {
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { posts, hasMore, isLoading, error } = useForumPosts(courseId, page);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setPage((p) => p + 1);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore]);

  // Update all posts when new page loads
  React.useEffect(() => {
    if (posts.length > 0) {
      setAllPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const newPosts = posts.filter((p) => !ids.has(p.id));
        return [...prev, ...newPosts];
      });
    }
  }, [posts]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Failed to load forum posts. Please try again.</p>
      </div>
    );
  }

  const displayPosts = allPosts.length > 0 ? allPosts : posts;

  return (
    <div>
      {/* Pinned Posts */}
      {displayPosts.filter((p) => p.isPinned).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pinned</h3>
          <div className="space-y-2">
            {displayPosts
              .filter((p) => p.isPinned)
              .map((post) => (
                <ThreadListItem key={post.id} post={post} courseId={courseId} />
              ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Recent</h3>
        {displayPosts.length === 0 && isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : displayPosts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No discussions yet. Be the first to start one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayPosts
              .filter((p) => !p.isPinned)
              .map((post) => (
                <ThreadListItem key={post.id} post={post} courseId={courseId} />
              ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={isLoadingMore}
          className="mt-4 w-full px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium disabled:opacity-50"
        >
          {isLoadingMore ? 'Loading...' : 'Load More Discussions'}
        </button>
      )}
    </div>
  );
}

interface ThreadListItemProps {
  post: Post;
  courseId: string;
}

function ThreadListItem({ post, courseId }: ThreadListItemProps) {
  return (
    <Link href={`/courses/${courseId}/forum/${post.id}`}>
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 truncate">{post.title}</h4>
              {post.isPinned && <span className="text-lg">📌</span>}
              {post.answerReplyId && <span className="text-lg">✓</span>}
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{post.content}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{post.user?.username || 'Unknown'}</span>
              <span>•</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              {post.replyCount !== undefined && (
                <>
                  <span>•</span>
                  <span>{post.replyCount} replies</span>
                </>
              )}
            </div>
          </div>

          {/* Reply Count Badge */}
          {post.replyCount !== undefined && (
            <div className="flex-shrink-0 bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-semibold text-sm">
              {post.replyCount}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
