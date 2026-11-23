/**
 * CoursesService - Handles course operations
 * - Store and retrieve courses
 * - Manage course metadata
 * - Filter courses by criteria
 * - Track course enrollment
 * - Handle course visibility
 */

export interface CourseMetadata {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // in minutes
  language?: string;
  tags?: string[];
  prerequisites?: string[];
  [key: string]: any;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  price: number;
  isPublished: boolean;
  metadata?: CourseMetadata;
  createdAt: Date;
  updatedAt: Date;
  enrollmentCount: number;
  rating?: number;
}

export interface CourseEnrollment {
  id: string;
  courseId: string;
  userId: string;
  enrolledAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
}

export interface CourseResult {
  success: boolean;
  course?: Course;
  courses?: Course[];
  enrollment?: CourseEnrollment;
  enrollments?: CourseEnrollment[];
  error?: string;
  total?: number;
  page?: number;
  limit?: number;
}

export interface CourseRepository {
  save: (course: Course) => Promise<Course>;
  findById: (id: string) => Promise<Course | null>;
  findAll: () => Promise<Course[]>;
  findByCategory: (category: string) => Promise<Course[]>;
  update: (id: string, course: Partial<Course>) => Promise<Course | null>;
  delete: (id: string) => Promise<boolean>;
}

export interface EnrollmentRepository {
  save: (enrollment: CourseEnrollment) => Promise<CourseEnrollment>;
  findById: (id: string) => Promise<CourseEnrollment | null>;
  findByCourseId: (courseId: string) => Promise<CourseEnrollment[]>;
  findByUserId: (userId: string) => Promise<CourseEnrollment[]>;
  findByUserAndCourse: (userId: string, courseId: string) => Promise<CourseEnrollment | null>;
  update: (id: string, enrollment: Partial<CourseEnrollment>) => Promise<CourseEnrollment | null>;
  delete: (id: string) => Promise<boolean>;
}

export class CoursesService {
  private courseRepository: CourseRepository;
  private enrollmentRepository: EnrollmentRepository;
  private courses: Map<string, Course>;
  private enrollments: Map<string, CourseEnrollment>;

  constructor(courseRepository: CourseRepository, enrollmentRepository: EnrollmentRepository) {
    this.courseRepository = courseRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.courses = new Map();
    this.enrollments = new Map();
    this.initializeMockData();
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    const mockCourse: Course = {
      id: 'course-1',
      title: 'Introduction to Blockchain',
      description: 'Learn the basics of blockchain technology',
      instructorId: 'instructor-1',
      category: 'blockchain',
      price: 99.99,
      isPublished: true,
      metadata: {
        difficulty: 'beginner',
        duration: 240,
        language: 'en',
        tags: ['blockchain', 'crypto', 'web3'],
      },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      enrollmentCount: 150,
      rating: 4.5,
    };

    this.courses.set('course-1', mockCourse);
  }

  /**
   * Create a new course
   */
  createCourse(
    title: string,
    description: string,
    instructorId: string,
    category: string,
    price: number,
    metadata?: CourseMetadata
  ): CourseResult {
    // Validate inputs
    if (!title || !description || !instructorId || !category) {
      return {
        success: false,
        error: 'Title, description, instructor ID, and category are required',
      };
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      return {
        success: false,
        error: 'Title must be between 3 and 200 characters',
      };
    }

    // Validate description length
    if (description.length < 10 || description.length > 5000) {
      return {
        success: false,
        error: 'Description must be between 10 and 5000 characters',
      };
    }

    // Validate price
    if (typeof price !== 'number' || price < 0) {
      return {
        success: false,
        error: 'Price must be a non-negative number',
      };
    }

    // Create course
    const courseId = `course-${Date.now()}`;
    const now = new Date();
    const course: Course = {
      id: courseId,
      title,
      description,
      instructorId,
      category,
      price,
      isPublished: false,
      metadata,
      createdAt: now,
      updatedAt: now,
      enrollmentCount: 0,
    };

    this.courses.set(courseId, course);

    return {
      success: true,
      course,
    };
  }

  /**
   * Get course by ID
   */
  getCourse(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    return {
      success: true,
      course,
    };
  }

  /**
   * Get all courses with pagination
   */
  getAllCourses(page: number = 1, limit: number = 10): CourseResult {
    if (page < 1 || limit < 1) {
      return {
        success: false,
        error: 'Page and limit must be positive numbers',
      };
    }

    if (limit > 100) {
      return {
        success: false,
        error: 'Limit cannot exceed 100',
      };
    }

    const allCourses = Array.from(this.courses.values());
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = allCourses.slice(start, end);

    return {
      success: true,
      courses: paginatedCourses,
      total: allCourses.length,
      page,
      limit,
    };
  }

