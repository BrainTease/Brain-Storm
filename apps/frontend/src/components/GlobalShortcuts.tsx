'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ShortcutsHelpModal } from '@/components/ShortcutsHelpModal';
import { CommandPalette } from '@/components/CommandPalette';

export function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder*="earch"]');
    if (input) { input.focus(); input.select(); }
  }, []);

  // Listen for custom event from CommandPalette to open help
  useEffect(() => {
    const handler = () => setHelpOpen(true);
    document.addEventListener('open-shortcuts-help', handler);
    return () => document.removeEventListener('open-shortcuts-help', handler);
  }, []);

  const shortcuts = useMemo(() => [
    {
      key: '/',
      skipOnInput: true,
      handler: (e: KeyboardEvent) => { e.preventDefault(); focusSearch(); },
    },
    {
      key: 'k',
      ctrl: true,
      skipOnInput: false,
      handler: (e: KeyboardEvent) => { e.preventDefault(); setPaletteOpen(true); },
    },
    {
      key: '?',
      skipOnInput: true,
      handler: (e: KeyboardEvent) => { e.preventDefault(); setHelpOpen((o) => !o); },
    },
    {
      key: 'Escape',
      skipOnInput: false,
      handler: () => {
        // Modals listen for Escape themselves; this is a fallback to navigate back
        // if no modal is open. We close modals here.
        setHelpOpen(false);
        setPaletteOpen(false);
      },
    },
  ], [focusSearch]);

  useKeyboardShortcuts(shortcuts);

  return (
    <>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {helpOpen ? <ShortcutsHelpModal onClose={() => setHelpOpen(false)} /> : null}
    </>
  );
}
