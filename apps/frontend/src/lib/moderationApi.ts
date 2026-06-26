import api from './api';

export type ContentType = 'course' | 'post' | 'reply';
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'appealed';

export interface ModerationItem {
  id: string;
  contentType: ContentType;
  contentId: string;
  flagReason: string;
  status: ModerationStatus;
  createdAt: string;
}

export interface ModerationLog {
  id: string;
  action: string;
  note?: string;
  reviewedBy: string;
  createdAt: string;
}

export const getQueue = (filters: { status?: string; contentType?: string } = {}) =>
  api.get<ModerationItem[]>('/moderation/queue', { params: filters }).then((r) => r.data);

export const reviewItem = (id: string, status: string, note?: string) =>
  api.patch(`/moderation/${id}/review`, { status, note }).then((r) => r.data);

export const getItemLogs = (id: string) =>
  api.get<ModerationLog[]>(`/moderation/${id}/logs`).then((r) => r.data);

export const bulkReview = (ids: string[], status: string, note?: string) =>
  Promise.all(ids.map((id) => reviewItem(id, status, note)));
