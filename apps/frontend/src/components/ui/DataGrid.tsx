'use client';

import React, { memo, useState, useMemo, useCallback } from 'react';

export interface ColumnDef<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

type SortDirection = 'asc' | 'desc' | 'none';

interface SortState {
  key: string;
  direction: SortDirection;
}

interface DataGridProps<T extends object> {
  columns: ColumnDef<T>[];
  rows: T[];
  pageSize?: number;
  emptyText?: string;
  isLoading?: boolean;
  'aria-label'?: string;
  getRowKey?: (row: T, index: number) => string | number;
}

function getSortIcon(direction: SortDirection): string {
  if (direction === 'asc') return '▲';
  if (direction === 'desc') return '▼';
  return '⇅';
}

function nextDirection(current: SortDirection): SortDirection {
  if (current === 'none') return 'asc';
  if (current === 'asc') return 'desc';
  return 'none';
}

function getNestedValue<T extends object>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function compareValues(a: unknown, b: unknown): number {
  if (a === undefined || a === null) return 1;
  if (b === undefined || b === null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function DataGridInner<T extends object>({
  columns,
  rows,
  pageSize = 10,
  emptyText = 'No data available.',
  isLoading = false,
  'aria-label': ariaLabel,
  getRowKey,
}: DataGridProps<T>) {
  const [sort, setSort] = useState<SortState>({ key: '', direction: 'none' });
  const [page, setPage] = useState(0);

  const handleSort = useCallback(
    (key: string) => {
      setSort((prev) => {
        const direction = prev.key === key ? nextDirection(prev.direction) : 'asc';
        return { key, direction };
      });
      setPage(0);
    },
    [],
  );

  const sortedRows = useMemo(() => {
    if (sort.direction === 'none' || !sort.key) return rows;
    return [...rows].sort((a, b) => {
      const aVal = getNestedValue(a, sort.key);
      const bVal = getNestedValue(b, sort.key);
      const cmp = compareValues(aVal, bVal);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pagedRows = useMemo(
    () => sortedRows.slice(clampedPage * pageSize, (clampedPage + 1) * pageSize),
    [sortedRows, clampedPage, pageSize],
  );

  const skeletonRows = Array.from({ length: Math.min(pageSize, 5) });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <table
        role="grid"
        aria-label={ariaLabel}
        className="min-w-full border-collapse text-sm"
      >
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <tr>
            {columns.map((col) => {
              const colKey = String(col.key);
              const isSorted = sort.key === colKey && sort.direction !== 'none';
              const ariaSort: React.AriaAttributes['aria-sort'] =
                sort.key === colKey
                  ? sort.direction === 'asc'
                    ? 'ascending'
                    : sort.direction === 'desc'
                    ? 'descending'
                    : 'none'
                  : 'none';

              return (
                <th
                  key={colKey}
                  role="columnheader"
                  scope="col"
                  aria-sort={col.sortable ? ariaSort : undefined}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 select-none ${
                    col.sortable
                      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                      : ''
                  } ${isSorted ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={col.sortable ? () => handleSort(colKey) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <span
                        aria-hidden="true"
                        className={`text-xs ${isSorted ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}
                      >
                        {sort.key === colKey ? getSortIcon(sort.direction) : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {isLoading ? (
            skeletonRows.map((_, i) => (
              <tr key={`skeleton-${i}`} aria-hidden="true">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3">
                    <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : pagedRows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            pagedRows.map((row, rowIndex) => {
              const key = getRowKey ? getRowKey(row, rowIndex + clampedPage * pageSize) : rowIndex;
              return (
                <tr
                  key={key}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {columns.map((col) => {
                    const colKey = String(col.key);
                    const value = col.render
                      ? col.render(row)
                      : String(getNestedValue(row, colKey) ?? '');
                    return (
                      <td
                        key={colKey}
                        className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap"
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination footer */}
      {!isLoading && rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rows.length === 0
              ? '0 results'
              : `Showing ${clampedPage * pageSize + 1}–${Math.min((clampedPage + 1) * pageSize, rows.length)} of ${rows.length}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={clampedPage === 0}
              aria-label="Previous page"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Page {clampedPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={clampedPage >= totalPages - 1}
              aria-label="Next page"
              className="px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DataGrid = memo(DataGridInner) as typeof DataGridInner;
