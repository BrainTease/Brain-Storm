import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForumsService } from './forums.service';
import { Post } from './post.entity';
import { Reply } from './reply.entity';
import { Course } from '../courses/course.entity';
import { ModerationService } from '../moderation/moderation.service';
import { SearchService } from '../search/search.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';

describe('ForumsService', () => {
  let service: ForumsService;

  const mockPostRepo = {
    create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn(), update: jest.fn(),
  };
  const mockReplyRepo = {
    create: jest.fn(), save: jest.fn(), update: jest.fn(),
  };
  const mockCourseRepo = { findOne: jest.fn() };
  const mockModerationService = { analyzeContent: jest.fn().mockResolvedValue(false) };
  const mockSearchService = { indexPost: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumsService,
        { provide: getRepositoryToken(Post), useValue: mockPostRepo },
        { provide: getRepositoryToken(Reply), useValue: mockReplyRepo },
        { provide: getRepositoryToken(Course), useValue: mockCourseRepo },
        { provide: ModerationService, useValue: mockModerationService },
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();
    service = module.get<ForumsService>(ForumsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createPost ───────────────────────────────────────────────────────────────

  describe('createPost', () => {
    const courseId = 'c1', userId = 'u1';
    const dto: CreatePostDto = { title: 'Help', content: 'Question here', isPinned: false };

    it('creates a post for any role when not pinning', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId });
      const post = { id: 'p1', courseId, userId, isPinned: false } as Post;
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);

      const result = await service.createPost(courseId, userId, 'student', dto);

      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseId, userId, isPinned: false }),
      );
      expect(result).toEqual(post);
    });

    it('allows instructor to create a pinned post', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId });
      const pinnedDto: CreatePostDto = { title: 'Announcement', content: 'Read this', isPinned: true };
      const post = { id: 'p2', courseId, userId, isPinned: true } as Post;
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);

      const result = await service.createPost(courseId, userId, 'instructor', pinnedDto);

      expect(mockPostRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ isPinned: true }),
      );
      expect(result).toEqual(post);
    });

    it('allows admin to create a pinned post', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId });
      const pinnedDto: CreatePostDto = { title: 'Notice', content: 'Important', isPinned: true };
      const post = { id: 'p3', courseId, userId, isPinned: true } as Post;
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);

      await expect(service.createPost(courseId, userId, 'admin', pinnedDto)).resolves.toEqual(post);
    });

    it('throws ForbiddenException when student tries to pin a post', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId });
      const pinnedDto: CreatePostDto = { title: 'Pin me', content: 'Nope', isPinned: true };

      await expect(service.createPost(courseId, userId, 'student', pinnedDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPostRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when course does not exist', async () => {
      mockCourseRepo.findOne.mockResolvedValue(null);

      await expect(service.createPost('nonexistent', userId, 'student', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPostRepo.save).not.toHaveBeenCalled();
    });

    it('runs moderation analysis after saving', async () => {
      mockCourseRepo.findOne.mockResolvedValue({ id: courseId });
      const post = { id: 'p1', courseId, userId, title: 'Help', content: 'Question here' } as Post;
      mockPostRepo.create.mockReturnValue(post);
      mockPostRepo.save.mockResolvedValue(post);

      await service.createPost(courseId, userId, 'student', dto);

      expect(mockModerationService.analyzeContent).toHaveBeenCalled();
    });
  });

  // ── createReply ──────────────────────────────────────────────────────────────

  describe('createReply', () => {
    const postId = 'p1', userId = 'u1';
    const dto: CreateReplyDto = { content: 'My reply', isAnswer: false };

    it('creates a reply when post exists', async () => {
      const post = { id: postId, courseId: 'c1' } as Post;
      const reply = { id: 'r1', postId, userId, content: 'My reply', isAnswer: false } as Reply;
      mockPostRepo.findOne.mockResolvedValue(post);
      mockReplyRepo.create.mockReturnValue(reply);
      mockReplyRepo.save.mockResolvedValue(reply);

      const result = await service.createReply(postId, userId, 'student', dto);

      expect(result).toEqual(reply);
    });

    it('throws NotFoundException when post does not exist', async () => {
      mockPostRepo.findOne.mockResolvedValue(null);

      await expect(service.createReply('missing', userId, 'student', dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockReplyRepo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when student tries to mark answer', async () => {
      const post = { id: postId, courseId: 'c1' } as Post;
      mockPostRepo.findOne.mockResolvedValue(post);
      const answerDto: CreateReplyDto = { content: 'Answer', isAnswer: true };

      await expect(service.createReply(postId, userId, 'student', answerDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows instructor to mark a reply as the answer', async () => {
      const post = { id: postId, courseId: 'c1' } as Post;
      const reply = { id: 'r1', postId, userId, content: 'Correct!', isAnswer: true } as Reply;
      mockPostRepo.findOne.mockResolvedValue(post);
      mockReplyRepo.update.mockResolvedValue(undefined);
      mockReplyRepo.create.mockReturnValue(reply);
      mockReplyRepo.save.mockResolvedValue(reply);
      mockPostRepo.save.mockResolvedValue(post);

      const answerDto: CreateReplyDto = { content: 'Correct!', isAnswer: true };
      const result = await service.createReply(postId, userId, 'instructor', answerDto);

      // Previous answers cleared
      expect(mockReplyRepo.update).toHaveBeenCalledWith(
        { postId, isAnswer: true },
        { isAnswer: false },
      );
      expect(result).toEqual(reply);
    });
  });

  // ── findPostsByCourse ─────────────────────────────────────────────────────────

  describe('findPostsByCourse', () => {
    it('throws NotFoundException when course does not exist', async () => {
      mockCourseRepo.findOne.mockResolvedValue(null);

      await expect(service.findPostsByCourse('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns posts ordered by isPinned and createdAt', async () => {
      const course = { id: 'c1' } as Course;
      const posts = [{ id: 'p1', isPinned: true }, { id: 'p2', isPinned: false }] as Post[];
      mockCourseRepo.findOne.mockResolvedValue(course);
      mockPostRepo.find.mockResolvedValue(posts);

      const result = await service.findPostsByCourse('c1');

      expect(result).toEqual(posts);
      expect(mockPostRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { isPinned: 'DESC', createdAt: 'DESC' } }),
      );
    });
  });
});
