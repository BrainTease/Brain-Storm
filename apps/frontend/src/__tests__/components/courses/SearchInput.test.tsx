import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchInput } from '@/components/courses/SearchInput';

describe('SearchInput', () => {
  it('renders a labelled search input with the default placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    const input = screen.getByRole('searchbox', { name: 'Search courses' });
    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveAttribute('placeholder', 'Search courses…');
  });

  it('uses the shared control styling', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    const input = screen.getByRole('searchbox');
    expect(input).toHaveClass('border', 'rounded-lg', 'pl-10');
  });

  it('links the screen-reader hint to the input', () => {
    render(<SearchInput value="" onChange={vi.fn()} id="catalog-search" />);

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('id', 'catalog-search');
    expect(input).toHaveAttribute('aria-describedby', 'catalog-search-hint');
    expect(document.getElementById('catalog-search-hint')).toHaveTextContent(
      'Results update automatically as you type.'
    );
  });

  it('reports the typed value through onChange', () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'solana' } });

    expect(onChange).toHaveBeenCalledWith('solana');
  });
});
