import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grant } from './grant.entity';
import { GrantsService } from './grants.service';
import { GrantsController } from './grants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Grant])],
  providers: [GrantsService],
  controllers: [GrantsController],
  exports: [GrantsService],
})
export class GrantsModule {}