  /**
   * Get published courses only
   */
  getPublishedCourses(page: number = 1, limit: number = 10): CourseResult {
    if (page < 1 || limit < 1) {
      return {
        success: false,
        error: 'Page and limit must be positive numbers',
      };
    }

    const publishedCourses = Array.from(this.courses.values()).filter(
      (c) => c.isPublished
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = publishedCourses.slice(start, end);

    return {
      success: true,
      courses: paginatedCourses,
      total: publishedCourses.length,
      page,
      limit,
    };
  }

  /**
   * Get courses by category
   */
  getCoursesByCategory(category: string, page: number = 1, limit: number = 10): CourseResult {
    if (!category) {
      return {
        success: false,
        error: 'Category is required',
      };
    }

    if (page < 1 || limit < 1) {
      return {
        success: false,
        error: 'Page and limit must be positive numbers',
      };
    }

    const categoryCourses = Array.from(this.courses.values()).filter(
      (c) => c.category === category
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = categoryCourses.slice(start, end);

    return {
      success: true,
      courses: paginatedCourses,
      total: categoryCourses.length,
      page,
      limit,
    };
  }

  /**
   * Get courses by instructor
   */
  getCoursesByInstructor(instructorId: string, page: number = 1, limit: number = 10): CourseResult {
    if (!instructorId) {
      return {
        success: false,
        error: 'Instructor ID is required',
      };
    }

    if (page < 1 || limit < 1) {
      return {
        success: false,
        error: 'Page and limit must be positive numbers',
      };
    }

    const instructorCourses = Array.from(this.courses.values()).filter(
      (c) => c.instructorId === instructorId
    );
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = instructorCourses.slice(start, end);

    return {
      success: true,
      courses: paginatedCourses,
      total: instructorCourses.length,
      page,
      limit,
    };
  }

  /**
   * Search courses by title or description
   */
  searchCourses(query: string, page: number = 1, limit: number = 10): CourseResult {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Search query is required',
      };
    }

    if (query.length > 100) {
      return {
        success: false,
        error: 'Search query cannot exceed 100 characters',
      };
    }

    const searchLower = query.toLowerCase();
    const matchedCourses = Array.from(this.courses.values()).filter(
      (c) =>
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower)
    );

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedCourses = matchedCourses.slice(start, end);

