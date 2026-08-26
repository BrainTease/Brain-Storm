'use client';

import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

/**
 * Shared Listing Form Validation Schema.
 * Validates price (> 0), quantity (>= 1 whole number), royalty basis (0-10000 bps),
 * and basic listing metadata.
 */
export const listingSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or fewer'),
  description: z
    .string()
    .max(1000, 'Description must be 1000 characters or fewer')
    .optional()
    .default(''),
  price: z.coerce
    .number({ invalid_type_error: 'Price must be a valid number' })
    .positive('Price must be greater than 0'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a valid number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  nftId: z.union([z.string(), z.number()]).optional(),
  currency: z.enum(['BST', 'XLM', 'USDC']).default('BST'),
  royaltyBasis: z.coerce
    .number({ invalid_type_error: 'Royalty basis must be a valid number' })
    .min(0, 'Royalty cannot be negative')
    .max(10000, 'Royalty basis cannot exceed 10000 (100%)')
    .optional()
    .default(0),
});

export type ListingFormData = z.infer<typeof listingSchema>;

export interface UseListingFormOptions {
  defaultValues?: Partial<ListingFormData>;
  mode?: 'create' | 'edit';
  onSubmit?: (data: ListingFormData) => void | Promise<void>;
}

export type UseListingFormReturn = UseFormReturn<ListingFormData> & {
  mode: 'create' | 'edit';
  schema: typeof listingSchema;
  validateValues: (values: unknown) => z.SafeParseReturnType<unknown, ListingFormData>;
};

/**
 * Custom hook centralizing marketplace listing form validation and management.
 * Supports both listing creation and editing tied to contracts/market and contracts/nft.
 */
export function useListingForm(options: UseListingFormOptions = {}): UseListingFormReturn {
  const {
    defaultValues = {
      title: '',
      description: '',
      price: undefined as unknown as number,
      quantity: 1,
      currency: 'BST',
      royaltyBasis: 0,
    },
    mode = 'create',
  } = options;

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema) as any,
    defaultValues: {
      title: defaultValues.title ?? '',
      description: defaultValues.description ?? '',
      price: defaultValues.price,
      quantity: defaultValues.quantity ?? 1,
      currency: defaultValues.currency ?? 'BST',
      royaltyBasis: defaultValues.royaltyBasis ?? 0,
      nftId: defaultValues.nftId,
    },
    mode: 'onBlur',
  });

  return {
    ...form,
    mode,
    schema: listingSchema,
    validateValues: (values: unknown) => listingSchema.safeParse(values),
  };
}

export default useListingForm;
