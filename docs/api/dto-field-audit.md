# DTO Field Audit — users / courses / progress

_Date: 2026-09-25_

## Why

Issue: DTOs across `users/dto`, `courses/dto`, and `progress/dto` may expose
fields no longer consumed by the frontend or SDK, increasing payload size
unnecessarily. This document records the cross-reference pass against
`apps/frontend/src` and `packages/sdk` and the resulting decisions.

## Method

For every field on `UserResponseDto`, `CourseResponseDto`, and
`RecordProgressDto`, we grepped `apps/frontend/src` and `packages/sdk` for
the field name to confirm at least one live consumer before keeping it.

## Findings

### `users/dto/user-response.dto.ts`

| Field | Frontend/SDK usage | Decision |
|---|---|---|
| `id`, `email`, `role`, `isBanned`, `isVerified`, `createdAt`, `updatedAt` | Core identity fields, used throughout admin/profile UI | Keep |
| `username`, `avatar`, `bio`, `stellarPublicKey` | Profile page, wallet linking | Keep |
| `mfaEnabled` | Security settings page | Keep |
| `referralCode`, `referredBy` | `src/app/[locale]/profile/ReferralSection.tsx`, `src/components/referrals/ReferralLink.tsx`, `src/app/[locale]/profile/page.tsx` | Keep — actively consumed |

No fields were found to be dead. This DTO was already trimmed in a prior
pass (see the "Stripped fields" note at the top of the file for
`passwordHash`, `mfaSecret`, `mfaBackupCodes`, `verificationToken`,
`verificationTokenExpiresAt`, `createdBy`, `updatedBy` — none of those are
constructed on the DTO in the first place, so there is nothing further to
deprecate there).

### `courses/dto/course-response.dto.ts`

| Field | Frontend/SDK usage | Decision |
|---|---|---|
| `averageRating` | `src/components/reviews/ReviewList.tsx` | Keep |
| `requiresKyc` | `src/components/admin/AdminDashboard.tsx`, `src/lib/admin-api.ts` | Keep |
| `scheduledAt` | `src/lib/admin-api.ts` (schedule flows) | Keep |
| Remaining fields (`title`, `description`, `level`, `durationHours`, `status`, `instructorId`, `publishedAt`, `createdAt`, `updatedAt`) | Core course listing/detail UI | Keep |

Already-stripped internal fields (`isDeleted`, `deletedAt`, `isPublished`,
`createdBy`, `updatedBy`) remain correctly excluded.

### `progress/dto/record-progress.dto.ts`

This is a request DTO (`courseId`, `lessonId`, `progressPct`), not a
response DTO — every field is required input for the record-progress
endpoint and all three are read by the frontend progress tracker. Nothing
to remove.

## Outcome

No unused fields were found in this pass — the DTOs in scope were already
minimal as of the prior `#993` cleanup. Rather than remove anything, this
audit is captured as:

1. This document, so the next audit has a documented baseline and doesn't
   have to re-derive it from scratch.
2. A regression test (`apps/backend/src/__tests__/dto-field-audit.spec.ts`)
   that pins the exact field set on `UserResponseDto` and
   `CourseResponseDto`, so an accidental re-introduction of a stripped
   field (e.g. `passwordHash` leaking back onto `UserResponseDto`) fails CI
   instead of shipping.

## Process for future field removal

If a future audit finds a genuinely dead field:

1. Add `@deprecated` JSDoc above the field with the removal-target release.
2. Keep serializing it for one deprecation window so external SDK
   consumers on the previous version don't break.
3. Remove the field and update this document + the pinned field list in
   `dto-field-audit.spec.ts` in the same PR.
