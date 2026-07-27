import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddMultiTenancy1728000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create organizations table
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'slug', type: 'varchar', isUnique: true },
          { name: 'name', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'logo', type: 'varchar', isNullable: true },
          { name: 'seats', type: 'integer', default: 0 },
          { name: 'usedSeats', type: 'integer', default: 0 },
          { name: 'domain', type: 'varchar', isNullable: true },
          { name: 'active', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'organizations',
      new TableIndex({
        columnNames: ['slug'],
        isUnique: true,
        name: 'IDX_organizations_slug',
      }),
    );

    // Create organization_members table
    await queryRunner.createTable(
      new Table({
        name: 'organization_members',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'organizationId', type: 'uuid' },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'role', type: 'varchar', default: "'MEMBER'" },
          { name: 'invitedEmail', type: 'varchar', isNullable: true },
          { name: 'invitePending', type: 'boolean', default: false },
          { name: 'inviteToken', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['organizationId'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
        uniques: [
          { columnNames: ['organizationId', 'userId'], name: 'UQ_org_members_org_user' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'organization_members',
      new TableIndex({
        columnNames: ['organizationId', 'role'],
        name: 'IDX_org_members_org_role',
      }),
    );

    // Create organization_billing_profiles table
    await queryRunner.createTable(
      new Table({
        name: 'organization_billing_profiles',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' },
          { name: 'organizationId', type: 'uuid' },
          { name: 'stripeCustomerId', type: 'varchar' },
          { name: 'paymentMethodId', type: 'varchar', isNullable: true },
          { name: 'monthlyBudget', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'spent', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'billingEmail', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'now()' },
          { name: 'updatedAt', type: 'timestamp', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['organizationId'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    // Add organizationId column to courses for org-scoped data
    await queryRunner.addColumn(
      'courses',
      {
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      },
    );

    await queryRunner.createForeignKey(
      'courses',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('courses', 'FK_courses_organizationId');
    await queryRunner.dropColumn('courses', 'organizationId');
    await queryRunner.dropTable('organization_billing_profiles');
    await queryRunner.dropTable('organization_members');
    await queryRunner.dropTable('organizations');
  }
}
