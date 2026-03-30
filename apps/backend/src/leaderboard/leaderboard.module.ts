import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarModule } from '../stellar/stellar.module';
import { User } from '../users/user.entity';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), StellarModule],
  providers: [LeaderboardService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
