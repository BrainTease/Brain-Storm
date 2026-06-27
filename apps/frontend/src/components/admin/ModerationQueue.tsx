'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  getQueue,
  reviewItem,
  getItemLogs,
  bulkReview,
  type ModerationItem,
  type ModerationLog,
  type ContentType,
  type ModerationStatus,
} from '@/lib/moderationApi';

const STATUS_COLORS: Record<ModerationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  appealed: 'bg-orange-100 text-orange-800',
};

const CONTENT_TYPES: ContentType[] = ['course', 'post', 'reply'];
const STATUSES: ModerationStatus[] = ['pending', 'approved', 'rejected', 'appealed'];

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [filters, setFilters] = useState<{ status: string; contentType: string }>({ status: '', contentType: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<Record<string, ModerationLog[]>>({});
  const [openLogs, setOpenLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQueue({ status: filters.status || undefined, contentType: filters.contentType || undefined });
      setItems(data);
      setSelected(new Set());
    } catch {
      setError('Failed to load moderation queue.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleReview = async (id: string, status: string) => {
    await reviewItem(id, status);
    fetchQueue();
  };

  const handleBulk = async (status: string) => {
    await bulkReview(Array.from(selected), status);
    fetchQueue();
  };

  const toggleLog = async (id: string) => {
    const next = new Set(openLogs);
    if (next.has(id)) { next.delete(id); setOpenLogs(next); return; }
    if (!logs[id]) {
      const data = await getItemLogs(id);
      setLogs((prev) => ({ ...prev, [id]: data }));
    }
    next.add(id);
    setOpenLogs(next);
  };

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <section aria-label="Content Moderation Queue">
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          aria-label="Filter by status"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          aria-label="Filter by content type"
          value={filters.contentType}
          onChange={(e) => setFilters((f) => ({ ...f, contentType: e.target.value }))}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded" role="toolbar" aria-label="Bulk actions">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={() => handleBulk('approved')} className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">Bulk Approve</button>
          <button onClick={() => handleBulk('rejected')} className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">Bulk Reject</button>
        </div>
      )}

      {loading && <p role="status">Loading moderation queue…</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div role="list" aria-label="Moderation items">
          {/* Header row with select-all */}
          {items.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-2">
              <input
                type="checkbox"
                aria-label="Select all items"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span className="text-sm text-gray-500">{items.length} items</span>
            </div>
          )}

          {items.length === 0 && <p className="text-gray-500 text-sm">No items in queue.</p>}

          {items.map((item) => (
            <div key={item.id} role="listitem" className="border rounded mb-3 p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  aria-label={`Select item ${item.id}`}
                  checked={selected.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded font-medium uppercase">{item.contentType}</span>
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${STATUS_COLORS[item.status]}`}>{item.status}</span>
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">ID: {item.contentId}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{item.flagReason}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    aria-label={`Approve item ${item.id}`}
                    onClick={() => handleReview(item.id, 'approved')}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >Approve</button>
                  <button
                    aria-label={`Reject item ${item.id}`}
                    onClick={() => handleReview(item.id, 'rejected')}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                  >Reject</button>
                  <button
                    aria-label={`${openLogs.has(item.id) ? 'Hide' : 'View'} logs for item ${item.id}`}
                    onClick={() => toggleLog(item.id)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200"
                  >View Logs</button>
                </div>
              </div>

              {/* Inline audit trail */}
              {openLogs.has(item.id) && (
                <div className="mt-3 pl-8 border-t pt-3" aria-label={`Audit logs for item ${item.id}`}>
                  {!logs[item.id] && <p className="text-xs text-gray-500">Loading logs…</p>}
                  {logs[item.id]?.length === 0 && <p className="text-xs text-gray-500">No logs found.</p>}
                  {logs[item.id]?.map((log) => (
                    <div key={log.id} className="text-xs text-gray-600 mb-1">
                      <span className="font-medium">{log.action}</span>
                      {log.note && <span> — {log.note}</span>}
                      <span className="text-gray-400 ml-2">by {log.reviewedBy} · {new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
