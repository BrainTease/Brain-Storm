import { Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { Course } from '../courses/course.entity';

@Injectable({ scope: Scope.REQUEST })
export class DataLoaderProvider {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Progress) private progressRepo: Repository<Progress>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
  ) {}

  public readonly userLoader = new DataLoader<string, User | null>(async (ids) => {
    const rows = await this.usersRepo.findBy({ id: In(ids as string[]) });
    const map = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id as string) ?? null);
  });

  public readonly progressByUserLoader = new DataLoader<string, Progress[]>(async (userIds) => {
    const rows = await this.progressRepo.find({ where: { userId: In(userIds as string[]) } });
    const map = new Map<string, Progress[]>();
    for (const r of rows) {
      const arr = map.get(r.userId) ?? [];
      arr.push(r);
      map.set(r.userId, arr);
    }
    return userIds.map((id) => map.get(id as string) ?? []);
  });

  public readonly courseLoader = new DataLoader<string, Course | null>(async (ids) => {
    const rows = await this.coursesRepo.findBy({ id: In(ids as string[]) });
    const map = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => map.get(id as string) ?? null);
  });
}
