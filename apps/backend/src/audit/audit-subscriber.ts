import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-log.entity';

@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Called before entity insertion.
   */
  async beforeInsert(event: InsertEvent<any>) {
    await this.logChange(event.entity, event.metadata.tableName, AuditAction.CREATE, event);
  }

  /**
   * Called before entity update.
   */
  async beforeUpdate(event: UpdateEvent<any>) {
    await this.logChange(event.entity, event.metadata.tableName, AuditAction.UPDATE, event);
  }

  /**
   * Called before entity removal.
   */
  async beforeRemove(event: RemoveEvent<any>) {
    await this.logChange(event.entity, event.metadata.tableName, AuditAction.DELETE, event);
  }

  /**
   * Logs the change to the audit system.
   */
  private async logChange(
    entity: any,
    entityName: string,
    action: AuditAction,
    event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>
  ) {
    try {
      // Extract user ID from the event if available
      const userId = this.extractUserId(event);

      // Prepare metadata
      const metadata = {
        entityName,
        entityId: this.getEntityId(entity),
        changes: this.getChanges(event),
      };

      // Log the audit entry
      await this.auditService.log(
        `entity.${action.toLowerCase()}`,
        userId,
        true,
        metadata
      );
    } catch (err) {
      // Don't let audit logging errors break the main operation
      console.error('Failed to log audit entry:', err);
    }
  }

  /**
   * Extracts user ID from the event context.
   * This is a simplified implementation - in practice, you might get this from
   * the request context or other sources.
   */
  private extractUserId(event: any): string | null {
    // Try to get user ID from various possible sources
    if (event?.connection?.dataSource?.options?.extra?.userId) {
      return event.connection.dataSource.options.extra.userId as string;
    }
    
    // If we can't determine the user ID, return null (system action)
    return null;
  }

  /**
   * Gets the entity ID.
   */
  private getEntityId(entity: any): string | number | undefined {
    if (!entity) return undefined;
    
    // Try common ID field names
    return entity.id || entity._id || undefined;
  }

  /**
   * Gets the changes made in the event.
   */
  private getChanges(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>): any {
    if ('insertEvent' in event) {
      // Insert event
      return event.entity;
    } else if ('updateEvent' in event) {
      // Update event
      return {
        before: event.databaseEntity,
        after: event.entity,
      };
    } else if ('removeEvent' in event) {
      // Remove event
      return event.entity;
    }
    
    return {};
  }
}