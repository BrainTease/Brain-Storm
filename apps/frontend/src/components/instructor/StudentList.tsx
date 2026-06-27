'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface StudentProgress {
  studentId: string;
  studentName: string;
  courseTitle: string;
  progressPct: number;
  lastActive?: string;
}

const MOCK: StudentProgress[] = [
  { studentId: 's1', studentName: 'Alice Johnson', courseTitle: 'Intro to Stellar', progressPct: 90, lastActive: '2026-05-26' },
  { studentId: 's2', studentName: 'Bob Smith', courseTitle: 'Intro to Stellar', progressPct: 45, lastActive: '2026-05-25' },
  { studentId: 's3', studentName: 'Carol White', courseTitle: 'Soroban Smart Contracts', progressPct: 60, lastActive: '2026-05-24' },
  { studentId: 's4', studentName: 'David Lee', courseTitle: 'DeFi on Stellar', progressPct: 20, lastActive: '2026-05-23' },
];

export function StudentList() {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/instructor/students/progress')
      .then((r) => setStudents(r.data ?? []))
      .catch(() => setStudents(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(
    (s) =>
      s.studentName.toLowerCase().includes(search.toLowerCase()) ||
      s.courseTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Students</h2>
        <input
          type="search"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No students found.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div
              key={`${s.studentId}-${s.courseTitle}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 flex items-center gap-4"
            >
              <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-semibold text-sm shrink-0">
                {s.studentName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.studentName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.courseTitle}</p>
              </div>
              <div className="flex items-center gap-2 w-36 shrink-0">
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${s.progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{s.progressPct}%</span>
              </div>
              {s.lastActive && (
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden sm:block">
                  {new Date(s.lastActive).toLocaleDateString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
