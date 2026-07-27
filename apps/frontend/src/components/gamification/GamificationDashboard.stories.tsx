import type { Meta, StoryObj } from '@storybook/react';
import { XpProgress } from './XpProgress';

const meta: Meta<typeof XpProgress> = {
  title: 'Gamification/XpProgress',
  component: XpProgress,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof XpProgress>;

export const EarlyLevel: Story = { args: { xp: 40, level: 1, xpForNextLevel: 100 } };
export const MidLevel: Story = { args: { xp: 820, level: 5, xpForNextLevel: 1000 } };
export const MaxProgress: Story = { args: { xp: 1000, level: 10, xpForNextLevel: 1000 } };
