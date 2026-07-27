import { Injectable } from '@nestjs/common';

/**
 * Base business logic service
 * Provides common patterns for extracting business logic from controllers
 */
@Injectable()
export abstract class BusinessLogicService {
  /**
   * Validate user authorization
   * @param userId - Current user ID
   * @param resourceOwnerId - Resource owner ID
   * @param isAdmin - Whether user is admin
   * @throws ForbiddenException if not authorized
   */
  protected validateOwnershipOrAdmin(
    userId: string,
    resourceOwnerId: string,
    isAdmin: boolean = false,
  ): void {
    if (!isAdmin && userId !== resourceOwnerId) {
      throw new Error('Forbidden: You can only access your own resources');
    }
  }

  /**
   * Validate pagination parameters
   */
  protected validatePagination(page: number = 1, limit: number = 10): { page: number; limit: number } {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 per page
    return { page: validPage, limit: validLimit };
  }

  /**
   * Calculate pagination offset
   */
  protected calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages
   */
  protected calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }
}
