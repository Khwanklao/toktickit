# Lab 4 — AI Use and Reflection

**LLM/agent used:** Gemini 2.5 Flash, Claude 3.5 Sonnet, ChatGPT (GPT-4o)

## Selected key prompts

| # | Prompt (summarised) | What I did with the result |
| - | ------------------- | -------------------------- |
| 1 | Validate ticket workflow API integration test results covering resolution gates and optimistic concurrency. | Verified terminal output (18 passed), recorded test evidence for resolution gates, and confirmed concurrency conflict handling. |
| 2 | Diagnose Vitest failure caused by scanning Playwright E2E test specs and target inactive user assignment tests. | Isolated the Vitest command using environment database configurations and verified API-12 inactive assignee rejection tests. |
| 3 | Clarify requirement ambiguity regarding why the UI lacks an assignee selector dropdown despite the inactive assignee rejection criteria. | Documented the technical justification showing that TokTickIT enforces self-service claiming on the UI while backend API-12 enforces assignment integrity. |
| 4 | Resolve disabled Actions Taken tab in the Requester Ticket Detail view to comply with Lab 4 Section 8.3 read-only visibility. | Formulated instructions for the coding agent to enable the tab with strict read-only constraints (no create or edit buttons). |
| 5 | Verify IT Staff Dashboard UI elements against Section 8.1 specifications, including approved metrics cards and queue update tables. | Inspected live UI rendering, confirmed metrics card counts, and saved `staff-dashboard-overview.png` artifact. |
| 6 | Identify and capture valid drill-down navigation behavior from dashboard metric cards to filtered queue views. | Clicked through the dashboard card, verified the active filter tag (`My active tickets`), and captured the resulting filtered table state. |
| 7 | Formulate a comprehensive Playwright automation prompt to capture all required screenshot artifacts for Parts 5 and 6. | Generated E2E screenshot scripts covering empty states, safe failures, modal validations, and multi-device responsive viewports. |

## Reflection

In Lab 4, AI served as an engineering collaborator across full-stack workflow hardening, state machine validation, dashboard analytics, and evidence gathering. The AI assisted in diagnosing test configuration discrepancies, establishing clear traceability between business rules and API assertions, and formulating prompts for automated Playwright artifact generation.

While the AI was efficient at interpreting requirements and drafting technical justifications, rigorous human verification remained essential. I actively verified that UI components adhered strictly to the Zen Green design system, ensured that the self-service ticket model did not compromise role-based access control, and manually resolved UI regressions where Requester views improperly disabled access to Actions Taken history. Additionally, cross-referencing automated Vitest API-12 passes against the scoring rubric ensured that backend constraints were properly documented even when client-side controls were omitted by design. Using AI accelerated the validation and testing cycle while engineering oversight ensured complete specification compliance and system integrity.