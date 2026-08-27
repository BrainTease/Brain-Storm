'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function LeaderboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="leaderboard" {...props} />;
}
