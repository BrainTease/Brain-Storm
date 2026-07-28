/**
 * Auth Decorators
 *
 * Centralised barrel for all custom decorators used in the auth module.
 * Import from here rather than from individual files to keep call-site imports stable.
 */

export { CurrentUser } from '../current-user.decorator';
export { Roles, ROLES_KEY } from '../roles.decorator';
