import { SkeletonBlock } from './SkeletonBlock';

interface DashboardHeaderProps {
  username?: string;
  email?: string;
  isLoading?: boolean;
  /** Appended to the greeting, e.g. a waving-hand emoji. */
  suffix?: string;
  /** Renders the email under the greeting. */
  showEmail?: boolean;
}

/** Greeting block at the top of a dashboard. */
export function DashboardHeader({
  username,
  email,
  isLoading = false,
  suffix,
  showEmail = false,
}: DashboardHeaderProps) {
  // The identity usually comes straight from the auth context, so only fall back
  // to a skeleton while there is genuinely nothing to greet the learner with.
  if (isLoading && !username && !email) {
    return (
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-56" />
        {showEmail && <SkeletonBlock className="h-5 w-64" />}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        Welcome back, {username ?? email ?? 'Student'}
        {suffix ? ` ${suffix}` : ''}
      </h1>
      {showEmail && email && <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>}
    </div>
  );
}
