import type { Meta, StoryObj } from '@storybook/react';
import { StreakIndicator } from './StreakIndicator';

const meta: Meta<typeof StreakIndicator> = {
  title: 'Gamification/StreakIndicator',
  component: StreakIndicator,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof StreakIndicator>;

export const ActiveStreak: Story = { args: { streak: 7, longestStreak: 21 } };
export const NoStreak: Story = { args: { streak: 0, longestStreak: 5 } };
export const LongStreak: Story = { args: { streak: 100, longestStreak: 150 } };
