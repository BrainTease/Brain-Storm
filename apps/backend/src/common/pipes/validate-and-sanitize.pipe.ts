/**
 * @deprecated — removed as part of issue #806 (standardise input validation).
 *
 * `ValidateAndSanitizePipe` duplicated the work already done by the two global
 * pipes registered in `main.ts`:
 *
 *   app.useGlobalPipes(new ValidationPipe({ whitelist: true }), new SanitizationPipe());
 *
 * The global `ValidationPipe` handles all class-validator DTO validation.
 * The global `SanitizationPipe` strips HTML and null-bytes from string values.
 *
 * Applying `ValidateAndSanitizePipe` on top would run validation twice and
 * produce inconsistent error shapes in the rare cases where both ran.
 *
 * If you need per-route validation overrides, use `@UsePipes(new ValidationPipe({...}))`
 * directly — do not recreate this pipe.
 */

export {};
