'use client';

import React, { useState } from 'react';
import { ThreadList } from '@/components/forum/ThreadList';
import { CreateThreadModal } from '@/components/forum/CreateThreadModal';

interface ForumPageProps {
  params: { id: string };
}

/**
 * Forum/Discussion page for a course
 * Displays thread list with ability to create and view threads
 */
export default function ForumPage({ params }: ForumPageProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Course Discussion Forum</h1>
              <p className="text-gray-600 mt-2">
                Ask questions, share knowledge, and connect with other learners
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Start Discussion
            </button>
          </div>
        </div>

        {/* Forum Content */}
        <div className="space-y-4">
          <ThreadList courseId={params.id} />
        </div>
      </div>

      {/* Create Thread Modal */}
      <CreateThreadModal
        courseId={params.id}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onThreadCreated={() => {
          // Optionally refresh thread list
        }}
      />
    </div>
  );
}
