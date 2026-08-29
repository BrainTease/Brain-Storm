import { TypeOrmProgressRepository } from './typeorm-progress.repository';
import { Progress } from '../progress/progress.entity';

const mockTypeOrmRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
});

describe('TypeOrmProgressRepository', () => {
  let repo: TypeOrmProgressRepository;
  let orm: ReturnType<typeof mockTypeOrmRepo>;

  beforeEach(() => {
    orm = mockTypeOrmRepo();
    repo = new TypeOrmProgressRepository(orm as any);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should call findOne with id', async () => {
      const progress = { id: '1' } as Progress;
      orm.findOne.mockResolvedValue(progress);

      const result = await repo.findById('1');

      expect(orm.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toBe(progress);
    });

    it('should return null if not found', async () => {
      orm.findOne.mockResolvedValue(null);
      expect(await repo.findById('missing')).toBeNull();
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

    it('should return the progress record when found', async () => {
      const progress = { id: '1', userId: 'user-1', courseId: 'course-1' } as Progress;
      orm.findOne.mockResolvedValue(progress);

      const result = await repo.findByUserAndCourse('user-1', 'course-1');

      expect(result).toBe(progress);
    });
  });

  describe('findByUser', () => {
    it('should return all progress records for a user sorted by updatedAt DESC', async () => {
      const records = [{ id: '1' }, { id: '2' }] as Progress[];
      orm.find.mockResolvedValue(records);

      const result = await repo.findByUser('user-1');

      expect(orm.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { updatedAt: 'DESC' },
      });
      expect(result).toBe(records);
    });
  });

  describe('countCompletedByUser', () => {
    it('should count records where completedAt is not null', async () => {
      orm.count.mockResolvedValue(3);

      const result = await repo.countCompletedByUser('user-1');

      expect(orm.count).toHaveBeenCalled();
      expect(result).toBe(3);
    });
  });

  describe('save', () => {
    it('should save directly when id exists (update path)', async () => {
      const entity = { id: '1', progressPct: 50 } as Partial<Progress>;
      orm.save.mockResolvedValue(entity);

      await repo.save(entity);

      expect(orm.save).toHaveBeenCalledWith(entity);
      expect(orm.create).not.toHaveBeenCalled();
    });

    it('should create then save for new entities (no id)', async () => {
      const data = { userId: 'u', courseId: 'c', progressPct: 25 } as Partial<Progress>;
      const created = { ...data, id: 'new' } as Progress;
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
      const entity = { id: '1' } as Progress;
      orm.remove.mockResolvedValue(entity);

      const result = await repo.remove(entity);

      expect(orm.remove).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });
});
