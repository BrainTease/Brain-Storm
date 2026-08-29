# eslint-disable Audit Report

Generated: Tue Jul 28 23:19:30 WCAST 2026

## Findings

| File                                                  | Line | Rule | Reason                                                      | Justified? |
| ----------------------------------------------------- | ---- | ---- | ----------------------------------------------------------- | ---------- |
| ./apps/backend/src/app.module.ts                      | 19   | all  | eslint-disable-line @typescript-eslint/no-unused-vars       | ❓         |
| ./apps/backend/src/auth/auth.controller.ts            | 6    | all  | eslint-disable-line @typescript-eslint/no-unused-vars       | ❓         |
| ./apps/backend/src/auth/auth.controller.ts            | 7    | all  | eslint-disable-line @typescript-eslint/no-unused-vars       | ❓         |
| ./apps/backend/src/import-export/import-job.entity.ts | 39   | all  | eslint-disable-next-line @typescript-eslint/no-explicit-any | ❓         |
| ./apps/backend/src/search/search.service.ts           | 359  | all  | eslint-disable-next-line @typescript-eslint/no-explicit-any | ❓         |
| ./apps/frontend/src/app/[locale]/leaderboard/page.tsx | 210  | all  | eslint-disable-next-line @next/next/no-img-element          | ❓         |
| ./apps/frontend/src/components/layout/Navbar.tsx      | 126  | all  | eslint-disable-next-line @next/next/no-img-element          | ❓         |
| ./apps/frontend/src/hooks/useDashboardData.ts         | 116  | all  | eslint-disable-next-line react-hooks/exhaustive-deps        | ❓         |
| ./apps/frontend/src/hooks/useProgressSocket.ts        | 44   | all  | eslint-disable-next-line react-hooks/exhaustive-deps        | ❓         |

## Recommendations

1. Review each disable and add justification
2. Remove unnecessary disables
3. Replace with more specific rules where possible
4. Add comments explaining why each disable is needed
