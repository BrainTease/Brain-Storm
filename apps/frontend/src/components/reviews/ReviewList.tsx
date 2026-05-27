'use client';
import { useEffect, useState, useCallback } from 'react';
import { reviewsApi, Review, SortCriterion } from '@/lib/reviewsApi';
import { StarRating } from './StarRating';
import { InstructorReply } from './InstructorReply';
import { FlagModal } from './FlagModal';

interface ReviewListProps {
  courseId: string;
  currentUserId?: string;
  isInstructor?: boolean;
}

const SORT_OPTIONS: { value: SortCriterion; label: string }[] = [
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'highest', label: 'Highest Rating' },
  { value: 'lowest', label: 'Lowest Rating' },
];

const PAGE_SIZE = 5;

export function ReviewList({ courseId, currentUserId, isInstructor = false }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({});
  const [sort, setSort] = useState<SortCriterion>('recent');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [flagTarget, setFlagTarget] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  const loadReviews = useCallback(() => {
    setLoading(true);
    reviewsApi.getReviews(courseId, sort, page, PAGE_SIZE).then((data) => {
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
      setTotalCount(data.totalCount);
      setTotalPages(Math.ceil(data.totalCount / PAGE_SIZE) || 1);
      if (data.ratingDistribution) setRatingDistribution(data.ratingDistribution);
      setLoading(false);
    });
  }, [courseId, sort, page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleVote = useCallback(
    async (reviewId: string, vote: 'up' | 'down') => {
      if (votingId) return;
      setVotingId(reviewId);
      try {
        const result = await reviewsApi.voteReview(courseId, reviewId, vote);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === reviewId
              ? { ...r, upvotes: result.upvotes, downvotes: result.downvotes, userVote: result.userVote }
              : r
          )
        );
      } finally {
        setVotingId(null);
      }
    },
    [courseId, votingId]
  );

  const handleFlag = useCallback(
    async (reason: string) => {
      if (!flagTarget) return;
      await reviewsApi.flagReview(courseId, flagTarget, reason);
      setReviews((prev) =>
        prev.map((r) => (r.id === flagTarget ? { ...r, isFlagged: true } : r))
      );
      setFlagTarget(null);
    },
    [courseId, flagTarget]
  );

  return (
    <section aria-label="Course reviews">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="shrink-0">
          {averageRating !== null ? (
            <div className="text-center">
              <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                {averageRating.toFixed(1)}
              </span>
              <div className="mt-1">
                <StarRating value={Math.round(averageRating)} readOnly />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {totalCount} review{totalCount !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">No reviews yet</span>
          )}
        </div>

        {/* Rating distribution bars */}
        {totalCount > 0 && (
          <div className="flex-1 space-y-1 min-w-0">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] ?? 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="w-3 text-right">{star}</span>
                  <span className="text-yellow-400 text-sm">★</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-400 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-7 text-right text-gray-400">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sort */}
        <div className="shrink-0">
          <select
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortCriterion); setPage(1); }}
            aria-label="Sort reviews"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Review list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse border rounded-lg p-4 space-y-2 dark:border-gray-700">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No reviews yet. Be the first to review this course!</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {review.authorName}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <StarRating value={review.rating} readOnly />
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{review.text}</p>

              {/* Voting & Flag row */}
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Helpful?</span>
                <button
                  type="button"
                  disabled={votingId === review.id}
                  onClick={() => handleVote(review.id, 'up')}
                  aria-label={`Upvote review by ${review.authorName}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    review.userVote === 'up'
                      ? 'border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Yes ({review.upvotes})
                </button>
                <button
                  type="button"
                  disabled={votingId === review.id}
                  onClick={() => handleVote(review.id, 'down')}
                  aria-label={`Downvote review by ${review.authorName}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border transition-colors ${
                    review.userVote === 'down'
                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-red-400 hover:text-red-600 dark:hover:text-red-400'
                  }`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                  No ({review.downvotes ?? 0})
                </button>

                {/* Moderation flag */}
                {!review.isFlagged && currentUserId && currentUserId !== review.authorId && (
                  <button
                    type="button"
                    onClick={() => setFlagTarget(review.id)}
                    aria-label={`Flag review by ${review.authorName} as inappropriate`}
                    className="ml-auto flex items-center gap-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H9.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    Flag
                  </button>
                )}
                {review.isFlagged && (
                  <span className="ml-auto flex items-center gap-1 text-amber-500 dark:text-amber-400 text-xs">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H9.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                    Flagged for review
                  </span>
                )}
              </div>

              <InstructorReply
                courseId={courseId}
                reviewId={review.id}
                existingReply={review.instructorReply}
                isInstructor={isInstructor}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mt-6 flex items-center justify-between"
          aria-label="Review pagination"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            Next →
          </button>
        </nav>
      )}

      {/* Flag modal */}
      {flagTarget && (
        <FlagModal
          onConfirm={handleFlag}
          onCancel={() => setFlagTarget(null)}
        />
      )}
    </section>
  );
}
