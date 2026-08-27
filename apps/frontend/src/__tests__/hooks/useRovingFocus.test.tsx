import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRovingFocus } from '@/hooks/useRovingFocus';

const COLUMNS = 3;
const ROW_HEIGHT = 100;

/** Minimal grid that lays items out in `COLUMNS` columns for rect measurement. */
function Grid({ count }: { count: number }) {
  const { onKeyDown, getItemProps } = useRovingFocus(count);
  return (
    <ul aria-label="Items" onKeyDown={onKeyDown}>
      {Array.from({ length: count }).map((_, i) => {
        const { ref, ...props } = getItemProps(i);
        return (
          <li key={i}>
            <a
              href={`#item-${i}`}
              data-testid={`item-${i}`}
              ref={(el) => {
                if (el) {
                  el.getBoundingClientRect = () =>
                    ({ top: Math.floor(i / COLUMNS) * ROW_HEIGHT }) as DOMRect;
                }
                ref?.(el);
              }}
              {...props}
            >
              Item {i}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function grid() {
  return screen.getByRole('list', { name: 'Items' });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('useRovingFocus', () => {
  it('puts only the active item in the tab sequence', () => {
    render(<Grid count={5} />);
    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('item-1')).toHaveAttribute('tabindex', '-1');
  });

  it('moves right and left with the arrow keys', () => {
    render(<Grid count={5} />);

    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(screen.getByTestId('item-1')).toHaveFocus();

    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(screen.getByTestId('item-0')).toHaveFocus();
  });

  it('moves a full row with ArrowDown and ArrowUp', () => {
    render(<Grid count={7} />);

    fireEvent.keyDown(grid(), { key: 'ArrowDown' });
    expect(screen.getByTestId(`item-${COLUMNS}`)).toHaveFocus();

    fireEvent.keyDown(grid(), { key: 'ArrowUp' });
    expect(screen.getByTestId('item-0')).toHaveFocus();
  });

  it('clamps at both ends instead of wrapping', () => {
    render(<Grid count={3} />);

    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(screen.getByTestId('item-0')).toHaveFocus();

    fireEvent.keyDown(grid(), { key: 'End' });
    fireEvent.keyDown(grid(), { key: 'ArrowRight' });
    expect(screen.getByTestId('item-2')).toHaveFocus();
  });

  it('jumps to the first and last item with Home and End', () => {
    render(<Grid count={6} />);

    fireEvent.keyDown(grid(), { key: 'End' });
    expect(screen.getByTestId('item-5')).toHaveFocus();

    fireEvent.keyDown(grid(), { key: 'Home' });
    expect(screen.getByTestId('item-0')).toHaveFocus();
  });

  it('ignores keys it does not handle', () => {
    render(<Grid count={3} />);
    fireEvent.keyDown(grid(), { key: 'a' });
    expect(screen.getByTestId('item-0')).toHaveAttribute('tabindex', '0');
  });

  it('follows focus moved by the pointer', () => {
    render(<Grid count={3} />);

    fireEvent.focus(screen.getByTestId('item-2'));
    expect(screen.getByTestId('item-2')).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(grid(), { key: 'ArrowLeft' });
    expect(screen.getByTestId('item-1')).toHaveFocus();
  });

  it('keeps the active index in range when the collection shrinks', () => {
    const { rerender } = render(<Grid count={6} />);
    fireEvent.keyDown(grid(), { key: 'End' });

    rerender(<Grid count={2} />);
    expect(screen.getByTestId('item-1')).toHaveAttribute('tabindex', '0');
  });

  it('does nothing when there are no items', () => {
    render(<Grid count={0} />);
    expect(() => fireEvent.keyDown(grid(), { key: 'ArrowRight' })).not.toThrow();
  });
});
