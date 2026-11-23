import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CoursesService,
  Course,
  CourseEnrollment,
  CourseRepository,
  EnrollmentRepository,
} from '../services/CoursesService';

describe('CoursesService', () => {
  let coursesService: CoursesService;
  let mockCourseRepository: CourseRepository;
  let mockEnrollmentRepository: EnrollmentRepository;

  beforeEach(() => {
    // Mock repositories
    mockCourseRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      findByCategory: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockEnrollmentRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      findByCourseId: vi.fn(),
      findByUserId: vi.fn(),
      findByUserAndCourse: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    coursesService = new CoursesService(
      mockCourseRepository,
      mockEnrollmentRepository
    );
  });

  describe('createCourse', () => {
    it('should create a course successfully', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(true);
      expect(result.course).toBeDefined();
      expect(result.course?.title).toBe('Blockchain Basics');
      expect(result.course?.instructorId).toBe('instructor-1');
      expect(result.course?.price).toBe(99.99);
      expect(result.course?.isPublished).toBe(false);
      expect(result.course?.enrollmentCount).toBe(0);
    });

    it('should include metadata when provided', () => {
      const metadata = {
        difficulty: 'beginner' as const,
        duration: 240,
        language: 'en',
        tags: ['blockchain', 'crypto'],
      };

      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99,
        metadata
      );

      expect(result.course?.metadata).toEqual(metadata);
    });

    it('should fail if title is missing', () => {
      const result = coursesService.createCourse(
        '',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if description is missing', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        '',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if instructorId is missing', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        '',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if category is missing', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        '',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if title is too short', () => {
      const result = coursesService.createCourse(
        'AB',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 3 and 200');
    });

    it('should fail if title is too long', () => {
      const longTitle = 'a'.repeat(201);
      const result = coursesService.createCourse(
        longTitle,
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 3 and 200');
    });

    it('should fail if description is too short', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Short',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 10 and 5000');
    });

    it('should fail if description is too long', () => {
      const longDescription = 'a'.repeat(5001);
      const result = coursesService.createCourse(
        'Blockchain Basics',
        longDescription,
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 10 and 5000');
    });

    it('should fail if price is negative', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        -50
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('should allow free courses', () => {
      const result = coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        0
      );

      expect(result.success).toBe(true);
      expect(result.course?.price).toBe(0);
    });
  });

  describe('getCourse', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
    });

    it('should retrieve course by ID', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.getCourse(courseId);

      expect(result.success).toBe(true);
      expect(result.course?.title).toBe('Blockchain Basics');
    });

    it('should fail if course ID is missing', () => {
      const result = coursesService.getCourse('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Course ID is required');
    });

    it('should fail if course not found', () => {
      const result = coursesService.getCourse('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getAllCourses', () => {
    it('should retrieve all courses with default pagination', () => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Smart Contracts 101',
        'Master smart contract development with Solidity',
        'instructor-2',
        'smart-contracts',
        149.99
      );

      const result = coursesService.getAllCourses();

      expect(result.success).toBe(true);
      expect(result.courses).toBeDefined();
      expect(result.courses?.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should include mock course from initialization', () => {
      const result = coursesService.getAllCourses();

      expect(result.success).toBe(true);
      expect(
        result.courses?.some((c) => c.title === 'Introduction to Blockchain')
      ).toBe(true);
    });

    it('should respect page parameter', () => {
      for (let i = 0; i < 15; i++) {
        coursesService.createCourse(
          `Course ${i}`,
          'Learn the fundamentals of blockchain technology' + i,
          'instructor-1',
          'blockchain',
          99.99
        );
      }

      const page1 = coursesService.getAllCourses(1, 5);
      const page2 = coursesService.getAllCourses(2, 5);

      expect(page1.courses?.length).toBeLessThanOrEqual(5);
      expect(page2.courses?.length).toBeLessThanOrEqual(5);
      expect(page1.courses![0].id).not.toBe(page2.courses![0].id);
    });

    it('should fail if page is invalid', () => {
      const result = coursesService.getAllCourses(0, 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive numbers');
    });

    it('should fail if limit is invalid', () => {
      const result = coursesService.getAllCourses(1, 0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive numbers');
    });

    it('should fail if limit exceeds maximum', () => {
      const result = coursesService.getAllCourses(1, 101);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed 100');
    });
  });

  describe('getPublishedCourses', () => {
    it('should retrieve only published courses', () => {
      const createResult1 = coursesService.createCourse(
        'Published Course',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const createResult2 = coursesService.createCourse(
        'Draft Course',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const publishedCourseId = allCourses.find((c: any) => c.title === 'Published Course')?.id;
      const draftCourseId = allCourses.find((c: any) => c.title === 'Draft Course')?.id;

      coursesService.publishCourse(publishedCourseId);

      const result = coursesService.getPublishedCourses();

      expect(result.success).toBe(true);
      expect(result.courses?.some((c) => c.title === 'Published Course')).toBe(
        true
      );
      expect(
        result.courses?.some((c) => c.title === 'Draft Course')
      ).toBe(false);
    });

    it('should include mock course from initialization', () => {
      const result = coursesService.getPublishedCourses();

      expect(result.success).toBe(true);
      expect(
        result.courses?.some((c) => c.title === 'Introduction to Blockchain')
      ).toBe(true);
    });
  });

  describe('getCoursesByCategory', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Web3 Development',
        'Master decentralized web development',
        'instructor-2',
        'web3',
        129.99
      );
    });

    it('should retrieve courses by category', () => {
      const result = coursesService.getCoursesByCategory('blockchain');

      expect(result.success).toBe(true);
      expect(result.courses?.some((c) => c.category === 'blockchain')).toBe(
        true
      );
    });

    it('should fail if category is missing', () => {
      const result = coursesService.getCoursesByCategory('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Category is required');
    });

    it('should fail if page is invalid', () => {
      const result = coursesService.getCoursesByCategory('blockchain', 0, 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('positive numbers');
    });

    it('should respect pagination', () => {
      const result = coursesService.getCoursesByCategory('blockchain', 1, 1);

      expect(result.courses?.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getCoursesByInstructor', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Advanced Blockchain',
        'Master advanced blockchain concepts',
        'instructor-1',
        'blockchain',
        199.99
      );
      coursesService.createCourse(
        'Web3 Development',
        'Master decentralized web development',
        'instructor-2',
        'web3',
        129.99
      );
    });

    it('should retrieve courses by instructor', () => {
      const result = coursesService.getCoursesByInstructor('instructor-1');

      expect(result.success).toBe(true);
      expect(result.courses?.length).toBeGreaterThanOrEqual(2);
      expect(result.courses?.every((c) => c.instructorId === 'instructor-1')).toBe(
        true
      );
    });

    it('should fail if instructor ID is missing', () => {
      const result = coursesService.getCoursesByInstructor('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Instructor ID is required');
    });

    it('should respect pagination', () => {
      const result = coursesService.getCoursesByInstructor('instructor-1', 1, 1);

      expect(result.courses?.length).toBeLessThanOrEqual(1);
    });
  });

  describe('searchCourses', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Smart Contracts 101',
        'Master smart contract development',
        'instructor-2',
        'smart-contracts',
        149.99
      );
    });

    it('should search courses by title', () => {
      const result = coursesService.searchCourses('Blockchain');

      expect(result.success).toBe(true);
      expect(result.courses?.some((c) => c.title.includes('Blockchain'))).toBe(
        true
      );
    });

    it('should search courses by description', () => {
      const result = coursesService.searchCourses('smart contract');

      expect(result.success).toBe(true);
      expect(
        result.courses?.some((c) => c.description.includes('smart contract'))
      ).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result = coursesService.searchCourses('blockchain');

      expect(result.success).toBe(true);
      expect(result.courses?.length).toBeGreaterThan(0);
    });

    it('should fail if query is missing', () => {
      const result = coursesService.searchCourses('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should fail if query exceeds max length', () => {
      const longQuery = 'a'.repeat(101);
      const result = coursesService.searchCourses(longQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot exceed 100');
    });

    it('should respect pagination', () => {
      const result = coursesService.searchCourses('a', 1, 1);

      expect(result.courses?.length).toBeLessThanOrEqual(1);
    });
  });

  describe('updateCourse', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
    });

    it('should update course title', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        title: 'Advanced Blockchain Basics',
      });

      expect(result.success).toBe(true);
      expect(result.course?.title).toBe('Advanced Blockchain Basics');
    });

    it('should update course description', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        description: 'Master the advanced concepts of blockchain technology',
      });

      expect(result.success).toBe(true);
      expect(result.course?.description).toContain('advanced');
    });

    it('should update course price', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        price: 149.99,
      });

      expect(result.success).toBe(true);
      expect(result.course?.price).toBe(149.99);
    });

    it('should update course rating', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        rating: 4.5,
      });

      expect(result.success).toBe(true);
      expect(result.course?.rating).toBe(4.5);
    });

    it('should fail if title is too short', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        title: 'AB',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 3 and 200');
    });

    it('should fail if price is negative', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        price: -50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('should fail if rating is out of range', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.updateCourse(courseId, {
        rating: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 0 and 5');
    });

    it('should fail if course not found', () => {
      const result = coursesService.updateCourse('non-existent', {
        title: 'New Title',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should update metadata', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const newMetadata = { difficulty: 'advanced' as const, duration: 360 };
      const result = coursesService.updateCourse(courseId, {
        metadata: newMetadata,
      });

      expect(result.success).toBe(true);
      expect(result.course?.metadata).toEqual(newMetadata);
    });
  });

  describe('publishCourse', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
    });

    it('should publish course', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.publishCourse(courseId);

      expect(result.success).toBe(true);
      expect(result.course?.isPublished).toBe(true);
    });

    it('should fail if already published', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.publishCourse(courseId);
      const result = coursesService.publishCourse(courseId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already published');
    });

    it('should fail if course not found', () => {
      const result = coursesService.publishCourse('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('unpublishCourse', () => {
    beforeEach(() => {
      const result = coursesService.createCourse(
        'Test Course',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Test Course')?.id;

      if (courseId) {
        coursesService.publishCourse(courseId);
      }
    });

    it('should unpublish course', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Test Course')?.id;

      const result = coursesService.unpublishCourse(courseId);

      expect(result.success).toBe(true);
      expect(result.course?.isPublished).toBe(false);
    });

    it('should fail if already unpublished', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Test Course')?.id;

      coursesService.unpublishCourse(courseId);
      const result = coursesService.unpublishCourse(courseId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already unpublished');
    });

    it('should fail if course not found', () => {
      const result = coursesService.unpublishCourse('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('deleteCourse', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
    });

    it('should delete course', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.deleteCourse(courseId);

      expect(result.success).toBe(true);

      const getResult = coursesService.getCourse(courseId);
      expect(getResult.success).toBe(false);
    });

    it('should fail if course not found', () => {
      const result = coursesService.deleteCourse('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('enrollUser', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
    });

    it('should enroll user in course', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.enrollUser('user-1', courseId);

      expect(result.success).toBe(true);
      expect(result.enrollment?.userId).toBe('user-1');
      expect(result.enrollment?.courseId).toBe(courseId);
      expect(result.enrollment?.progress).toBe(0);
    });

    it('should increment enrollment count', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;
      const beforeCount = (coursesService.getCourse(courseId) as any).course.enrollmentCount;

      coursesService.enrollUser('user-1', courseId);

      const afterCount = (coursesService.getCourse(courseId) as any).course.enrollmentCount;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it('should fail if user already enrolled', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
      const result = coursesService.enrollUser('user-1', courseId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already enrolled');
    });

    it('should fail if course not found', () => {
      const result = coursesService.enrollUser('user-1', 'non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if user ID is missing', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses[0].id;

      const result = coursesService.enrollUser('', courseId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  describe('getUserEnrollments', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Smart Contracts 101',
        'Master smart contract development with Solidity',
        'instructor-2',
        'smart-contracts',
        149.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const course1 = allCourses.find((c: any) => c.title === 'Blockchain Basics');
      const course2 = allCourses.find((c: any) => c.title === 'Smart Contracts 101');

      coursesService.enrollUser('user-1', course1.id);
      coursesService.enrollUser('user-1', course2.id);
    });

    it('should retrieve user enrollments', () => {
      const result = coursesService.getUserEnrollments('user-1');

      expect(result.success).toBe(true);
      expect(result.enrollments?.length).toBeGreaterThanOrEqual(2);
      expect(result.enrollments?.every((e) => e.userId === 'user-1')).toBe(
        true
      );
    });

    it('should fail if user ID is missing', () => {
      const result = coursesService.getUserEnrollments('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User ID is required');
    });
  });

  describe('getCourseEnrollments', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
      coursesService.enrollUser('user-2', courseId);
    });

    it('should retrieve course enrollments', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.getCourseEnrollments(courseId);

      expect(result.success).toBe(true);
      expect(result.enrollments?.length).toBeGreaterThanOrEqual(2);
    });

    it('should fail if course ID is missing', () => {
      const result = coursesService.getCourseEnrollments('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Course ID is required');
    });

    it('should fail if course not found', () => {
      const result = coursesService.getCourseEnrollments('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateEnrollmentProgress', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
    });

    it('should update enrollment progress', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      const result = coursesService.updateEnrollmentProgress(enrollmentId, 50);

      expect(result.success).toBe(true);
      expect(result.enrollment?.progress).toBe(50);
    });

    it('should mark as completed when progress is 100', () => {
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      const result = coursesService.updateEnrollmentProgress(enrollmentId, 100);

      expect(result.success).toBe(true);
      expect(result.enrollment?.progress).toBe(100);
      expect(result.enrollment?.completedAt).toBeDefined();
    });

    it('should fail if progress is out of range', () => {
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      const result = coursesService.updateEnrollmentProgress(enrollmentId, 150);

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 0 and 100');
    });

    it('should fail if enrollment not found', () => {
      const result = coursesService.updateEnrollmentProgress(
        'non-existent',
        50
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('completeEnrollment', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
    });

    it('should complete enrollment', () => {
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      const result = coursesService.completeEnrollment(enrollmentId);

      expect(result.success).toBe(true);
      expect(result.enrollment?.progress).toBe(100);
      expect(result.enrollment?.completedAt).toBeDefined();
    });

    it('should fail if already completed', () => {
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      coursesService.completeEnrollment(enrollmentId);
      const result = coursesService.completeEnrollment(enrollmentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already completed');
    });

    it('should fail if enrollment not found', () => {
      const result = coursesService.completeEnrollment('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('unenrollUser', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
    });

    it('should unenroll user', () => {
      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;

      const result = coursesService.unenrollUser(enrollmentId);

      expect(result.success).toBe(true);
    });

    it('should decrement enrollment count', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;
      const beforeCount = (coursesService.getCourse(courseId) as any).course.enrollmentCount;

      const enrollments = (coursesService.getUserEnrollments('user-1') as any).enrollments;
      const enrollmentId = enrollments[0].id;
      coursesService.unenrollUser(enrollmentId);

      const afterCount = (coursesService.getCourse(courseId) as any).course.enrollmentCount;
      expect(afterCount).toBe(beforeCount - 1);
    });

    it('should fail if enrollment not found', () => {
      const result = coursesService.unenrollUser('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getCourseStats', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Blockchain Basics',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      coursesService.enrollUser('user-1', courseId);
      coursesService.enrollUser('user-2', courseId);
      coursesService.enrollUser('user-3', courseId);

      const enrollments = (coursesService.getCourseEnrollments(courseId) as any).enrollments;
      coursesService.updateEnrollmentProgress(enrollments[0].id, 50);
      coursesService.updateEnrollmentProgress(enrollments[1].id, 100);
      coursesService.updateEnrollmentProgress(enrollments[2].id, 75);
    });

    it('should retrieve course stats', () => {
      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseId = allCourses.find((c: any) => c.title === 'Blockchain Basics')?.id;

      const result = coursesService.getCourseStats(courseId);

      expect(result.success).toBe(true);
      expect(result.course?.enrollmentCount).toBeGreaterThanOrEqual(3);
    });

    it('should fail if course not found', () => {
      const result = coursesService.getCourseStats('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getTopRatedCourses', () => {
    beforeEach(() => {
      coursesService.createCourse(
        'Course A',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );
      coursesService.createCourse(
        'Course B',
        'Master advanced blockchain concepts',
        'instructor-2',
        'blockchain',
        199.99
      );

      const allCourses = (
        coursesService.getAllCourses() as any
      ).courses;
      const courseA = allCourses.find((c: any) => c.title === 'Course A')?.id;
      const courseB = allCourses.find((c: any) => c.title === 'Course B')?.id;

      coursesService.updateCourse(courseA, { rating: 4.5 });
      coursesService.updateCourse(courseB, { rating: 4.8 });
    });

    it('should retrieve top rated courses', () => {
      const result = coursesService.getTopRatedCourses(5);

      expect(result.success).toBe(true);
      expect(result.courses).toBeDefined();
    });

    it('should sort by rating descending', () => {
      const result = coursesService.getTopRatedCourses(10);

      if (result.courses && result.courses.length > 1) {
        for (let i = 0; i < result.courses.length - 1; i++) {
          const current = result.courses[i].rating || 0;
          const next = result.courses[i + 1].rating || 0;
          expect(current).toBeGreaterThanOrEqual(next);
        }
      }
    });

    it('should respect limit parameter', () => {
      const result = coursesService.getTopRatedCourses(2);

      expect(result.courses?.length).toBeLessThanOrEqual(2);
    });

    it('should fail if limit is invalid', () => {
      const result = coursesService.getTopRatedCourses(101);

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 100');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete course lifecycle', () => {
      // Create
      const createResult = coursesService.createCourse(
        'Integration Test Course',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      expect(createResult.success).toBe(true);

      const courseId = createResult.course?.id;

      // Update
      const updateResult = coursesService.updateCourse(courseId!, {
        price: 149.99,
      });
      expect(updateResult.success).toBe(true);

      // Publish
      const publishResult = coursesService.publishCourse(courseId!);
      expect(publishResult.success).toBe(true);

      // Retrieve
      const getResult = coursesService.getCourse(courseId!);
      expect(getResult.success).toBe(true);
      expect(getResult.course?.isPublished).toBe(true);

      // Enroll
      const enrollResult = coursesService.enrollUser('user-1', courseId!);
      expect(enrollResult.success).toBe(true);

      // Delete
      const deleteResult = coursesService.deleteCourse(courseId!);
      expect(deleteResult.success).toBe(true);
    });

    it('should track enrollment through completion', () => {
      const createResult = coursesService.createCourse(
        'Completion Test',
        'Learn the fundamentals of blockchain technology',
        'instructor-1',
        'blockchain',
        99.99
      );

      const courseId = createResult.course?.id!;

      // Enroll
      const enrollResult = coursesService.enrollUser('user-1', courseId);
      const enrollmentId = enrollResult.enrollment?.id!;

      // Track progress
      coursesService.updateEnrollmentProgress(enrollmentId, 25);
      coursesService.updateEnrollmentProgress(enrollmentId, 50);
      coursesService.updateEnrollmentProgress(enrollmentId, 75);

      // Complete
      const completeResult = coursesService.completeEnrollment(enrollmentId);
      expect(completeResult.success).toBe(true);
      expect(completeResult.enrollment?.progress).toBe(100);
      expect(completeResult.enrollment?.completedAt).toBeDefined();
    });
  });
});
