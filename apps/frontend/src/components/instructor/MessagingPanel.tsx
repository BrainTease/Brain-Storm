'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Message {
  id: string;
  from: string;
  text: string;
  createdAt: string;
  isInstructor: boolean;
}

interface Thread {
  studentId: string;
  studentName: string;
  courseTitle: string;
  messages: Message[];
}

const MOCK: Thread[] = [
  {
    studentId: 's1',
    studentName: 'Alice Johnson',
    courseTitle: 'Intro to Stellar',
    messages: [
      { id: 'm1', from: 'Alice Johnson', text: 'Hi, I have a question about lesson 3.', createdAt: '2026-05-26T10:00:00Z', isInstructor: false },
      { id: 'm2', from: 'You', text: 'Sure, what would you like to know?', createdAt: '2026-05-26T10:05:00Z', isInstructor: true },
    ],
  },
  {
    studentId: 's2',
    studentName: 'Bob Smith',
    courseTitle: 'Intro to Stellar',
    messages: [
      { id: 'm3', from: 'Bob Smith', text: 'When will the next module be available?', createdAt: '2026-05-25T09:00:00Z', isInstructor: false },
    ],
  },
];

export function MessagingPanel() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/instructor/messages')
      .then((r) => setThreads(r.data ?? []))
      .catch(() => setThreads(MOCK))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, threads]);

  const activeThread = threads.find((t) => t.studentId === selected);

  async function send() {
    if (!text.trim() || !selected) return;
    setSending(true);
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      from: 'You',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isInstructor: true,
    };
    try {
      await api.post(`/instructor/messages/${selected}`, { text: text.trim() });
    } catch {
      // optimistic update even on error
    } finally {
      setThreads((prev) =>
        prev.map((t) =>
          t.studentId === selected ? { ...t, messages: [...t.messages, newMsg] } : t
        )
      );
      setText('');
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Messages</h2>
      <div className="flex gap-4 h-96 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Thread list */}
        <div className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : threads.length === 0 ? (
            <p className="p-3 text-xs text-gray-500 dark:text-gray-400">No messages yet.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.studentId}
                onClick={() => setSelected(t.studentId)}
                className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selected === t.studentId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <p className="font-medium truncate">{t.studentName}</p>
                <p className="text-xs text-gray-400 truncate">{t.courseTitle}</p>
              </button>
            ))
          )}
        </div>

        {/* Message pane */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {activeThread.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.isInstructor ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      m.isInstructor
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex gap-2">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button onClick={send} disabled={sending || !text.trim()} className="text-sm py-1.5 px-3">
                  Send
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
