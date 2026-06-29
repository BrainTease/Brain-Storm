// ─── Queue names ──────────────────────────────────────────────────────────────
export const QUEUE_EMAIL = 'email';
export const QUEUE_NOTIFICATION = 'notification';
export const QUEUE_CERTIFICATE = 'certificate';
export const QUEUE_INDEXING = 'indexing';
export const QUEUE_DLQ = 'dead-letter';

// ─── Job names ────────────────────────────────────────────────────────────────
export const JOB_SEND_EMAIL = 'send-email';
export const JOB_SEND_NOTIFICATION = 'send-notification';
export const JOB_CLEANUP_EXPIRED = 'cleanup-expired';
export const JOB_TTL_EXTENSION = 'ttl-extension';

// Certificate jobs
export const JOB_ISSUE_CERTIFICATE = 'issue-certificate';
export const JOB_MINT_CREDENTIAL = 'mint-credential';

// Indexing jobs
export const JOB_INDEX_COURSE = 'index-course';
export const JOB_INDEX_LESSON = 'index-lesson';
export const JOB_INDEX_POST = 'index-post';
export const JOB_DELETE_FROM_INDEX = 'delete-from-index';
