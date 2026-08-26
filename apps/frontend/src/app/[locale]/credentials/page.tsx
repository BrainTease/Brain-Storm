'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
        description: cred.description ?? 'Official on-chain verified course certificate.',
        issuedAt: cred.issuedAt,
        txHash: cred.txHash,
        isCompleted: true,
        owner: user?.name || user?.username,
      })),
    [credentials, user]
  );

  if (!isAuthenticated) return null;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">My Credentials & NFTs</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Verifiable on-chain certificates and NFT credentials earned by completing courses.
        </p>
      </div>

      <NFTGrid
        items={nftItems}
        isLoading={loading}
        columns={3}
        emptyTitle="No credentials yet"
        emptyDescription="Complete a course to earn your first verifiable on-chain NFT certificate!"
        onView={(item) => {
          const matched = credentials.find((c) => c.id === item.id);
          if (matched) {
            setSelectedCert({ ...matched, studentName: user?.name || 'Student' });
          }
        }}
      />

      {selectedCert && (
        <CertificateViewer
          certificate={{
            ...selectedCert,
            studentName: selectedCert.studentName || user?.name || 'Student',
          }}
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
        />
      )}
    </main>
  );
}
