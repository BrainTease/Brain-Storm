import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddSurveys1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'surveys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'courseId', type: 'uuid' },
          { name: 'title', type: 'varchar' },
          { name: 'description', type: 'text' },
          { name: 'triggerType', type: 'enum', enum: ['completion', 'milestone'], default: "'completion'" },
          { name: 'triggerMilestone', type: 'int', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'surveys',
      new TableForeignKey({
        columnNames: ['courseId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'courses',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'survey_questions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'surveyId', type: 'uuid' },
          { name: 'text', type: 'text' },
          { name: 'type', type: 'enum', enum: ['rating', 'text', 'mcq'] },
          { name: 'options', type: 'text', isNullable: true },
          { name: 'order', type: 'int' },
          { name: 'required', type: 'boolean', default: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'survey_questions',
      new TableForeignKey({
        columnNames: ['surveyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'surveys',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'survey_responses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'surveyId', type: 'uuid' },
          { name: 'userId', type: 'uuid' },
          { name: 'answers', type: 'jsonb' },
          { name: 'submittedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'survey_responses',
      new TableForeignKey({
        columnNames: ['surveyId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'surveys',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'survey_responses',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('survey_responses');
    await queryRunner.dropTable('survey_questions');
    await queryRunner.dropTable('surveys');
  }
}
