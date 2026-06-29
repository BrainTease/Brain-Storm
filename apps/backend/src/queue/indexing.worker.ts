import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  QUEUE_INDEXING,
  JOB_INDEX_COURSE,
  JOB_INDEX_LESSON,
  JOB_INDEX_POST,
  JOB_DELETE_FROM_INDEX,
} from './queue.constants';
import { SearchService, IndexName } from '../search/search.service';

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
  index: IndexName;
  id: string;
}

@Processor(QUEUE_INDEXING)
export class IndexingWorker extends WorkerHost {
  private readonly logger = new Logger(IndexingWorker.name);

  constructor(private readonly searchService: SearchService) {
    super();
  }

  async process(
    job: Job<IndexCourseJobData | IndexLessonJobData | IndexPostJobData | DeleteFromIndexJobData>,
  ): Promise<void> {
    switch (job.name) {
      case JOB_INDEX_COURSE: {
        const { course, enrollmentCount = 0 } = job.data as IndexCourseJobData;
        this.logger.debug(`Indexing course ${course.id} [jobId=${job.id}]`);
        await this.searchService.indexCourse(course as any, enrollmentCount);
        break;
      }

      case JOB_INDEX_LESSON: {
        const { lesson } = job.data as IndexLessonJobData;
        this.logger.debug(`Indexing lesson ${lesson.id} [jobId=${job.id}]`);
        await this.searchService.indexLesson(lesson as any);
        break;
      }

      case JOB_INDEX_POST: {
        const { post } = job.data as IndexPostJobData;
        this.logger.debug(`Indexing post ${post.id} [jobId=${job.id}]`);
        await this.searchService.indexPost(post as any);
        break;
      }

      case JOB_DELETE_FROM_INDEX: {
        const { index, id } = job.data as DeleteFromIndexJobData;
        this.logger.debug(`Deleting ${id} from index ${index} [jobId=${job.id}]`);
        await this.searchService.deleteFromIndex(index, id);
        break;
      }

      default:
        this.logger.warn(`Unknown indexing job: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`Indexing job ${job.id} (${job.name}) failed: ${err.message}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Indexing job ${job.id} (${job.name}) completed`);
  }
}
