'use client';

import { BadgeDisplay, type BadgeItem } from '@/components/ui/BadgeDisplay';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

interface BadgeGridProps {
  badges: Badge[];
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const badgeItems: BadgeItem[] = badges.map((badge) => ({
    ...badge,
    variant: badge.unlockedAt ? 'success' : 'default',
  }));

  return (
    <BadgeDisplay
      variant="grid"
      badges={badgeItems}
      emptyMessage="No badges yet — keep learning to earn your first one!"
      columns={6}
    />
  );
}
