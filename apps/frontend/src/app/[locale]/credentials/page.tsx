'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCertificateData, type CertificateRecord } from '@/hooks/useCertificateData';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { CertificateViewer } from '@/components/courses/CertificateViewer';

export default function CredentialsPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const { certificates: credentials, loading } = useCertificateData(user?.id);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">My Credentials</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Verifiable on-chain certificates earned by completing courses.
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" label="Loading credentials…" />
        </div>
      ) : credentials.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">
          No credentials yet. Complete a course to earn your first certificate!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {credentials.map((cred) => (
            <Card key={cred.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {cred.courseName}
                </h2>
                <Badge variant="success">Completed</Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Issued: {new Date(cred.issuedAt).toLocaleDateString()}
              </p>
              {cred.expiresAt && (
                <p
                  className={`text-sm ${new Date(cred.expiresAt) < new Date() ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  Expires: {new Date(cred.expiresAt).toLocaleDateString()}
                  {new Date(cred.expiresAt) < new Date() && ' · Expired'}
                </p>
              )}
              <p
                className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate"
                title={cred.txHash}
              >
                Tx: {cred.txHash}
              </p>
              <div className="flex gap-3 mt-auto pt-2 flex-wrap">
                <button
                  onClick={() => setSelectedCert({ ...cred, studentName: user?.name || 'Student' })}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  View Certificate
                </button>
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${cred.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  Verify ↗
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

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
