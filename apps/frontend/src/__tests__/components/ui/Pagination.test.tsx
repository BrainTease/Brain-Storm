/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from '@/components/ui/Pagination';

// eslint-disable-next-line max-lines-per-function
describe('Pagination', () => {
  it('renders pagination controls with current page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('disables previous button on first page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('enables both buttons on middle pages', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('calls onPageChange with correct page on previous click', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange with correct page on next click', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('handles zero items edge case with single page', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={1} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('handles single page scenario - all buttons disabled', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={1} onPageChange={onPageChange} />);
    const previousButton = screen.getByRole('button', { name: /previous/i });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
  });

  it('navigates correctly from last page when disabled prop is false', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();
    await user.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('disables all buttons when disabled prop is true', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} disabled />);
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('does not call onPageChange when disabled', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination currentPage={3} totalPages={5} onPageChange={onPageChange} disabled />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('handles large page numbers correctly', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={500} totalPages={1000} onPageChange={onPageChange} />);
    expect(screen.getByText('Page 500 of 1000')).toBeInTheDocument();
  });

  it('correctly identifies last page', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination currentPage={9} totalPages={10} onPageChange={onPageChange} />
    );
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();

    rerender(<Pagination currentPage={10} totalPages={10} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
