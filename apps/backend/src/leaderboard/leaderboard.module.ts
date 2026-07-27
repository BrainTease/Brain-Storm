import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarModule } from '../stellar/stellar.module';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RedisLeaderboardService } from './redis-leaderboard.service';
import { RedisLeaderboardController } from './redis-leaderboard.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Progress, Enrollment]),
    StellarModule,
  ],
  providers: [LeaderboardService, RedisLeaderboardService],
  controllers: [LeaderboardController, RedisLeaderboardController],
  exports: [RedisLeaderboardService],
})
export class LeaderboardModule {}
