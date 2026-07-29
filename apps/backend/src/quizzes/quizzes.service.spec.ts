import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizzesService } from './quizzes.service';
import { Quiz } from './quiz.entity';
import { QuizQuestion, QuestionType } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizAttemptAnswer } from './quiz-attempt-answer.entity';
import { QuizAnswer } from './quiz-answer.entity';

describe('QuizzesService', () => {
  let service: QuizzesService;

  const mockQuizRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const mockQuestionRepo = { create: jest.fn(), save: jest.fn() };
  const mockAttemptRepo = {
    create: jest.fn(), save: jest.fn(), findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockAttemptAnswerRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
  const mockAnswerRepo = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: getRepositoryToken(Quiz), useValue: mockQuizRepo },
        { provide: getRepositoryToken(QuizQuestion), useValue: mockQuestionRepo },
        { provide: getRepositoryToken(QuizAttempt), useValue: mockAttemptRepo },
        { provide: getRepositoryToken(QuizAttemptAnswer), useValue: mockAttemptAnswerRepo },
        { provide: getRepositoryToken(QuizAnswer), useValue: mockAnswerRepo },
      ],
    }).compile();
    service = module.get<QuizzesService>(QuizzesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('createQuiz', () => {
    it('creates and saves a quiz with lessonId', async () => {
      const quiz = { id: 'q1', lessonId: 'l1', title: 'Quiz 1' } as unknown as Quiz;
      mockQuizRepo.create.mockReturnValue(quiz);
      mockQuizRepo.save.mockResolvedValue(quiz);

      const result = await service.createQuiz('l1', { title: 'Quiz 1' });

      expect(mockQuizRepo.create).toHaveBeenCalledWith({ lessonId: 'l1', title: 'Quiz 1' });
      expect(result).toEqual(quiz);
    });
  });

  describe('getQuiz', () => {
    it('returns quiz with questions and answers when found', async () => {
      const quiz = { id: 'q1', questions: [] } as unknown as Quiz;
      mockQuizRepo.findOne.mockResolvedValue(quiz);

      const result = await service.getQuiz('q1');

      expect(mockQuizRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'q1' },
        relations: ['questions', 'questions.answers'],
      });
      expect(result).toEqual(quiz);
    });

    it('throws NotFoundException when quiz not found', async () => {
      mockQuizRepo.findOne.mockResolvedValue(null);
      await expect(service.getQuiz('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitAttempt', () => {
    it('throws NotFoundException when quiz not found', async () => {
      mockQuizRepo.findOne.mockResolvedValue(null);
      await expect(service.submitAttempt('missing', 'u1', [])).rejects.toThrow(NotFoundException);
    });

    it('scores a correct multiple-choice answer', async () => {
      const quiz = {
        id: 'q1',
        questions: [
          {
            id: 'qn1',
            type: QuestionType.MULTIPLE_CHOICE,
            points: 10,
            answers: [{ id: 'a1', text: 'Paris', isCorrect: true }],
          },
        ],
        passingScore: 60,
      } as unknown as Quiz;

      const attempt = { id: 'at1', quizId: 'q1', userId: 'u1' } as QuizAttempt;
      const savedAttempt = { ...attempt, score: 100, isGraded: true } as QuizAttempt;

      mockQuizRepo.findOne.mockResolvedValue(quiz);
      mockAttemptRepo.create.mockReturnValue(attempt);
      mockAttemptRepo.save
        .mockResolvedValueOnce(attempt)    // first save (create attempt)
        .mockResolvedValueOnce(savedAttempt); // second save (update score)
      const answerEntity = { attemptId: 'at1', questionId: 'qn1', points: 10 };
      mockAttemptAnswerRepo.create.mockReturnValue(answerEntity);
      mockAttemptAnswerRepo.save.mockResolvedValue(answerEntity);

      const result = await service.submitAttempt('q1', 'u1', [
        { questionId: 'qn1', answer: 'Paris' },
      ]);

      expect(attempt.score).toBe(100);
      expect(result).toEqual(savedAttempt);
    });

    it('scores 0 for wrong answer', async () => {
      const quiz = {
        id: 'q1',
        questions: [
          {
            id: 'qn1',
            type: QuestionType.MULTIPLE_CHOICE,
            points: 10,
            answers: [{ id: 'a1', text: 'Paris', isCorrect: true }],
          },
        ],
        passingScore: 60,
      } as unknown as Quiz;

      const attempt = { id: 'at1', quizId: 'q1', userId: 'u1' } as QuizAttempt;
      mockQuizRepo.findOne.mockResolvedValue(quiz);
      mockAttemptRepo.create.mockReturnValue(attempt);
      mockAttemptRepo.save.mockResolvedValue(attempt);
      const answerEntity = { attemptId: 'at1', questionId: 'qn1', points: 0 };
      mockAttemptAnswerRepo.create.mockReturnValue(answerEntity);
      mockAttemptAnswerRepo.save.mockResolvedValue(answerEntity);

      await service.submitAttempt('q1', 'u1', [{ questionId: 'qn1', answer: 'London' }]);

      expect(attempt.score).toBe(0);
    });

    it('does not auto-grade essay questions (isGraded stays false)', async () => {
      const quiz = {
        id: 'q1',
        questions: [
          { id: 'qn1', type: QuestionType.ESSAY, points: 20, answers: [] },
        ],
        passingScore: 60,
      } as unknown as Quiz;

      const attempt = { id: 'at1', quizId: 'q1', userId: 'u1' } as QuizAttempt;
      mockQuizRepo.findOne.mockResolvedValue(quiz);
      mockAttemptRepo.create.mockReturnValue(attempt);
      mockAttemptRepo.save.mockResolvedValue(attempt);
      const answerEntity = { attemptId: 'at1', questionId: 'qn1' };
      mockAttemptAnswerRepo.create.mockReturnValue(answerEntity);
      mockAttemptAnswerRepo.save.mockResolvedValue(answerEntity);

      await service.submitAttempt('q1', 'u1', [{ questionId: 'qn1', answer: 'My essay...' }]);

      expect(attempt.isGraded).toBe(false);
    });

    it('skips answers for unknown questionIds', async () => {
      const quiz = {
        id: 'q1',
        questions: [
          { id: 'qn1', type: QuestionType.MULTIPLE_CHOICE, points: 5, answers: [] },
        ],
        passingScore: 60,
      } as unknown as Quiz;

      const attempt = { id: 'at1' } as QuizAttempt;
      mockQuizRepo.findOne.mockResolvedValue(quiz);
      mockAttemptRepo.create.mockReturnValue(attempt);
      mockAttemptRepo.save.mockResolvedValue(attempt);

      // Submit answer for a question that doesn't exist on the quiz
      await service.submitAttempt('q1', 'u1', [{ questionId: 'unknown-id', answer: 'x' }]);

      expect(mockAttemptAnswerRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('gradeEssay', () => {
    it('updates essay answer points and recalculates attempt score', async () => {
      const attemptAnswer = { attemptId: 'at1', questionId: 'qn1', points: 0 } as QuizAttemptAnswer;
      const attempt = {
        id: 'at1',
        quiz: { questions: [{ points: 20 }] },
        answers: [{ points: 15 }],
        score: 0,
        isGraded: false,
      } as unknown as QuizAttempt;

      mockAttemptAnswerRepo.findOne.mockResolvedValue(attemptAnswer);
      mockAttemptAnswerRepo.save.mockResolvedValue(attemptAnswer);
      mockAttemptRepo.findOne.mockResolvedValue(attempt);
      mockAttemptRepo.save.mockResolvedValue({ ...attempt, score: 75, isGraded: true });

      await service.gradeEssay('at1', 'qn1', 15, 'Good work');

      expect(attemptAnswer.points).toBe(15);
      expect(attempt.score).toBe(75); // 15/20 * 100
      expect(attempt.isGraded).toBe(true);
      expect(attempt.feedback).toBe('Good work');
    });
  });
});
