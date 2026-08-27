'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface CertificateRecord {
  id: string;
  courseId: string;
  courseName: string;
  issuedAt: string;
  expiresAt?: string;
  txHash: string;
  studentName?: string;
  instructorName?: string;
  description?: string;
}

/** Fetches a user's earned certificates, isolated from how they're rendered. */
export function useCertificateData(userId: string | undefined) {
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<CertificateRecord[]>(`/credentials/${userId}`)
      .then((r) => {
        if (!cancelled) setCertificates(r.data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load credentials');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { certificates, loading, error };
}
