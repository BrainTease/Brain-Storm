import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid, type ColumnDef } from '@/components/ui/DataGrid';

interface Row {
  id: number;
  name: string;
  score: number;
}

const COLUMNS: ColumnDef<Row>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'score', header: 'Score', sortable: true },
];

const ROWS: Row[] = [
  { id: 1, name: 'Alice', score: 90 },
  { id: 2, name: 'Bob', score: 70 },
  { id: 3, name: 'Charlie', score: 80 },
];

describe('DataGrid', () => {
  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders all rows and column headers', () => {
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('renders empty state when rows is empty', () => {
    render(<DataGrid columns={COLUMNS} rows={[]} emptyText="Nothing here." />);
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('renders default empty text when not provided and rows is empty', () => {
    render(<DataGrid columns={COLUMNS} rows={[]} />);
    expect(screen.getByText('No data available.')).toBeInTheDocument();
  });

  it('renders skeleton rows when isLoading=true and hides real data', () => {
    render(<DataGrid columns={COLUMNS} rows={ROWS} isLoading getRowKey={(r) => r.id} />);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    // skeleton rows should have aria-hidden animate-pulse elements
    const skeletons = document.querySelectorAll('[aria-hidden="true"] td div.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has role="grid" on the table', () => {
    render(<DataGrid columns={COLUMNS} rows={ROWS} aria-label="Test grid" />);
    expect(screen.getByRole('grid', { name: 'Test grid' })).toBeInTheDocument();
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────

  it('sorts rows ascending on first click of a sortable column', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    await user.click(screen.getByText('Name'));

    const cells = screen.getAllByRole('gridcell');
    const nameCells = cells.filter((_, i) => i % 3 === 1); // Name is 2nd column (index 1)
    expect(nameCells[0]).toHaveTextContent('Alice');
    expect(nameCells[1]).toHaveTextContent('Bob');
    expect(nameCells[2]).toHaveTextContent('Charlie');
  });

  it('sorts rows descending on second click', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    await user.click(nameHeader);
    await user.click(nameHeader);

    const cells = screen.getAllByRole('gridcell');
    const nameCells = cells.filter((_, i) => i % 3 === 1);
    expect(nameCells[0]).toHaveTextContent('Charlie');
    expect(nameCells[1]).toHaveTextContent('Bob');
    expect(nameCells[2]).toHaveTextContent('Alice');
  });

  it('clears sort on third click and restores original order', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    await user.click(nameHeader); // asc
    await user.click(nameHeader); // desc
    await user.click(nameHeader); // none → original order

    const cells = screen.getAllByRole('gridcell');
    const nameCells = cells.filter((_, i) => i % 3 === 1);
    expect(nameCells[0]).toHaveTextContent('Alice');
    expect(nameCells[1]).toHaveTextContent('Bob');
    expect(nameCells[2]).toHaveTextContent('Charlie');
  });

  it('sets aria-sort="ascending" after first click', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    await user.click(nameHeader);

    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sets aria-sort="descending" after second click', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    await user.click(nameHeader);
    await user.click(nameHeader);

    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  });

  it('sets aria-sort="none" after third click (sort cleared)', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const nameHeader = screen.getByRole('columnheader', { name: /Name/i });
    await user.click(nameHeader);
    await user.click(nameHeader);
    await user.click(nameHeader);

    expect(nameHeader).toHaveAttribute('aria-sort', 'none');
  });

  it('sorts numeric column correctly', async () => {
    const user = userEvent.setup();
    render(<DataGrid columns={COLUMNS} rows={ROWS} getRowKey={(r) => r.id} />);

    const scoreHeader = screen.getByRole('columnheader', { name: /Score/i });
    await user.click(scoreHeader); // asc: 70, 80, 90

    const cells = screen.getAllByRole('gridcell');
    const scoreCells = cells.filter((_, i) => i % 3 === 2); // Score is 3rd column
    expect(scoreCells[0]).toHaveTextContent('70');
    expect(scoreCells[1]).toHaveTextContent('80');
    expect(scoreCells[2]).toHaveTextContent('90');
  });

  it('non-sortable column header does not have aria-sort', () => {
    const colsWithUnsortable: ColumnDef<Row>[] = [
      { key: 'id', header: 'ID', sortable: false },
      { key: 'name', header: 'Name', sortable: true },
    ];
    render(<DataGrid columns={colsWithUnsortable} rows={ROWS} />);
    const idHeader = screen.getByRole('columnheader', { name: /^ID$/i });
    expect(idHeader).not.toHaveAttribute('aria-sort');
  });

  // ─── Pagination ────────────────────────────────────────────────────────────

  it('shows only pageSize rows per page', () => {
    const manyRows: Row[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i * 4,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    // Should show rows 1-5
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 5')).toBeInTheDocument();
    expect(screen.queryByText('User 6')).not.toBeInTheDocument();
  });

  it('navigates to the next page', async () => {
    const user = userEvent.setup();
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(screen.queryByText('User 1')).not.toBeInTheDocument();
    expect(screen.getByText('User 6')).toBeInTheDocument();
    expect(screen.getByText('User 10')).toBeInTheDocument();
  });

  it('navigates back to the previous page', async () => {
    const user = userEvent.setup();
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    await user.click(screen.getByRole('button', { name: /previous page/i }));

    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.queryByText('User 6')).not.toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('disables Next button on last page', async () => {
    const user = userEvent.setup();
    const manyRows: Row[] = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));

    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('shows correct page indicator text', async () => {
    const user = userEvent.setup();
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('shows row range in footer', () => {
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);
    expect(screen.getByText('Showing 1–5 of 15')).toBeInTheDocument();
  });

  it('resets to page 1 when sort changes', async () => {
    const user = userEvent.setup();
    const manyRows: Row[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      name: `User ${String.fromCharCode(90 - i)}`,
      score: i,
    }));
    render(<DataGrid columns={COLUMNS} rows={manyRows} pageSize={5} getRowKey={(r) => r.id} />);

    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('columnheader', { name: /Name/i }));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });
});
