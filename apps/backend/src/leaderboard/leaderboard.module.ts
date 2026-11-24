import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CacheManagementModule } from '../cache/cache-management.module';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Progress } from '../progress/progress.entity';
import { StellarModule } from '../stellar/stellar.module';
import { User } from '../users/user.entity';

import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RedisLeaderboardController } from './redis-leaderboard.controller';
import { RedisLeaderboardService } from './redis-leaderboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Progress, Enrollment]),
    StellarModule,
    CacheManagementModule,
  ],
  providers: [LeaderboardService, RedisLeaderboardService],
  controllers: [LeaderboardController, RedisLeaderboardController],
  exports: [RedisLeaderboardService],
})
export class LeaderboardModule {}
