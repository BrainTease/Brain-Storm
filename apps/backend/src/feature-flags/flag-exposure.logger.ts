import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FlagExposureLogger {
  private readonly logger = new Logger('FlagExposure');

  log(key: string, userId: string | undefined, result: boolean) {
    this.logger.log(
      JSON.stringify({ event: 'flag_exposure', key, userId, result, ts: new Date().toISOString() }),
    );
  }
}
