'use client';

import { Modal } from '@/components/ui/Modal';

interface ShortcutsHelpModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Cmd/Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['/'], description: 'Focus search' },
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Esc'], description: 'Close modal / dialog' },
  { keys: ['Space'], description: 'Play / Pause video' },
  { keys: ['←'], description: 'Seek video back 10s' },
  { keys: ['→'], description: 'Seek video forward 10s' },
];

export function ShortcutsHelpModal({ onClose }: ShortcutsHelpModalProps) {
  return (
    <Modal isOpen onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <ul className="space-y-2">
        {SHORTCUTS.map(({ keys, description }) => (
          <li key={description} className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{description}</span>
            <span className="flex gap-1">
              {keys.map((k) => (
                <kbd key={k} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
