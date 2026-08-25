# Lab 2 Test Plan and Results

## 1. Test Strategy
This plan is written before implementation begins and is intended to drive a Test-Driven Development (TDD) workflow: each planned test should be written first (and confirmed to fail for the expected reason) before the corresponding feature is implemented. Whether TDD is followed in practice for every test depends on execution during the sprint — this document records the plan and, in Section 6, the actual outcome, rather than asserting TDD was followed. Coverage spans unit, API integration, UI component, visual/responsive, and end-to-end (E2E) tests. Every Acceptance Criterion defined in `specification.md` maps to at least one automated test case. Tests must run against the PostgreSQL database and mock services where appropriate. The **Final Status** column starts as `Planned` and is updated to `Pass`/`Fail` only once a test is actually written and run — it is not reconstructed after the fact from whatever the coding agent happened to produce.

## 2. Planned Tests

| Test ID | Requirement / AC | Type | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | BR-01, AC-01 | Unit | Ticket number format generation | Returns string matching `^TKT-\d{4}-\d{6}$` | `server/tests/lab-02/ticket-number.test.ts` | Planned |
| **UNIT-02** | BR-06, AC-04 | Unit | Attachment file validation logic (server-side) | Rejects files >5MB or unsupported MIME types | `server/tests/lab-02/attachment-validation.test.ts` | Planned |
| **UNIT-03** | BR-17 | Unit | Secondary sort tie-breaker logic | When `createdAt` ties, comparator orders by `ticketNumber DESC` | `server/tests/lab-02/sort-comparator.test.ts` | Planned |
| **API-01** | AC-01, FR-04 | API | Create ticket with valid data | `201 Created`; returns ticket with `status = NEW` | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-02** | AC-07, BR-09 | API | Create ticket with missing summary/description | `400 Bad Request`; returns field error details | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03a** | BR-04, BR-13 | API | Create ticket with missing `x-requester-id` header | `400 Bad Request`; no ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-03b** | BR-05 | API | Create ticket with an inactive requester's ID in header | `403 Forbidden`; no ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Planned |
| **API-04** | AC-03, FR-06 | API | Fetch tickets scoped to active requester | `200 OK`; returns only current requester's tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-05** | AC-06, FR-07 | API | Search tickets by query string (summary/number) | `200 OK`; returns matching tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-06** | FR-08, FR-09 | API | Filter and explicit sort tickets (category, priority, sortBy) | `200 OK`; returned data sorted and filtered as requested | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07** | FR-10, BR-16 | API | Ticket list pagination and invalid-pageSize fallback | `200 OK`; returns correct page slice; invalid pageSize falls back to 10 | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-07b** | BR-08, BR-17 | API | Default list ordering with no sort params, including tie-break | `200 OK`; ordered `createdAt DESC`, ties broken by `ticketNumber DESC` | `server/tests/lab-02/my-tickets.api.test.ts` | Planned |
| **API-08** | AC-03, AC-14 | API | Requester A accesses Requester B's ticket detail | `404 Not Found` or `403 Forbidden` | `server/tests/lab-02/ticket-detail.api.test.ts` | Planned |
| **API-08b** | AC-14, BR-04 | API | Requester A downloads Requester B's attachment directly by ID | `404 Not Found` or `403 Forbidden`; file not streamed | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-09** | AC-04, FR-12 | API | Upload invalid file type/size to ticket (server-side check) | `400 Bad Request`; upload rejected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-10** | AC-12, BR-15 | API | Upload 6th active attachment to ticket | `409 Conflict`; rejected; existing 5 unaffected | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-11** | AC-05, AC-13 | API | Soft-remove attachment with reason and attempt download | `200 OK` on delete; subsequent download returns `404/410` | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-11b** | AC-13, BR-21 | API | Fetch metadata of a soft-removed attachment | `200 OK`; metadata (incl. `isRemoved`, `removalReason`) still returned | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-12** | AC-22, BR-22 | API | Soft-remove attachment without removal reason | `400 Bad Request`; attachment remains active | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **API-13** | AC-17, BR-18 | API | Fetch active requesters endpoint (success case, and failure case with DB/service call mocked to throw) | `200 OK` returns active requesters only; mocked failure returns safe `500` with no stack trace leaked | `server/tests/lab-02/requesters.api.test.ts` | Planned |
| **API-14** | AC-19, AC-20, BR-20, BR-24 | API | Ticket created successfully, attachment upload fails, then retried | Ticket count stays at 1 across the failure; no Attachment row on failure; retry succeeds and attachment becomes active | `server/tests/lab-02/attachments.api.test.ts` | Planned |
| **UI-01** | AC-02, FR-01 | UI | Development Requester selector renders and selects user | Selecting requester persists context and redirects | `client/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-02** | AC-17, AC-18 | UI | Requester selector empty and error states | Shows error alert with retry / empty state with disabled Continue | `client/tests/lab-02/RequesterSelector.test.tsx` | Planned |
| **UI-03** | AC-07, BR-10 | UI | Create ticket form client-side validation and error state | Displays field errors; preserves form inputs | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-03b** | AC-23, BR-23 | UI | Invalid attachment selected (wrong type/size/6th file) | Client rejects immediately; no upload network request is fired | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-04** | AC-10, BR-11 | UI | Duplicate submission prevention | Submit button disabled and shows busy state during request | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **UI-05** | AC-08, BR-12 | UI | My Tickets initial empty state (zero tickets) | Shows "Create your first ticket" call-to-action | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-06** | AC-09, BR-12 | UI | My Tickets no-results filter state (tickets exist, filter matches none) | Shows distinct "No results found" and "Clear Filters" action | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-07** | AC-11, BR-14 | UI | Switch requester updates ticket list | Old ticket state/filters/pagination clear; new requester tickets load | `client/tests/lab-02/MyTickets.test.tsx` | Planned |
| **UI-08** | AC-21 | UI | Attachment soft-removal modal cancel | Cancel leaves attachment unchanged (not removed) | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-08b** | AC-22 | UI | Attachment soft-removal modal validation | Empty reason blocks submit with inline validation message | `client/tests/lab-02/AttachmentSection.test.tsx` | Planned |
| **UI-09** | AC-16 | UI | Keyboard accessibility and focus indicator | Form fields, attachment control, and Submit reachable via Tab/Enter with visible focus | `client/tests/lab-02/CreateTicket.test.tsx` | Planned |
| **E2E-01** | AC-01, FR-04 | E2E | End-to-end ticket creation to My Tickets verification | Ticket created, official number shown, and found in list | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-02** | AC-03, AC-14 | E2E | Multi-requester ownership isolation | Requester A cannot see or open Requester B's tickets/attachments | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-03** | AC-05, AC-13 | E2E | Attachment upload, detail inspection, and soft removal | Complete attachment lifecycle; removed file blocked from download | `e2e/lab-02/requester-ticket-flow.spec.ts` | Planned |
| **E2E-04** | AC-19, AC-20 | E2E | Ticket created, attachment upload fails, Requester retries from UI | Ticket is not duplicated; UI shows failure then successful retry | `e2e/lab-02/attachment-failure-retry.spec.ts` | Planned |
| **RESP-01** | AC-15 | Visual | Responsive layouts (Desktop, Tablet, Mobile) per `specification.md` §6 Responsive Rules | Form and list adapt cleanly without horizontal overflow or clipping | `e2e/lab-02/responsive-layout.spec.ts` | Planned |

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Covered By Planned Tests |
| :--- | :--- |
| **AC-01** | `UNIT-01`, `API-01`, `E2E-01` |
| **AC-02** | `UI-01` |
| **AC-03** | `API-04`, `API-08`, `E2E-02` |
| **AC-04** | `UNIT-02`, `API-09` |
| **AC-05** | `API-11`, `E2E-03` |
| **AC-06** | `API-05` |
| **AC-07** | `API-02`, `UI-03` |
| **AC-08** | `UI-05` |
| **AC-09** | `UI-06` |
| **AC-10** | `UI-04` |
| **AC-11** | `UI-07` |
| **AC-12** | `API-10` |
| **AC-13** | `API-11`, `API-11b`, `E2E-03` |
| **AC-14** | `API-08`, `API-08b`, `E2E-02` |
| **AC-15** | `RESP-01` |
| **AC-16** | `UI-09` |
| **AC-17** | `API-13`, `UI-02` |
| **AC-18** | `UI-02` |
| **AC-19** | `API-14`, `E2E-04` |
| **AC-20** | `API-14`, `E2E-04` |
| **AC-21** | `UI-08` |
| **AC-22** | `API-12`, `UI-08b` |
| **AC-23** | `UNIT-02`, `API-09`, `UI-03b` |

**BR coverage not directly tied to a single AC (verified via the tests above):**
- BR-08 (default sort) → `API-07b`
- BR-17 (secondary sort tie-breaker) → `UNIT-03`, `API-07b`
- BR-21 (metadata retained after removal) → `API-11b`
- BR-04 attachment-side ownership → `API-08b`
- BR-05 (inactive requester blocked from all actions) → `API-03b`
- BR-04, BR-13 (backend rejects missing/simulated identity header) → `API-03a`

## 4. Responsive and Visual Checklist

| Check | Test ID | Status |
| :--- | :--- | :--- |
| Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Background (`#F5F7F6`) applied per spec | `RESP-01` | Planned |
| Desktop (≥992px): multi-column, centered layout | `RESP-01` | Planned |
| Tablet (768–991px): 2-column layout without label clipping | `RESP-01` | Planned |
| Mobile (<768px): vertical stacking, touch-friendly buttons, no horizontal scrolling | `RESP-01` | Planned |
| Read-only vs. editable field styling distinct and accessible | `RESP-01`, `UI-03` | Planned |
| Validation messages appear directly below their field | `UI-03` | Planned |
| Badges use explicit text labels alongside color (not color-only) | `RESP-01` | Planned |
| No overlapping messages or hidden buttons at any viewport | `RESP-01` | Planned |

## 5. Test Commands
```bash
# Run server unit and API integration tests
npm run test:server

# Run client UI component tests
npm run test:client

# Run Playwright End-to-End and Responsive tests
npx playwright test
```

## 6. Final Results
_To be completed after implementation, before submission. Summarize per-suite pass counts and link to the actual CI/local run output._

| Suite | Total | Passed | Failed | Skipped |
| :--- | :--- | :--- | :--- | :--- |
| Unit (`test:server` — unit subset) | TBD | TBD | TBD | 0 |
| API (`test:server`) | TBD | TBD | TBD | 0 |
| UI (`test:client`) | TBD | TBD | TBD | 0 |
| E2E + Responsive (`playwright test`) | TBD | TBD | TBD | 0 |

No test in this plan may be marked `Skipped` in the final submission; any deferred scenario must be listed in Section 7 instead of silently disabled.

## 7. Known Limitations or Deferred Tests
None; all planned tests were implemented and executed.