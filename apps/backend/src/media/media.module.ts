import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { StorageService } from './storage.service';
import { MediaController } from './media.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  providers: [StorageService],
  controllers: [MediaController],
  exports: [StorageService],
})
export class MediaModule {}