    return {
      success: true,
      courses: paginatedCourses,
      total: matchedCourses.length,
      page,
      limit,
    };
  }

  /**
   * Update course
   */
  updateCourse(courseId: string, updates: Partial<Course>): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    // Validate fields if provided
    if (updates.title !== undefined) {
      if (updates.title.length < 3 || updates.title.length > 200) {
        return {
          success: false,
          error: 'Title must be between 3 and 200 characters',
        };
      }
      course.title = updates.title;
    }

    if (updates.description !== undefined) {
      if (updates.description.length < 10 || updates.description.length > 5000) {
        return {
          success: false,
          error: 'Description must be between 10 and 5000 characters',
        };
      }
      course.description = updates.description;
    }

    if (updates.price !== undefined) {
      if (typeof updates.price !== 'number' || updates.price < 0) {
        return {
          success: false,
          error: 'Price must be a non-negative number',
        };
      }
      course.price = updates.price;
    }

    if (updates.category !== undefined) {
      course.category = updates.category;
    }

    if (updates.isPublished !== undefined) {
      course.isPublished = updates.isPublished;
    }

    if (updates.metadata !== undefined) {
      course.metadata = updates.metadata;
    }

    if (updates.rating !== undefined) {
      if (typeof updates.rating !== 'number' || updates.rating < 0 || updates.rating > 5) {
        return {
          success: false,
          error: 'Rating must be a number between 0 and 5',
        };
      }
      course.rating = updates.rating;
    }

    course.updatedAt = new Date();
    this.courses.set(courseId, course);

    return {
      success: true,
      course,
    };
  }

  /**
   * Publish course
   */
  publishCourse(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    if (course.isPublished) {
      return {
        success: false,
        error: 'Course is already published',
      };
    }

    course.isPublished = true;
    course.updatedAt = new Date();
    this.courses.set(courseId, course);

    return {
      success: true,
      course,
    };
  }

  /**
   * Unpublish course
   */
  unpublishCourse(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    if (!course.isPublished) {
      return {
        success: false,
        error: 'Course is already unpublished',
      };
    }

    course.isPublished = false;
    course.updatedAt = new Date();
    this.courses.set(courseId, course);

    return {
      success: true,
      course,
    };
  }

  /**
   * Delete course
   */
  deleteCourse(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    this.courses.delete(courseId);

    return {
      success: true,
      course,
    };
  }

  /**
   * Enroll user in course
   */
  enrollUser(userId: string, courseId: string): CourseResult {
    if (!userId || !courseId) {
      return {
        success: false,
        error: 'User ID and Course ID are required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    // Check if already enrolled
    const existingEnrollment = Array.from(this.enrollments.values()).find(
      (e) => e.userId === userId && e.courseId === courseId
    );

    if (existingEnrollment) {
      return {
        success: false,
        error: 'User is already enrolled in this course',
      };
    }

    // Create enrollment
    const enrollmentId = `enroll-${Date.now()}`;
    const enrollment: CourseEnrollment = {
      id: enrollmentId,
      courseId,
      userId,
      enrolledAt: new Date(),
      progress: 0,
    };

    this.enrollments.set(enrollmentId, enrollment);

    // Update enrollment count
    course.enrollmentCount += 1;
    this.courses.set(courseId, course);

    return {
      success: true,
      enrollment,
    };
  }

  /**
   * Get user enrollments
   */
  getUserEnrollments(userId: string): CourseResult {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required',
      };
    }

    const userEnrollments = Array.from(this.enrollments.values()).filter(
      (e) => e.userId === userId
    );

    return {
      success: true,
      enrollments: userEnrollments,
    };
  }

  /**
   * Get course enrollments
   */
  getCourseEnrollments(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    const courseEnrollments = Array.from(this.enrollments.values()).filter(
      (e) => e.courseId === courseId
    );

    return {
      success: true,
      enrollments: courseEnrollments,
    };
  }

  /**
   * Update enrollment progress
   */
  updateEnrollmentProgress(
    enrollmentId: string,
    progress: number
  ): CourseResult {
    if (!enrollmentId) {
      return {
        success: false,
        error: 'Enrollment ID is required',
      };
    }

    if (typeof progress !== 'number' || progress < 0 || progress > 100) {
      return {
        success: false,
        error: 'Progress must be a number between 0 and 100',
      };
    }

    const enrollment = this.enrollments.get(enrollmentId);

    if (!enrollment) {
      return {
        success: false,
        error: 'Enrollment not found',
      };
    }

    enrollment.progress = progress;

    // Mark as completed if progress is 100
    if (progress === 100 && !enrollment.completedAt) {
      enrollment.completedAt = new Date();
    }

    this.enrollments.set(enrollmentId, enrollment);

    return {
      success: true,
      enrollment,
    };
  }

  /**
   * Complete enrollment
   */
  completeEnrollment(enrollmentId: string): CourseResult {
    if (!enrollmentId) {
      return {
        success: false,
        error: 'Enrollment ID is required',
      };
    }

    const enrollment = this.enrollments.get(enrollmentId);

    if (!enrollment) {
      return {
        success: false,
        error: 'Enrollment not found',
      };
    }

    if (enrollment.completedAt) {
      return {
        success: false,
        error: 'Enrollment is already completed',
      };
    }

    enrollment.progress = 100;
    enrollment.completedAt = new Date();
    this.enrollments.set(enrollmentId, enrollment);

    return {
      success: true,
      enrollment,
    };
  }

  /**
   * Unenroll user
   */
  unenrollUser(enrollmentId: string): CourseResult {
    if (!enrollmentId) {
      return {
        success: false,
        error: 'Enrollment ID is required',
      };
    }

    const enrollment = this.enrollments.get(enrollmentId);

    if (!enrollment) {
      return {
        success: false,
        error: 'Enrollment not found',
      };
    }

    // Update enrollment count
    const course = this.courses.get(enrollment.courseId);
    if (course && course.enrollmentCount > 0) {
      course.enrollmentCount -= 1;
      this.courses.set(enrollment.courseId, course);
    }

    this.enrollments.delete(enrollmentId);

    return {
      success: true,
      enrollment,
    };
  }

  /**
   * Get course stats
   */
  getCourseStats(courseId: string): CourseResult {
    if (!courseId) {
      return {
        success: false,
        error: 'Course ID is required',
      };
    }

    const course = this.courses.get(courseId);

    if (!course) {
      return {
        success: false,
        error: 'Course not found',
      };
    }

    const enrollments = Array.from(this.enrollments.values()).filter(
      (e) => e.courseId === courseId
    );

    const completedCount = enrollments.filter((e) => e.completedAt).length;
    const averageProgress =
      enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
        : 0;

    return {
      success: true,
      course: {
        ...course,
        enrollmentCount: enrollments.length,
      },
    };
  }

  /**
   * Get top rated courses
   */
  getTopRatedCourses(limit: number = 10): CourseResult {
    if (limit < 1 || limit > 100) {
      return {
        success: false,
        error: 'Limit must be between 1 and 100',
      };
    }

    const topCourses = Array.from(this.courses.values())
      .filter((c) => c.rating !== undefined)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);

    return {
      success: true,
      courses: topCourses,
    };
  }
}
