'use client';

import React from 'react';

export type NFTBadgeVariant = 'primary' | 'success' | 'warning' | 'neutral' | 'royalty' | 'token';

export interface NFTMetadataBadgeProps {
  label: string;
  value?: string | number;
  variant?: NFTBadgeVariant;
  icon?: React.ReactNode;
  className?: string;
  title?: string;
}

const variantStyles: Record<NFTBadgeVariant, string> = {
  primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700',
  royalty: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  token: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
};

export function NFTMetadataBadge({
  label,
  value,
  variant = 'neutral',
  icon,
  className = '',
  title,
}: NFTMetadataBadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
      <span>{label}</span>
      {value !== undefined && value !== null && (
        <span className="font-semibold">{value}</span>
      )}
    </span>
  );
}

export default NFTMetadataBadge;
