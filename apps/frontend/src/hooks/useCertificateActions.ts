'use client';

import { useState, type FormEvent } from 'react';

export interface Certificate {
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

/**
 * Encapsulates all certificate-viewer behaviour — PDF download, printing,
 * social sharing, link copying and email sharing — so any component that
 * renders a certificate can reuse it.
 */
export function useCertificateActions(certificate: Certificate) {
  const [downloading, setDownloading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);

  const certUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/credentials/${certificate.id}` : '';

  const isExpired = certificate.expiresAt ? new Date(certificate.expiresAt) < new Date() : false;

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

  const toggleEmailOpen = () => setEmailOpen((o) => !o);

  return {
    certUrl,
    isExpired,
    downloading,
    downloadPDF,
    handlePrint,
    shareLinkedIn,
    shareTwitter,
    shareFacebook,
    copyLink,
    copyFeedback,
    emailOpen,
    toggleEmailOpen,
    emailAddress,
    setEmailAddress,
    emailSending,
    emailFeedback,
    sendEmail,
  };
}
