import type { Meta, StoryObj } from '@storybook/react';
import { BadgeGrid } from './BadgeGrid';
import type { Badge } from './BadgeGrid';

const meta: Meta<typeof BadgeGrid> = {
  title: 'Gamification/BadgeGrid',
  component: BadgeGrid,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof BadgeGrid>;

const SAMPLE: Badge[] = [
  { id: '1', name: 'First Steps', description: 'Complete your first lesson', icon: '⭐', unlockedAt: '2026-01-15T00:00:00Z' },
  { id: '2', name: 'On Fire', description: '7-day streak', icon: '🔥', unlockedAt: '2026-02-01T00:00:00Z' },
  { id: '3', name: 'Scholar', description: 'Complete 10 courses', icon: '🎓', unlockedAt: null },
  { id: '4', name: 'Voter', description: 'Cast your first governance vote', icon: '🗳️', unlockedAt: null },
  { id: '5', name: 'Mentor', description: 'Help 5 peers in the forum', icon: '🤝', unlockedAt: null },
];

export const PartialUnlock: Story = { args: { badges: SAMPLE } };

export const AllUnlocked: Story = {
  args: {
    badges: SAMPLE.map((b) => ({ ...b, unlockedAt: b.unlockedAt ?? '2026-03-01T00:00:00Z' })),
  },
};

export const Empty: Story = { args: { badges: [] } };
