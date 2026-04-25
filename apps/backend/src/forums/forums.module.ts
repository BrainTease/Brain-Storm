import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../courses/course.entity';
import { ForumsController } from './forums.controller';
import { ForumsService } from './forums.service';
import { Post } from './post.entity';
import { Reply } from './reply.entity';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Post, Reply]), ModerationModule],
  providers: [ForumsService],
  controllers: [ForumsController],
})
export class ForumsModule {}
