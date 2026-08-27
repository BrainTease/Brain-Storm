import type { CredentialRecord } from '@/lib/dashboard';
import { formatDateShort } from '@/lib/date-utils';
import { SkeletonBlock } from './SkeletonBlock';

interface RecentCredentialListProps {
  credentials: CredentialRecord[];
  isLoading?: boolean;
}

/** Compact "title — date" list of the most recent credentials. */
export function RecentCredentialList({
  credentials,
  isLoading = false,
}: RecentCredentialListProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-6 w-full" />
        ))}
      </>
    );
  }

  if (credentials.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400">You have not earned any credentials yet.</p>
    );
  }

  return (
    <>
      {credentials.map((credential) => (
        <div
          key={credential.id}
          className="flex justify-between items-center text-sm text-gray-700 dark:text-gray-300"
        >
          <span>{credential.course?.title ?? `Course ${credential.courseId}`}</span>
          <span>{formatDateShort(credential.issuedAt)}</span>
        </div>
      ))}
    </>
  );
}
