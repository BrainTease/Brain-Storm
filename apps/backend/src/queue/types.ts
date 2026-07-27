/** Shared job data types for BullMQ queues */

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

export interface IssueCertificateJobData {
  userId: string;
  courseId: string;
  userEmail: string;
  userName: string;
  courseTitle: string;
  recipientPublicKey?: string;
}

export interface MintCredentialJobData {
  recipientPublicKey: string;
  courseId: string;
  courseTitle: string;
  certificateHash: string;
}

export interface IndexCourseJobData {
  course: {
    id: string;
    title: string;
    description: string;
    level: string;
    durationHours: number;
    isPublished: boolean;
  };
  enrollmentCount?: number;
}

export interface IndexLessonJobData {
  lesson: {
    id: string;
    title: string;
    content: string;
    moduleId: string;
    durationMinutes: number;
  };
}

export interface IndexPostJobData {
  post: {
    id: string;
    title: string;
    content: string;
    courseId: string;
    userId: string;
  };
}

export interface DeleteFromIndexJobData {
  index: 'courses' | 'lessons' | 'posts';
  id: string;
}
