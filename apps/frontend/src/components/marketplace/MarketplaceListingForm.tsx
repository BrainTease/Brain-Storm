'use client';

import React from 'react';
import { useListingForm, type ListingFormData } from '@/hooks/useListingForm';
import { Button } from '@/components/ui/Button';

export interface MarketplaceListingFormProps {
  mode?: 'create' | 'edit';
  initialValues?: Partial<ListingFormData>;
  onSubmit: (data: ListingFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function MarketplaceListingForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  className = '',
}: MarketplaceListingFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useListingForm({
    defaultValues: initialValues,
    mode,
  });

  const submitting = isLoading || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`space-y-5 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      noValidate
      aria-label={mode === 'create' ? 'Create Marketplace Listing' : 'Edit Marketplace Listing'}
    >
      <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Create New Listing' : 'Edit Listing'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === 'create'
            ? 'List your course or NFT token for sale on the decentralized marketplace.'
            : 'Update price and quantity for your active marketplace listing.'}
        </p>
      </div>

      {/* Title Field */}
      <div>
        <label
          htmlFor="listing-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Listing Title <span className="text-red-500">*</span>
        </label>
        <input
          id="listing-title"
          type="text"
          placeholder="e.g. Advanced Soroban Smart Contract NFT"
          {...register('title')}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
            errors.title
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
          }`}
        />
        {errors.title && (
          <p id="title-error" className="mt-1 text-xs text-red-500" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label
          htmlFor="listing-description"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="listing-description"
          rows={3}
          placeholder="Detailed description of the listing or asset benefits..."
          {...register('description')}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
          className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
            errors.description
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
          }`}
        />
        {errors.description && (
          <p id="description-error" className="mt-1 text-xs text-red-500" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Price & Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="listing-price"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Price <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="listing-price"
              type="number"
              step="any"
              min="0.0000001"
              placeholder="10.0"
              {...register('price')}
              aria-invalid={!!errors.price}
              aria-describedby={errors.price ? 'price-error' : undefined}
              className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                errors.price
                  ? 'border-red-500 focus:ring-red-400'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
              }`}
            />
          </div>
          {errors.price && (
            <p id="price-error" className="mt-1 text-xs text-red-500" role="alert">
              {errors.price.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="listing-currency"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Currency
          </label>
          <select
            id="listing-currency"
            {...register('currency')}
            className="w-full px-3.5 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BST">BST</option>
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
      </div>

      {/* Quantity & Royalty */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="listing-quantity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Quantity <span className="text-red-500">*</span>
          </label>
          <input
            id="listing-quantity"
            type="number"
            min="1"
            step="1"
            placeholder="1"
            {...register('quantity')}
            aria-invalid={!!errors.quantity}
            aria-describedby={errors.quantity ? 'quantity-error' : undefined}
            className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
              errors.quantity
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }`}
          />
          {errors.quantity && (
            <p id="quantity-error" className="mt-1 text-xs text-red-500" role="alert">
              {errors.quantity.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="listing-royalty"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Royalty Basis Points (Bps)
          </label>
          <input
            id="listing-royalty"
            type="number"
            min="0"
            max="10000"
            placeholder="0"
            {...register('royaltyBasis')}
            aria-invalid={!!errors.royaltyBasis}
            aria-describedby={errors.royaltyBasis ? 'royalty-error' : undefined}
            className={`w-full px-3.5 py-2 border rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
              errors.royaltyBasis
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            }`}
          />
          {errors.royaltyBasis && (
            <p id="royalty-error" className="mt-1 text-xs text-red-500" role="alert">
              {errors.royaltyBasis.message}
            </p>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting} className="min-w-[120px]">
          {submitting ? 'Submitting…' : mode === 'create' ? 'Publish Listing' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}

export default MarketplaceListingForm;
