# Lab 3 — AI Use and Reflection

**LLM/agent used:** Gemini 2.5 Flash, Claude 3.5 Sonnet, ChatGPT (GPT-4o)

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
| - | ------------------- | -------------------------- |
| 1 | Standardize test discovery paths in `vite.config.ts` and resolve the dead-end state for `REOPENED` tickets in the BR-14 state machine. | Verified transition matrix logic across docs and confirmed client test paths resolved correctly. |
| 2 | Design an expand-contract data migration script (`migrate-requesters.ts`) with unique fallback emails and transactional foreign key backfills. | Executed the migration script, verified data preservation, and confirmed zero orphaned ticket references. |
| 3 | Create a pure lookup table function for the 8-state ticket transition matrix (UNIT-03) that decouples `itPriority` from `requestedPriority`. | Reviewed the state transition code and confirmed unit test assertions passed without priority side effects. |
| 4 | Resolve connection timeouts caused by running the wrong Docker database container and re-run failed E2E tests. | Switched to the correct TokTickIT database instance and verified E2E test execution. |
| 5 | Enforce concurrency and self-protection guards preventing the last active Administrator from being deactivated (BR-24). | Reviewed transaction queries, verified safety checks in `users-admin.api.test.ts`, and confirmed zero regressions. |
| 6 | Build client-side responsive breakpoints (Desktop table, Tablet drawer, Mobile cards) and a toggle disable guard for the last admin in `/admin/users`. | Validated responsive layout behavior across viewports and verified the complete flow via E2E-06. |
| 7 | Create a real-time password complexity checklist (BR-07) and remove legacy `RequesterSelector` controls from `AppShell`. | Tested real-time regex rule transitions and verified session persistence across login/logout flows. |

## Reflection

In Lab 3, AI served as an engineering assistant across the full stack, helping standardize specification documents, generate complex Prisma migration scripts, implement state machines, and structure automated test suites (Unit, Component, API, and E2E). 

While the AI was effective at generating code scaffolding that adhered to strict constraints (such as the expand-contract migration pattern and atomic transactions), human review and debugging were critical throughout development. I reviewed each generated file to verify architectural integrity, checked that database relations did not lose legacy references, and ensured security boundaries (such as preventing internal notes or password hashes from leaking) were strictly enforced. Furthermore, resolving real-world environment issues—such as identifying incorrect Docker container bindings and fixing Playwright locators across responsive viewport states—required active manual intervention. Using AI as a collaborative tool accelerated the implementation while human oversight ensured final code quality, specification compliance, and test reliability.