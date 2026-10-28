# Lab 4 Peer Review Record

## Reviewer Identity

- **Reviewer:** [REVIEWER NAME]
- **Date:** 2026-10-28
- **Pull Request:** [PR LINK]
- **Approval Status:** [APPROVAL: pending]

---

## Review Feedback & Resolution Matrix

| Item # | Category | Review Feedback / Issue | Resolution & Changes Made | Resolution Commit | Status |
|---|---|---|---|---|---|
| 1.1 | Must fix | **Rollback step and `_prisma_migrations` history:** Rollback SQL leaves `_prisma_migrations` out of sync. Observe real Prisma behavior with `migrate resolve --rolled-back`, document working sync procedure in §7.3, and add concrete assertion in `migration.test.ts`. | Tested on isolated `toktickit_test`. Observed Prisma reject `--rolled-back` with `P3012` (migration not in failed state) and `P3011` on short name. Documented working procedure (`DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261025024500_add_action_taken_and_reopened_at';`) in `docs/lab-04/specification.md` §7.3. Added concrete assertion verifying row absence from `_prisma_migrations` in `server/tests/lab-04/migration.test.ts`. | `f655dd3`, `8403087` | Resolved |
| 1.2 | Must fix | **Pre-existing Lab 2 failure transparency:** Do not edit Lab 2 tests. Prove failure predates Issue 2 on a `lab4-staging` worktree, investigate root cause, prepare PR disclaimer paragraph with evidence, and keep REG-02 `Pending` in `docs/lab-04/tests.md`. | Verified on separate `lab4-staging` worktree. Captured raw failure (`AssertionError: expected 'string' to be 'number'` at line 18). Traced cause via `git log -S` to Lab 3 commit `4f699e2f9ca3eb517f394d3d404113e4dd40c0f1` where `User.id` was migrated from autoincrement integer to UUID string. Added disclaimer note to REG-02 in `docs/lab-04/tests.md` and left status as `Pending`. | `f655dd3` | Resolved |
| 1.3 | Must fix | **Peer review record:** Update `docs/lab-04/reviewer.md` with structured feedback matrix and resolutions. | Documented all Must fix, Should fix, and Note items with commit hashes, test results, and status tracking under placeholders `[REVIEWER NAME]`, `[PR LINK]`, `[APPROVAL: pending]`. | `82de5d2` | Resolved |
| 2.1 | Should fix | **Cleanup placeholder migration.sql:** Check `server/prisma/migrations/data/migration.sql`. Delete if placeholder added during Issue 2. | Confirmed via `git log` that commit `d828239` added `server/prisma/migrations/data/migration.sql` with only a placeholder comment. Safely deleted the file while preserving `migrate-requesters.ts`. | `6803539` | Resolved |
| 2.2 | Should fix | **Inspect `declare module ... requesterUser: any` in `server/src/prisma.ts`:** Try removing it; if compilation breaks, document Lab 2 context. | Tested removal: running `npx tsc --noEmit` fails with `TS2339` in `tests/lab-02/requesters.api.test.ts` (lines 30, 42). Restored declaration and isolated with detailed explanatory comments documenting Lab 2 backward compatibility. | `11372a8` | Resolved |
| 2.3 | Should fix | **Business-rule citations:** Ensure `actionDateTime >= ticket.createdAt` is cited as BR-05 and `Ticket.updatedAt >= action.createdAt` as BR-15. | Corrected and verified citations across `docs/lab-04/tests.md` (REG-04, API-01) and `server/tests/lab-04/seed.test.ts`. | `f655dd3`, `8403087` | Resolved |
| 2.4 | Should fix | **Lab 3 vs seed verification:** Run seed against dev setup, then run Lab 3 suite (`npx vitest run tests/lab-03`). Report exact results and database used. | Executed `npm run prisma:seed` against dev database `toktickit` (from `server/.env`). Ran `npx vitest run tests/lab-03`: 11 test files passed, 84 tests passed (100%). Confirmed no assertion broken. | Verified | Resolved |
| 2.5 | Should fix | **Database isolation statement:** State explicitly that migration, rollback, and seed-idempotency tests ran only against isolated `toktickit_test` database. | Verified and documented that REG-01 and REG-04 execute strictly against `toktickit_test` without resetting or wiping dev database `toktickit`. | Verified | Resolved |
| 3.1 | Note | **Operational note on seed upserts:** Verify ticket numbers and overwritten fields in `server/prisma/seed.ts` for PR description. | Verified in `server/prisma/seed.ts` that tickets `TKT-2026-000101` through `TKT-2026-000109` are upserted, overwriting `summary`, `description`, `requestedPriority`, `itPriority`, `status`, `isRequesterResolved`, `reopenedAt`, `ownerId`, and `updatedAt`. Formatted note for PR text. | Verified | Resolved |
