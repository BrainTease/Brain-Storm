'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { reviewsApi } from '@/lib/reviewsApi';

import { StarRating } from './StarRating';

const MAX_CHARS = 1000;
const COUNTER_THRESHOLD = 900;

export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Please select a rating').max(5),
  text: z
    .string()
    .refine((value) => value.trim().length > 0, 'Please write a review')
    .max(MAX_CHARS, `Review must be ${MAX_CHARS} characters or fewer`),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  courseId: string;
  onSuccess: () => void;
}

export function ReviewForm({ courseId, onSuccess }: ReviewFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, text: '' },
  });

  const text = watch('text') ?? '';
  const remaining = MAX_CHARS - text.length;

  async function onSubmit(data: ReviewFormData) {
    setApiError(null);
    try {
      await reviewsApi.submitReview(courseId, data.rating, data.text);
      setSuccess(true);
      onSuccess();
    } catch {
      setApiError('Failed to submit review. Please try again.');
    }
  }

  if (success) {
    return <p className="text-green-600 font-medium">Review submitted successfully!</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Your Rating</label>
        <Controller
          name="rating"
          control={control}
          render={({ field }) => <StarRating value={field.value} onRatingChange={field.onChange} />}
        />
        {errors.rating && <p className="text-red-600 text-sm mt-1">{errors.rating.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Your Review</label>
        <textarea
          className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          maxLength={MAX_CHARS}
          {...register('text')}
          placeholder="Share your experience with this course..."
        />
        {errors.text && <p className="text-red-600 text-sm mt-1">{errors.text.message}</p>}
        {text.length >= COUNTER_THRESHOLD && (
          <p className={`text-xs mt-1 ${remaining <= 50 ? 'text-red-500' : 'text-gray-500'}`}>
            {remaining} characters remaining
          </p>
        )}
      </div>
      {apiError && <p className="text-red-600 text-sm">{apiError}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Submit Review'}
      </Button>
    </form>
  );
}
