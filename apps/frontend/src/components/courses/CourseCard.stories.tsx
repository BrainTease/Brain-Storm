import type { Meta, StoryObj } from '@storybook/react';
import { CourseCard } from './CourseCard';

const meta: Meta<typeof CourseCard> = {
  title: 'Courses/CourseCard',
  component: CourseCard,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof CourseCard>;

const base = {
  id: '1',
  title: 'Introduction to Stellar Blockchain',
  description: 'Learn the fundamentals of the Stellar network, smart contracts, and decentralized finance.',
  instructor: 'Alice Johnson',
  rating: 4.7,
  reviewCount: 1234,
  level: 'beginner' as const,
  durationHours: 6,
  price: 49.99,
  category: 'Blockchain',
};

export const Default: Story = { args: base };

export const WithImage: Story = {
  args: { ...base, imageUrl: 'https://picsum.photos/seed/course/640/360' },
};

export const Free: Story = { args: { ...base, price: 0, level: 'intermediate' } };

export const Advanced: Story = {
  args: { ...base, level: 'advanced', price: 99.99, enrollmentCount: 5200 },
};

export const NoReviews: Story = {
  args: { ...base, reviewCount: undefined, enrollmentCount: undefined },
};
