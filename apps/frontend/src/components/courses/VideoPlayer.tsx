'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { useVideoShortcuts } from '@/hooks/useVideoShortcuts';

export interface VideoPlayerProps {
  src: string;
  courseId: string;
  lessonId: string;
  /** Initial resume position in seconds */
  initialTime?: number;
  onComplete?: () => void;
}

const SYNC_INTERVAL_MS = 10_000; // sync progress every 10 s
const COMPLETION_THRESHOLD = 0.9; // 90% watched = complete

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoPlayer({ src, courseId, lessonId, initialTime = 0, onComplete }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);
  const lastSyncedRef = useRef(0);

  useVideoShortcuts(videoRef);

  // Resume from saved position
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !initialTime) return;
    const onLoaded = () => { v.currentTime = initialTime; };
    v.addEventListener('loadedmetadata', onLoaded);
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, [initialTime]);

  const syncProgress = useCallback(
    async (time: number, pct: number) => {
      try {
        await api.post(`/courses/${courseId}/lessons/${lessonId}/progress`, {
          watchedSeconds: Math.floor(time),
          completionPct: Math.round(pct * 100),
        });
        lastSyncedRef.current = time;
      } catch { /* non-blocking */ }
    },
    [courseId, lessonId]
  );

  // Periodic sync
  useEffect(() => {
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || !duration) return;
      const pct = v.currentTime / duration;
      syncProgress(v.currentTime, pct);
    }, SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [duration, syncProgress]);

  // Sync on unmount
  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (!v || !duration) return;
      syncProgress(v.currentTime, v.currentTime / duration);
    };
  }, [duration, syncProgress]);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (!completedRef.current && duration > 0 && v.currentTime / duration >= COMPLETION_THRESHOLD) {
      completedRef.current = true;
      setCompleted(true);
      syncProgress(v.currentTime, 1);
      onComplete?.();
    }
  }

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (v) setDuration(v.duration);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(v.currentTime);
  }

  function handleSpeed(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = videoRef.current;
    const val = Number(e.target.value);
    if (v) v.playbackRate = val;
    setSpeed(val);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    const val = Number(e.target.value);
    if (v) v.volume = val;
    setVolume(val);
  }

  function skip(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + seconds));
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative w-full bg-black rounded-xl overflow-hidden group"
      role="region"
      aria-label="Video player"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        aria-label="Course video"
        playsInline
      />

      {/* Completion banner */}
      {completed && (
        <div
          role="status"
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg"
        >
          🎉 Lesson complete!
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-6 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white text-xs tabular-nums">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 accent-blue-500 cursor-pointer"
            aria-label="Seek video"
          />
          <span className="text-white text-xs tabular-nums">{formatTime(duration)}</span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-3">
          {/* Skip back */}
          <button
            onClick={() => skip(-10)}
            className="text-white hover:text-blue-400 transition-colors"
            aria-label="Rewind 10 seconds"
            title="Rewind 10s (←)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              <text x="8" y="15" fontSize="6" fill="currentColor">10</text>
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:text-blue-400 transition-colors"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Skip forward */}
          <button
            onClick={() => skip(10)}
            className="text-white hover:text-blue-400 transition-colors"
            aria-label="Skip forward 10 seconds"
            title="Skip 10s (→)"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              <text x="8" y="15" fontSize="6" fill="currentColor">10</text>
            </svg>
          </button>

          {/* Volume */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={handleVolume}
            className="w-20 h-1 accent-blue-500 cursor-pointer"
            aria-label="Volume"
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Progress % */}
          <span className="text-white text-xs tabular-nums">{Math.round(progress)}%</span>

          {/* Speed */}
          <select
            value={speed}
            onChange={handleSpeed}
            className="bg-transparent text-white text-xs border border-white/30 rounded px-1 py-0.5 cursor-pointer"
            aria-label="Playback speed"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <option key={s} value={s} className="bg-gray-900">
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
