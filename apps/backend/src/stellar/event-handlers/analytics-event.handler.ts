import { Injectable, Logger } from '@nestjs/common';
import { SorobanRpc } from '@stellar/stellar-sdk';
import { ContractEventHandler } from './contract-event.dispatcher';
import { CredentialsService } from '../../credentials/credentials.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AnalyticsEventHandler implements ContractEventHandler {
  private readonly logger = new Logger(AnalyticsEventHandler.name);

  constructor(
    private credentialsService: CredentialsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService
  ) {}

  canHandle(contractType: string, eventName: string): boolean {
    return contractType === 'analytics' && eventName === 'completed';
  }

  async handle(event: SorobanRpc.Api.EventResponse): Promise<void> {
    const value = event.value?.value?.() as any;
    const studentPublicKey: string = value?.student?.toString();
    const courseId: string = value?.course?.toString();

    if (!studentPublicKey || !courseId) {
      this.logger.warn(
        `Incomplete analytics:completed event — missing student or course`
      );
      return;
    }

    const user = await this.usersService.findByStellarPublicKey(studentPublicKey);
    if (!user) {
      this.logger.debug(
        `No user found for stellar key: ${studentPublicKey}`
      );
      return;
    }

    this.logger.log(`analytics:completed — user ${user.id}, course ${courseId}`);
    await this.credentialsService.issue(user.id, courseId, studentPublicKey);
    await this.notificationsService.onCredentialIssued(user.id, courseId);
  }
}
