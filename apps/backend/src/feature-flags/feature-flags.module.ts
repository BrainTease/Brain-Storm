import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './feature-flag.entity';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FlagExposureLogger } from './flag-exposure.logger';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag])],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FlagExposureLogger],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
