import { MAX_PAGE_LIMIT } from '../dto/pagination.dto';

import { toSkipTake } from './pagination.utils';

describe('toSkipTake (#1476)', () => {
  it('uses page 1 and the default limit when nothing is given', () => {
    expect(toSkipTake({})).toEqual({ skip: 0, take: 20 });
  });

  it('computes the offset from a 1-based page', () => {
    expect(toSkipTake({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
  });

  it('caps the limit at MAX_PAGE_LIMIT', () => {
    expect(toSkipTake({ limit: MAX_PAGE_LIMIT * 5 }).take).toBe(MAX_PAGE_LIMIT);
  });

  it('treats a page below 1 as page 1', () => {
    expect(toSkipTake({ page: 0, limit: 5 })).toEqual({ skip: 0, take: 5 });
  });

  it('keeps at least one row per page', () => {
    expect(toSkipTake({ limit: 0 }).take).toBe(1);
  });
});
