import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './lesson.entity';
import { SearchService } from '../search/search.service';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson) private repo: Repository<Lesson>,
    private readonly searchService: SearchService
  ) {}

  findByModule(moduleId: string) {
    return this.repo.find({ where: { moduleId }, order: { order: 'ASC' } });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async create(moduleId: string, data: Partial<Lesson>) {
    const lesson = await this.repo.save(this.repo.create({ ...data, moduleId }));
    await this.searchService.indexLesson(lesson).catch(() => {});
    return lesson;
  }

  async update(id: string, data: Partial<Lesson>) {
    const lesson = await this.findOne(id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    const updated = await this.repo.save({ ...lesson, ...data });
    await this.searchService.indexLesson(updated).catch(() => {});
    return updated;
  }

  async remove(id: string) {
    const lesson = await this.findOne(id);
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.searchService.deleteFromIndex('lessons', id).catch(() => {});
    return this.repo.remove(lesson);
  }
}
