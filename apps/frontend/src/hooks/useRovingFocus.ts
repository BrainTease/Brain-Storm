'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

/**
 * Arrow-key navigation for a two-dimensional collection of cards.
 *
 * Implements the roving-tabindex pattern: only the active item is in the tab
 * sequence, so Tab moves past the whole collection while Arrow keys move
 * between items. The column count is measured from the DOM on each keypress
 * because responsive grids reflow between breakpoints.
 */
export function useRovingFocus(itemCount: number) {
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Keep the active index inside the collection when results shrink.
  useEffect(() => {
    setActiveIndex((current) => (current > itemCount - 1 ? Math.max(itemCount - 1, 0) : current));
  }, [itemCount]);

  const focusItem = useCallback(
    (index: number) => {
      if (itemCount === 0) return;
      const clamped = Math.max(0, Math.min(index, itemCount - 1));
      setActiveIndex(clamped);
      itemRefs.current[clamped]?.focus();
    },
    [itemCount]
  );

  /** Items sharing the first item's top offset form the first row. */
  const measureColumns = useCallback(() => {
    const items = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (items.length < 2) return 1;
    const firstTop = items[0].getBoundingClientRect().top;
    const wrapIndex = items.findIndex(
      (el, i) => i > 0 && el.getBoundingClientRect().top > firstTop
    );
    return wrapIndex === -1 ? items.length : wrapIndex;
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const handlers: Record<string, () => void> = {
        ArrowRight: () => focusItem(activeIndex + 1),
        ArrowLeft: () => focusItem(activeIndex - 1),
        ArrowDown: () => focusItem(activeIndex + measureColumns()),
        ArrowUp: () => focusItem(activeIndex - measureColumns()),
        Home: () => focusItem(0),
        End: () => focusItem(itemCount - 1),
      };

      const handler = handlers[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    },
    [activeIndex, focusItem, itemCount, measureColumns]
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex]
  );

  return { activeIndex, onKeyDown, getItemProps, focusItem };
}
