import type { CredentialRecord } from '@/lib/dashboard';
import { SkeletonBlock } from './SkeletonBlock';

interface CredentialGridProps {
  credentials: CredentialRecord[];
  isLoading?: boolean;
}

/** Earned badges and certificates as a responsive card grid. */
export function CredentialGrid({ credentials, isLoading = false }: CredentialGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        Complete a course to earn your first certificate.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {credentials.map((credential) => (
        <li
          key={credential.id}
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3"
        >
          <span className="text-2xl" aria-hidden="true">
            🎓
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {credential.course?.title ?? `Course ${credential.courseId}`}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(credential.issuedAt).toLocaleDateString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
