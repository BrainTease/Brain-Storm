/**
 * Shared marketplace / NFT listing types. The listing domain is sourced from a
 * single canonical definition here and imported by each workspace so field
 * shapes and status values stay in sync across the API boundary.
 *
 * @module listing.types
 */

/** Currency accepted for a marketplace listing. */
export type ListingCurrency = 'BST' | 'XLM' | 'USDC';

/** Lifecycle status of a marketplace transaction. */
export type MarketplaceTransactionStatus = 'completed' | 'pending' | 'refunded' | 'failed';

/** Input/state shape of a marketplace listing form. */
export interface ListingFormData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  nftId?: string | number;
  currency: ListingCurrency;
  royaltyBasis: number;
}

/**
 * A single marketplace transaction (an on-chain sale of a course/NFT listing).
 * Numeric fields are kept as strings to avoid floating-point precision loss.
 */
export interface MarketplaceTransaction {
  id: string;
  date: string;
  course: string;
  buyer: string;
  seller: string;
  amount: string;
  fee: string;
  status: MarketplaceTransactionStatus;
}

/** Alias kept for backward compatibility with existing import sites. */
export type MarketplaceTx = MarketplaceTransaction;
