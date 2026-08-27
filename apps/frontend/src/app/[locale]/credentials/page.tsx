'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { useCertificateData, type CertificateRecord } from '@/hooks/useCertificateData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import api from '@/lib/api';
import { NFTGrid, type NFTItem } from '@/components/nft';
import { CertificateViewer } from '@/components/courses/CertificateViewer';

export default function CredentialsPage() {
  const t = useTranslations('credentials');
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { certificates: credentials, loading } = useCertificateData(user?.id);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

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
