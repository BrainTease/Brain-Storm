import { Test } from '@nestjs/testing';
import { UserResolver } from './user.resolver';
import { DataLoaderProvider } from '../dataloader.provider';
import { UsersService } from '../../users/users.service';

describe('UserResolver & DataLoaderProvider', () => {
  let resolver: UserResolver;

  beforeAll(async () => {
    const fakeUsers = [{ id: 'u1', email: 'a@x.com' }, { id: 'u2', email: 'b@x.com' }];
    const fakeProgress = [{ id: 'p1', userId: 'u1' }, { id: 'p2', userId: 'u1' }];

    const usersRepo = { findBy: async ({ id }: any) => fakeUsers.filter((u) => id.includes(u.id)) };
    const progressRepo = { find: async ({ where }: any) => fakeProgress.filter((p) => where.userId && where.userId.includes(p.userId)) };
    const coursesRepo = { findBy: async () => [] };

    const module = await Test.createTestingModule({
      providers: [
        UserResolver,
        { provide: 'UserRepository', useValue: usersRepo },
        { provide: 'ProgressRepository', useValue: progressRepo },
        { provide: 'CourseRepository', useValue: coursesRepo },
        {
          { provide: DataLoaderProvider,
          useFactory: () => {
            // @ts-ignore
            const p = new DataLoaderProvider(usersRepo, progressRepo, coursesRepo);
            return p;
          },
        },
          { provide: UsersService, useValue: { findAll: () => ({ data: [], meta: {} }) } },
      ],
    }).compile();

    resolver = module.get(UserResolver);
  });

  it('loads user via loader', async () => {
    // @ts-ignore
    const user = await resolver.user('u1');
    expect(user).toBeDefined();
    expect(user.id).toBe('u1');
  });

  it('loads progress via loader', async () => {
    // @ts-ignore
    const res = await resolver.progress({ id: 'u1' });
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(2);
  });
});
