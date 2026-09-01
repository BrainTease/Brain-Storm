'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function BookmarksError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="bookmarks" {...props} />;
}
