'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { NFTGrid, type NFTItem } from '@/components/nft';
import { CertificateViewer } from '@/components/courses/CertificateViewer';

interface Credential {
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

export default function CredentialsPage() {
  const t = useTranslations('credentials');
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Credential | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    api
      .get<Credential[]>(`/credentials/${user!.id}`)
      .then((r) => setCredentials(r.data))
      .finally(() => setLoading(false));
  }, [isAuthenticated, user, router]);

  const nftItems: NFTItem[] = useMemo(
    () =>
      credentials.map((cred) => ({
        id: cred.id,
        title: cred.courseName,
        courseName: cred.courseName,
        description: cred.description ?? t('defaultDescription'),
        issuedAt: cred.issuedAt,
        txHash: cred.txHash,
        isCompleted: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        owner: (user as any)?.name || user?.username,
      })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [credentials, user, t]
  );

  if (!isAuthenticated) return null;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <NFTGrid
        items={nftItems}
        isLoading={loading}
        columns={3}
        emptyTitle={t('emptyNftTitle')}
        emptyDescription={t('emptyNft')}
        onView={(item) => {
          const matched = credentials.find((c) => c.id === item.id);
          if (matched) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSelectedCert({ ...matched, studentName: (user as any)?.name || t('defaultStudentName') });
          }
        }}
      />

      {selectedCert && (
        <CertificateViewer
          certificate={{
            ...selectedCert,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            studentName: selectedCert.studentName || (user as any)?.name || t('defaultStudentName'),
          }}
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </main>
  );
}
