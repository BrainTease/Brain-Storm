import api from './api';

export interface Review {
  id: string;
  courseId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  isFlagged?: boolean;
  instructorReply?: { text: string; createdAt: string };
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: number | null;
  totalCount: number;
  page: number;
  pageSize: number;
  ratingDistribution?: Record<1 | 2 | 3 | 4 | 5, number>;
}

export type SortCriterion = 'helpful' | 'recent' | 'highest' | 'lowest';
export type VoteType = 'up' | 'down';

export const reviewsApi = {
  getReviews: (courseId: string, sort: SortCriterion = 'recent', page = 1, pageSize = 5) =>
    api
      .get<ReviewsResponse>(`/courses/${courseId}/reviews`, { params: { sort, page, pageSize } })
      .then((r) => r.data),

  submitReview: (courseId: string, rating: number, text: string) =>
    api.post<Review>(`/courses/${courseId}/reviews`, { rating, text }).then((r) => r.data),

  submitInstructorReply: (courseId: string, reviewId: string, text: string) =>
    api.post(`/courses/${courseId}/reviews/${reviewId}/reply`, { text }).then((r) => r.data),

  voteReview: (courseId: string, reviewId: string, vote: VoteType) =>
    api
      .post<{ upvotes: number; downvotes: number; userVote: VoteType | null }>(
        `/courses/${courseId}/reviews/${reviewId}/vote`,
        { vote }
      )
      .then((r) => r.data),

  flagReview: (courseId: string, reviewId: string, reason: string) =>
    api
      .post(`/courses/${courseId}/reviews/${reviewId}/flag`, { reason })
      .then((r) => r.data),
};
