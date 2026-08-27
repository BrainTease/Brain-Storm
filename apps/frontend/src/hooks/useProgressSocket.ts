'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';

export interface ProgressUpdate {
  courseId: string;
  progressPct: number;
}

/**
 * Subscribes to real-time `progress:<userId>` events.
 *
 * socket.io is imported lazily so it stays out of the initial dashboard bundle.
 */
export function useProgressSocket(
  userId: string | undefined,
  token: string | null,
  onUpdate: (update: ProgressUpdate) => void
) {
  useEffect(() => {
    if (!userId) return;

    let socket: Socket | undefined;
    let disposed = false;

    import('socket.io-client').then(({ io }) => {
      if (disposed) return;

      socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on(`progress:${userId}`, onUpdate);
    });

    return () => {
      disposed = true;
      socket?.disconnect();
    };
    // `onUpdate` is expected to be stable (a `useCallback`); re-subscribing on
    // every render would tear the socket down continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);
}
