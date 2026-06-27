'use client';

import { useState, useRef, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  studentName: string;
  issuedAt: string;
  expiresAt?: string;
  txHash: string;
  instructorName?: string;
  description?: string;
}

interface CertificateViewerProps {
  certificate: Certificate;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateViewer({ certificate, isOpen, onClose }: CertificateViewerProps) {
  const [downloading, setDownloading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const certRef = useRef<HTMLDivElement>(null);

  const certUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/credentials/${certificate.id}`
      : '';

  const isExpired =
    certificate.expiresAt ? new Date(certificate.expiresAt) < new Date() : false;

  /* ── Download PDF ── */
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const response = await fetch(`/api/certificates/${certificate.id}/pdf`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificate.courseName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  /* ── Print ── */
  const handlePrint = () => window.print();

  /* ── Share: LinkedIn ── */
  const shareLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  /* ── Share: X / Twitter ── */
  const shareTwitter = () => {
    const text = `I just earned a certificate for "${certificate.courseName}"! 🎓 #BrainStorm #Blockchain`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(certUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=600');
  };

  /* ── Share: Facebook ── */
  const shareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(certUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=600');
  };

  /* ── Copy link ── */
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(certUrl);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      console.error('Failed to copy link');
    }
  };

  /* ── Send via email ── */
  const sendEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim()) return;
    setEmailSending(true);
    setEmailFeedback(null);
    try {
      const res = await fetch(`/api/certificates/${certificate.id}/share-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress, certUrl }),
      });
      setEmailFeedback(res.ok ? 'Email sent successfully!' : 'Failed to send email. Try again.');
    } catch {
      setEmailFeedback('Failed to send email. Try again.');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Certificate of Completion">
      <div className="space-y-6 max-h-[80vh] overflow-y-auto">

        {/* ── Certificate Template ── */}
        <div
          ref={certRef}
          className="print:shadow-none relative overflow-hidden rounded-xl border-4 border-blue-600 dark:border-blue-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 p-8 text-center"
        >
          {/* Decorative corner accents */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-md" aria-hidden="true" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-md" aria-hidden="true" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-md" aria-hidden="true" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-md" aria-hidden="true" />

          {/* Logo / seal */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg" aria-hidden="true">
              <span className="text-white text-2xl font-bold">BS</span>
            </div>
          </div>

          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-blue-500 dark:text-blue-400 mb-1">
            Brain-Storm Learning Platform
          </p>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4">
            Certificate of Completion
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">This certifies that</p>
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mb-4">
            {certificate.studentName}
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            has successfully completed
          </p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {certificate.courseName}
          </p>

          {certificate.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-4 max-w-xs mx-auto">
              {certificate.description}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-300 mt-4 mb-4">
            <span>
              <span className="font-medium">Issued:</span>{' '}
              {new Date(certificate.issuedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {certificate.expiresAt && (
              <span>
                <span className="font-medium">Expires:</span>{' '}
                <span className={isExpired ? 'text-red-500' : ''}>
                  {new Date(certificate.expiresAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </span>
            )}
            {certificate.instructorName && (
              <span>
                <span className="font-medium">Instructor:</span> {certificate.instructorName}
              </span>
            )}
          </div>

          {isExpired && (
            <div className="mb-3">
              <Badge variant="error">Expired</Badge>
            </div>
          )}

          {/* Blockchain verification */}
          <div className="pt-4 border-t border-blue-200 dark:border-blue-800 mt-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono break-all">
              🔗 Blockchain Verified · Tx: {certificate.txHash}
            </p>
          </div>
        </div>

        {/* ── Metadata summary ── */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Certificate Details
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-300">
            <span className="text-gray-400 dark:text-gray-500">Issue Date</span>
            <span>{new Date(certificate.issuedAt).toLocaleDateString()}</span>
            {certificate.expiresAt && (
              <>
                <span className="text-gray-400 dark:text-gray-500">Expiry Date</span>
                <span className={isExpired ? 'text-red-500 font-medium' : ''}>
                  {new Date(certificate.expiresAt).toLocaleDateString()}
                  {isExpired && ' (Expired)'}
                </span>
              </>
            )}
            <span className="text-gray-400 dark:text-gray-500">Course</span>
            <span>{certificate.courseName}</span>
            <span className="text-gray-400 dark:text-gray-500">Recipient</span>
            <span>{certificate.studentName}</span>
            <span className="text-gray-400 dark:text-gray-500">Certificate ID</span>
            <span className="font-mono text-xs break-all">{certificate.id}</span>
          </div>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${certificate.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs mt-1"
          >
            View on Stellar Blockchain ↗
          </a>
        </div>

        {/* ── Actions: Download & Print ── */}
        <div className="print:hidden space-y-3">
          <div className="flex gap-2">
            <Button onClick={downloadPDF} disabled={downloading} className="flex-1">
              {downloading ? 'Downloading…' : '📥 Download PDF'}
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              🖨️ Print
            </Button>
          </div>

          {/* ── Share ── */}
          <div className="border-t pt-3 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Share certificate:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shareLinkedIn} variant="outline" className="text-sm">
                🔵 LinkedIn
              </Button>
              <Button onClick={shareTwitter} variant="outline" className="text-sm">
                🐦 X / Twitter
              </Button>
              <Button onClick={shareFacebook} variant="outline" className="text-sm">
                📘 Facebook
              </Button>
              <Button onClick={copyLink} variant="outline" className="text-sm">
                {copyFeedback ? '✅ Copied!' : '🔗 Copy Link'}
              </Button>
            </div>

            {/* Email share */}
            <button
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
              onClick={() => setEmailOpen((o) => !o)}
              type="button"
            >
              ✉️ Share via Email {emailOpen ? '▲' : '▼'}
            </button>
            {emailOpen && (
              <form onSubmit={sendEmail} className="flex gap-2 mt-1">
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" disabled={emailSending} className="text-sm py-1.5">
                  {emailSending ? 'Sending…' : 'Send'}
                </Button>
              </form>
            )}
            {emailFeedback && (
              <p
                className={`text-xs mt-1 ${emailFeedback.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {emailFeedback}
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
