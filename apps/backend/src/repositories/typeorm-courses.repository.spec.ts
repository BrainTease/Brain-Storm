import { Repository } from 'typeorm';

import { Course } from '../courses/course.entity';

import { TypeOrmCoursesRepository } from './typeorm-courses.repository';

/**
 * Query-count guard for course listing (N+1 prevention).
 *
 * The listing must issue the same number of database round-trips no matter
 * how many courses a page holds: one COUNT plus one SELECT with the
 * relations joined in. Per-row lookups would make the count grow with the page.
 */
const mockQueryBuilder = (rows: Course[], total: number) => {
  const qb = {
    alias: 'course',
    where: jest.fn(),
    andWhere: jest.fn(),
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    clone: jest.fn(),
    getCount: jest.fn().mockResolvedValue(total),
    getMany: jest.fn().mockResolvedValue(rows),
  };
  for (const chain of [
    qb.where,
    qb.andWhere,
    qb.leftJoinAndSelect,
    qb.orderBy,
    qb.skip,
    qb.take,
    qb.clone,
  ]) {
    chain.mockReturnValue(qb);
  }
  return qb;
};

describe('TypeOrmCoursesRepository.findAll – query count', () => {
  const buildRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `course-${i}` }) as Course);

  const run = async (limit: number) => {
    const qb = mockQueryBuilder(buildRows(limit), 1000);
    const orm = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const repo = new TypeOrmCoursesRepository(orm as unknown as Repository<Course>);
    await repo.findAll({ page: 1, limit });
    const roundTrips = qb.getCount.mock.calls.length + qb.getMany.mock.calls.length;
    return { qb, roundTrips };
  };

  it.each([1, 5, 20, 100])('uses 2 round-trips for a page of %i courses', async (limit) => {
    const { roundTrips } = await run(limit);
    expect(roundTrips).toBe(2);
  });

  it('joins relations in the single SELECT instead of loading them per row', async () => {
    const { qb } = await run(20);
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('course.modules', 'modules');
    expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('course.reviews', 'reviews');
    expect(qb.getMany).toHaveBeenCalledTimes(1);
  });
});
