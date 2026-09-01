import { TypeOrmEnrollmentsRepository } from './typeorm-enrollments.repository';
import { Enrollment } from '../enrollments/enrollment.entity';

const mockTypeOrmRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

describe('TypeOrmEnrollmentsRepository', () => {
  let repo: TypeOrmEnrollmentsRepository;
  let orm: ReturnType<typeof mockTypeOrmRepo>;

  beforeEach(() => {
    orm = mockTypeOrmRepo();
    repo = new TypeOrmEnrollmentsRepository(orm as any);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call findOne with id', async () => {
      const enrollment = { id: '1' } as Enrollment;
      orm.findOne.mockResolvedValue(enrollment);

      const result = await repo.findById('1');

      expect(orm.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toBe(enrollment);
    });

    it('should return null if not found', async () => {
      orm.findOne.mockResolvedValue(null);
      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('findByIdWithRelations', () => {
    it('should call findOne with user and course relations', async () => {
      const enrollment = { id: '1', user: {}, course: {} } as Enrollment;
      orm.findOne.mockResolvedValue(enrollment);

      const result = await repo.findByIdWithRelations('1');

      expect(orm.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['user', 'course'],
      });
      expect(result).toBe(enrollment);
    });
  });

  describe('findByUserAndCourse', () => {
    it('should call findOne with userId and courseId', async () => {
      orm.findOne.mockResolvedValue(null);

      await repo.findByUserAndCourse('user-1', 'course-1');

      expect(orm.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', courseId: 'course-1' },
      });
    });
  });

  describe('findByUser', () => {
    it('should return enrollments sorted by enrolledAt DESC with course relation', async () => {
      const enrollments = [{ id: '1' }] as Enrollment[];
      orm.find.mockResolvedValue(enrollments);

      const result = await repo.findByUser('user-1');

      expect(orm.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['course'],
        order: { enrolledAt: 'DESC' },
      });
      expect(result).toBe(enrollments);
    });
  });

  describe('save', () => {
    it('should call save directly when id exists (update)', async () => {
      const entity = { id: '1', userId: 'u', courseId: 'c' } as Partial<Enrollment>;
      orm.save.mockResolvedValue(entity);

      await repo.save(entity);

      expect(orm.save).toHaveBeenCalledWith(entity);
      expect(orm.create).not.toHaveBeenCalled();
    });

    it('should call create then save for new entities (no id)', async () => {
      const data = { userId: 'u', courseId: 'c' } as Partial<Enrollment>;
      const created = { ...data, id: 'new' } as Enrollment;
      orm.create.mockReturnValue(created);
      orm.save.mockResolvedValue(created);

      const result = await repo.save(data);

      expect(orm.create).toHaveBeenCalledWith(data);
      expect(orm.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('remove', () => {
    it('should delegate to orm.remove', async () => {
      const entity = { id: '1' } as Enrollment;
      orm.remove.mockResolvedValue(entity);

      const result = await repo.remove(entity);

      expect(orm.remove).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });
});
