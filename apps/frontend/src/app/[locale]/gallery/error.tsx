'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function GalleryError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="gallery" {...props} />;
}
