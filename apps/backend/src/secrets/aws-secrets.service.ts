import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { SecretAccessLog, SecretAccessAction } from './secret-access-log.entity';

@Injectable()
export class AwsSecretsService implements OnModuleInit {
  private readonly logger = new Logger(AwsSecretsService.name);
  private client: SecretsManagerClient;

  constructor(
    private configService: ConfigService,
    @InjectRepository(SecretAccessLog) private accessLogRepo: Repository<SecretAccessLog>,
  ) {}

  onModuleInit() {
    this.client = new SecretsManagerClient({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
    });
  }

  async getSecret(secretName: string, accessedBy?: string, ipAddress?: string): Promise<string> {
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({ SecretId: secretName }),
      );
      await this.logAccess(secretName, SecretAccessAction.READ, accessedBy, ipAddress, true);
      return response.SecretString ?? '';
    } catch (err) {
      await this.logAccess(secretName, SecretAccessAction.READ, accessedBy, ipAddress, false);
      this.logger.error(`Failed to read secret ${secretName}`, err);
      throw err;
    }
  }

  async createSecret(
    secretName: string,
    secretValue: string,
    description: string,
    accessedBy?: string,
  ): Promise<string> {
    const response = await this.client.send(
      new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
        Description: description,
      }),
    );
    await this.logAccess(secretName, SecretAccessAction.WRITE, accessedBy, undefined, true);
    this.logger.log(`Secret created: ${secretName}`);
    return response.ARN ?? '';
  }

  async updateSecret(
    secretName: string,
    secretValue: string,
    accessedBy?: string,
  ): Promise<void> {
    await this.client.send(
      new UpdateSecretCommand({ SecretId: secretName, SecretString: secretValue }),
    );
    await this.logAccess(secretName, SecretAccessAction.WRITE, accessedBy, undefined, true);
    this.logger.log(`Secret updated: ${secretName}`);
  }

  async deleteSecret(secretName: string, accessedBy?: string): Promise<void> {
    await this.client.send(
      new DeleteSecretCommand({ SecretId: secretName, RecoveryWindowInDays: 30 }),
    );
    await this.logAccess(secretName, SecretAccessAction.WRITE, accessedBy, undefined, true);
    this.logger.warn(`Secret scheduled for deletion: ${secretName}`);
  }

  async listSecrets(): Promise<Array<{ name: string; arn: string; lastChangedDate?: Date }>> {
    const response = await this.client.send(new ListSecretsCommand({}));
    return (response.SecretList ?? []).map((s) => ({
      name: s.Name ?? '',
      arn: s.ARN ?? '',
      lastChangedDate: s.LastChangedDate,
    }));
  }

  async describeSecret(secretName: string): Promise<{
    arn: string;
    name: string;
    description?: string;
    lastChangedDate?: Date;
    lastRotatedDate?: Date;
    rotationEnabled: boolean;
  }> {
    const response = await this.client.send(
      new DescribeSecretCommand({ SecretId: secretName }),
    );
    return {
      arn: response.ARN ?? '',
      name: response.Name ?? '',
      description: response.Description,
      lastChangedDate: response.LastChangedDate,
      lastRotatedDate: response.LastRotatedDate,
      rotationEnabled: response.RotationEnabled ?? false,
    };
  }

  async emergencyAccess(
    secretName: string,
    accessedBy: string,
    reason: string,
    ipAddress?: string,
  ): Promise<string> {
    this.logger.warn(
      `EMERGENCY ACCESS: secret=${secretName} by=${accessedBy} reason="${reason}"`,
    );
    await this.logAccess(
      secretName,
      SecretAccessAction.EMERGENCY_ACCESS,
      accessedBy,
      ipAddress,
      true,
      reason,
    );
    return this.getSecret(secretName, accessedBy, ipAddress);
  }

  async backupSecret(secretName: string, accessedBy?: string): Promise<Record<string, unknown>> {
    const [value, meta] = await Promise.all([
      this.getSecret(secretName, accessedBy),
      this.describeSecret(secretName),
    ]);
    await this.logAccess(secretName, SecretAccessAction.BACKUP, accessedBy, undefined, true);
    this.logger.log(`Secret backed up: ${secretName}`);
    return { secretName, meta, value, backedUpAt: new Date().toISOString() };
  }

  async getAccessLogs(
    secretName?: string,
    limit = 100,
  ): Promise<SecretAccessLog[]> {
    const qb = this.accessLogRepo.createQueryBuilder('l');
    if (secretName) qb.where('l.secretName = :secretName', { secretName });
    return qb.orderBy('l.accessedAt', 'DESC').limit(limit).getMany();
  }

  private async logAccess(
    secretName: string,
    action: SecretAccessAction,
    accessedBy?: string,
    ipAddress?: string,
    success = true,
    reason?: string,
  ) {
    try {
      await this.accessLogRepo.save({
        secretName,
        action,
        accessedBy: accessedBy ?? null,
        ipAddress: ipAddress ?? null,
        success,
        reason: reason ?? null,
      });
    } catch (err) {
      this.logger.error('Failed to write secret access log', err);
    }
  }
}
