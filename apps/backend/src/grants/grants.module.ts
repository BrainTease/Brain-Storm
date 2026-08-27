/**
 * #809 — Grants Module
 *
 * Registers both `GrantsBusinessService` (domain rules) and `GrantsService`
 * (persistence) so they are available for injection throughout the module.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Grant } from './grant.entity';
import { GrantsService } from './grants.service';
import { GrantsBusinessService } from './grants-business.service';
import { GrantsController } from './grants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Grant])],
  providers: [GrantsBusinessService, GrantsService],
  controllers: [GrantsController],
  exports: [GrantsService, GrantsBusinessService],
})
export class GrantsModule {}
