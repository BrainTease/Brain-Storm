import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { Review } from './review.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from './course.entity';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockReviewRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };
  const mockEnrollmentRepo = { findOne: jest.fn() };
  const mockCourseRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockReviewRepo },
        { provide: getRepositoryToken(Enrollment), useValue: mockEnrollmentRepo },
        { provide: getRepositoryToken(Course), useValue: mockCourseRepo },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────────

  describe('create', () => {
    const courseId = 'c1',
      userId = 'u1';
    const dto: CreateReviewDto = { rating: 5, comment: 'Great course!' };

    it('creates a review for a completed enrollment', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue(null);
      mockEnrollmentRepo.findOne.mockResolvedValue({
        courseId,
        userId,
        completedAt: new Date(),
      } as Enrollment);
      const review = { id: 'r1', courseId, userId, rating: 5 } as Review;
      mockReviewRepo.create.mockReturnValue(review);
      mockReviewRepo.save.mockResolvedValue(review);

      const result = await service.create(courseId, userId, dto);

      expect(result).toEqual(review);
      expect(mockReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseId, userId, rating: 5 })
      );
    });

    it('trims comment whitespace', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue(null);
      mockEnrollmentRepo.findOne.mockResolvedValue({ completedAt: new Date() } as Enrollment);
      mockReviewRepo.create.mockReturnValue({});
      mockReviewRepo.save.mockResolvedValue({});

      await service.create(courseId, userId, { rating: 4, comment: '  Good  ' });

      expect(mockReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: 'Good' })
      );
    });

    it('stores null comment when comment is empty string', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue(null);
      mockEnrollmentRepo.findOne.mockResolvedValue({ completedAt: new Date() } as Enrollment);
      mockReviewRepo.create.mockReturnValue({});
      mockReviewRepo.save.mockResolvedValue({});

      await service.create(courseId, userId, { rating: 3, comment: '' });

      expect(mockReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ comment: null })
      );
    });

    it('throws NotFoundException when course does not exist', async () => {
      mockCourseRepo.findOne.mockResolvedValue(null);

      await expect(service.create(courseId, userId, dto)).rejects.toThrow(NotFoundException);
      expect(mockReviewRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException when user already reviewed this course', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue({ id: 'existing' } as Review);

      await expect(service.create(courseId, userId, dto)).rejects.toThrow(ConflictException);
      expect(mockReviewRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnprocessableEntityException when no enrollment exists', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue(null);
      mockEnrollmentRepo.findOne.mockResolvedValue(null);

      await expect(service.create(courseId, userId, dto)).rejects.toThrow(
        UnprocessableEntityException
      );
    });

    it('throws UnprocessableEntityException when enrollment not yet completed', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId } as Course);
      mockReviewRepo.findOne.mockResolvedValue(null);
      mockEnrollmentRepo.findOne.mockResolvedValue({ completedAt: null } as Enrollment);

      await expect(service.create(courseId, userId, dto)).rejects.toThrow(
        UnprocessableEntityException
      );
    });
  });

  // ── findByCourse ──────────────────────────────────────────────────────────────

  describe('findByCourse', () => {
    it('returns paginated reviews with metadata', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: 'c1' } as Course);
      const reviews = [{ id: 'r1' }, { id: 'r2' }] as Review[];
      mockReviewRepo.findAndCount.mockResolvedValue([reviews, 2]);

      const result = await service.findByCourse('c1', { page: 1, limit: 20 });

      expect(result).toEqual({ data: reviews, total: 2, page: 1, limit: 20 });
    });

    it('defaults to page 1, limit 20 when query is empty', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: 'c1' } as Course);
      mockReviewRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findByCourse('c1');

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('calculates correct offset for page 3', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: 'c1' } as Course);
      mockReviewRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findByCourse('c1', { page: 3, limit: 10 });

      expect(mockReviewRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });

    it('throws NotFoundException when course does not exist', async () => {
      mockCourseRepo.findOne.mockResolvedValue(null);

      await expect(service.findByCourse('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
