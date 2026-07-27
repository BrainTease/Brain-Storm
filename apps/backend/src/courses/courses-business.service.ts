import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { BusinessLogicService } from '../common/services/business-logic.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

/**
 * Business logic service for courses
 * Handles authorization, validation, and orchestration of course operations
 */
@Injectable()
export class CoursesBusinessService extends BusinessLogicService {
  constructor(private readonly coursesService: CoursesService) {
    super();
  }

  /**
   * Create a new course with authorization check
   */
  async createCourse(userId: string, userRole: string, dto: CreateCourseDto) {
    // Only admins and instructors can create courses
    if (!['admin', 'instructor'].includes(userRole)) {
      throw new ForbiddenException('Only admins and instructors can create courses');
    }

    return this.coursesService.create({
      ...dto,
      createdBy: userId,
    });
  }

  /**
   * Update a course with authorization check
   */
  async updateCourse(
    courseId: string,
    userId: string,
    userRole: string,
    dto: UpdateCourseDto,
  ) {
    // Verify user is authorized to update this course
    const course = await this.coursesService.findOne(courseId);
    
    if (userRole !== 'admin' && course.createdBy !== userId) {
      throw new ForbiddenException('You can only update courses you created');
    }

    return this.coursesService.update(courseId, dto);
  }

  /**
   * Delete a course with authorization check
   */
  async deleteCourse(courseId: string, userId: string, userRole: string) {
    const course = await this.coursesService.findOne(courseId);
    
    if (userRole !== 'admin' && course.createdBy !== userId) {
      throw new ForbiddenException('You can only delete courses you created');
    }

    return this.coursesService.delete(courseId);
  }

  /**
   * Schedule a course for future publication
   */
  async scheduleCourseForPublication(
    courseId: string,
    userId: string,
    userRole: string,
    scheduledAt: Date,
  ) {
    const course = await this.coursesService.findOne(courseId);
    
    if (userRole !== 'admin' && course.createdBy !== userId) {
      throw new ForbiddenException('You can only schedule courses you created');
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    return this.coursesService.scheduleCourse(courseId, scheduledAt);
  }

  /**
   * Publish a course immediately
   */
  async publishCourseNow(courseId: string, userId: string, userRole: string) {
    const course = await this.coursesService.findOne(courseId);
    
    if (userRole !== 'admin' && course.createdBy !== userId) {
      throw new ForbiddenException('You can only publish courses you created');
    }

    return this.coursesService.publishNow(courseId);
  }

  /**
   * Get all courses with pagination
   */
  async getAllCourses(search?: string, level?: string, page: number = 1, limit: number = 20) {
    const { page: validPage, limit: validLimit } = this.validatePagination(page, limit);
    return this.coursesService.findAll({
      search,
      level,
      page: validPage,
      limit: validLimit,
    });
  }

  /**
   * Get a single course
   */
  async getCourse(courseId: string) {
    return this.coursesService.findOne(courseId);
  }
}
