import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImportJob } from '../import-export/import-job.entity';
import { RepositoriesModule } from '../repositories';
import { StellarModule } from '../stellar/stellar.module';

import { AccountService } from './account.service';
import { AdminUsersController } from './admin-users.controller';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ImportJob]),
    forwardRef(() => StellarModule),
    RepositoriesModule,
  ],
  controllers: [UsersController, AdminUsersController],
  providers: [UsersService, AccountService],
  exports: [UsersService, AccountService],
})
export class UsersModule {}
