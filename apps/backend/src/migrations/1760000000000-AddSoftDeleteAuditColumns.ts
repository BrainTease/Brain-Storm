import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddSoftDeleteAuditColumns1760000000000 implements MigrationInterface {
  name = 'AddSoftDeleteAuditColumns1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add audit columns to users table
    await queryRunner.addColumn('users', new TableColumn({
      name: 'createdBy',
      type: 'varchar',
      isNullable: true,
    }));
    await queryRunner.addColumn('users', new TableColumn({
      name: 'updatedBy',
      type: 'varchar',
      isNullable: true,
    }));
    await queryRunner.addColumn('users', new TableColumn({
      name: 'updatedAt',
      type: 'timestamptz',
      isNullable: true,
      default: 'NOW()',
    }));

    // Add indexes to users table
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_EMAIL_DELETED_AT',
      columnNames: ['email', 'deletedAt'],
    }));
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_ROLE_DELETED_AT',
      columnNames: ['role', 'deletedAt'],
    }));
    await queryRunner.createIndex('users', new TableIndex({
      name: 'IDX_USERS_CREATED_AT',
      columnNames: ['createdAt'],
    }));

    // Add soft-delete and audit columns to courses table
    await queryRunner.addColumn('courses', new TableColumn({
      name: 'deletedAt',
      type: 'timestamptz',
      isNullable: true,
    }));
    await queryRunner.addColumn('courses', new TableColumn({
      name: 'createdBy',
      type: 'varchar',
      isNullable: true,
    }));
    await queryRunner.addColumn('courses', new TableColumn({
      name: 'updatedBy',
      type: 'varchar',
      isNullable: true,
    }));
    await queryRunner.addColumn('courses', new TableColumn({
      name: 'updatedAt',
      type: 'timestamptz',
      isNullable: true,
      default: 'NOW()',
    }));

    // Add indexes to courses table
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_PUBLISHED_DELETED_LEVEL',
      columnNames: ['isPublished', 'isDeleted', 'level'],
    }));
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_INSTRUCTOR_DELETED',
      columnNames: ['instructorId', 'isDeleted'],
    }));
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_CREATED_AT',
      columnNames: ['createdAt'],
    }));
    await queryRunner.createIndex('courses', new TableIndex({
      name: 'IDX_COURSES_LEVEL_PUBLISHED_DELETED',
      columnNames: ['level', 'isPublished', 'isDeleted'],
    }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop courses indexes
    await queryRunner.dropIndex('courses', 'IDX_COURSES_LEVEL_PUBLISHED_DELETED');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_CREATED_AT');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_INSTRUCTOR_DELETED');
    await queryRunner.dropIndex('courses', 'IDX_COURSES_PUBLISHED_DELETED_LEVEL');

    // Drop courses columns
    await queryRunner.dropColumn('courses', 'updatedAt');
    await queryRunner.dropColumn('courses', 'updatedBy');
    await queryRunner.dropColumn('courses', 'createdBy');
    await queryRunner.dropColumn('courses', 'deletedAt');

    // Drop users indexes
    await queryRunner.dropIndex('users', 'IDX_USERS_CREATED_AT');
    await queryRunner.dropIndex('users', 'IDX_USERS_ROLE_DELETED_AT');
    await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL_DELETED_AT');

    // Drop users columns
    await queryRunner.dropColumn('users', 'updatedAt');
    await queryRunner.dropColumn('users', 'updatedBy');
    await queryRunner.dropColumn('users', 'createdBy');
  }
}