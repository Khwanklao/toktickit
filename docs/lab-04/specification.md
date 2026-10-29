# Sprint 4 Engineering Specification: TokTickIT Actions Taken, Dashboards, and Final Regression

## 1. Sprint Goal
Complete the core TokTickIT service-desk lifecycle by implementing parent-child Actions Taken tracking under Tickets, providing role-appropriate operational dashboards for Requesters and IT Staff, enforcing strict state transitions with a verified resolution gate and optimistic concurrency controls, and delivering comprehensive regression hardening across Labs 1 to 3 under the Zen Green design system.

## 2. Stakeholder Request
"The service desk can now receive Tickets and IT Staff can communicate with Requesters, but we still need a reliable way to plan and track the actual work. Add Actions Taken under each Ticket. Each action should contain Action Date/Time, Action Description, Result, Performed by (auto), Follow-Up Required?, Follow-up Note (required when follow-up is needed), Attachment Notes (what file to look for images etc.). The primary Ticket Owner remains responsible for coordinating the Ticket as a whole. Requesters may continue to indicate that the problem appears resolved, but IT Staff must review the work and formally update the Ticket. Add useful dashboards for Requesters and IT Staff, but keep them concise and connected to the detailed screens. Finally, polish and harden the complete application so that all earlier features continue to work consistently under the Zen Green design language."

## 3. Scope

### In-Scope
- **Actions Taken Domain Model & Workflow:** Parent-child model linking multiple Actions Taken records to a single Ticket. Capture action datetime, description, outcome/result, automated actor attribution, follow-up flags, mandatory follow-up notes, and attachment references.
- **Role Permissions for Actions Taken:** IT Staff and Administrators can create, view, and update Actions Taken records; Requesters can view Actions Taken on their owned tickets (Read-Only).
- **Ticket Lifecycle & Final Transition Rules:** Formal transition governance across all 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). Enforce that Requester resolution indication is purely advisory and requires formal Staff review.
- **Resolution Gate:** Transitioning any ticket to `RESOLVED` (from `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED`) strictly requires at least one valid `ActionTaken` recorded. If previously `REOPENED`, at least one action must have `createdAt > ticket.reopenedAt`.
- **Optimistic Concurrency & Safe Conflicts:** Concurrency detection using optional `expectedUpdatedAt` timestamps (compared at millisecond precision) across ticket state transitions and action updates to prevent silent overwrite of concurrent workflow updates (`409 Conflict` with code `STALE_UPDATE`). Creating an action automatically touches `Ticket.updatedAt`.
- **Role-Appropriate Operational Dashboards:**
  - **Requester Dashboard (`/api/requester/dashboard`):** Summary metric cards (`Active Tickets`, `In Progress`, `Resolved`, `Closed`), attention-required indicators (`WAITING_FOR_REQUESTER`), and recent 5 requests with direct drill-down links. Accessible strictly by `REQUESTER` role.
  - **IT Staff Dashboard (`/api/staff/dashboard`):** Operational metrics (`New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`), recent queue updates feed, and quick-action shortcuts. Accessible by `IT_STAFF` and `ADMINISTRATOR`.
  - **Administrator Dashboard:** Reuses IT Staff operational metrics with audit visibility.
- **Final Hardening & Regression:** Zero-breakage regression verification for authentication, RBAC, attachments, public comments, internal notes, and user administration. Form preservation, double-click protection, and clean error envelopes across all views.

### Explicitly Excluded
- Automatic SLA countdown timers, auto-escalation engines, on-call scheduling, and alert breach notifications.
- External notifications (Email, SMS, LINE notify, Push notifications).
- Inventory consumption, spare-parts billing, purchasing, and service cost calculations.
- Time-sheet billing, payroll, or detailed labor-cost tracking.
- Multi-tier approval workflows and electronic/digital signatures.
- Advanced BI reporting tools, arbitrary report builders, or external data warehouses.
- Multi-tenant organizations and production-scale cloud operations.
- New product features not approved in this Sprint 4 engineering contract.

## 4. Functional Requirements (FR)

- **FR-01 (Actions Taken Creation):** IT Staff and Administrators can record an Action Taken on any non-terminal ticket. The system automatically populates `performedById` from the authenticated session. Creating an action automatically updates `Ticket.updatedAt`.
- **FR-02 (Actions Taken Follow-Up Validation):** If `followUpRequired` is true, a non-empty `followUpNote` must be provided.
- **FR-03 (Actions Taken Retrieval):** IT Staff and Admins can view all Actions Taken on any ticket. Requesters can view Actions Taken only on tickets they own.
- **FR-04 (Actions Taken Update):** IT Staff and Admins can edit existing Action Taken records on non-terminal tickets. Modifying an action checks concurrency against `expectedUpdatedAt` if provided.
- **FR-05 (Staff Multi-Actor Operations):** An Action Taken may be executed and recorded by an IT Staff member different from the primary Ticket Owner.
- **FR-06 (Role Restrictions on Actions Taken):** Requesters attempting to create or edit Actions Taken are rejected with HTTP 403 Forbidden (`FORBIDDEN`). HTTP `DELETE` requests to Actions Taken endpoints from any role are rejected with HTTP 405 Method Not Allowed (`METHOD_NOT_ALLOWED`).
- **FR-07 (Requester Dashboard Metrics):** The system provides `/api/requester/dashboard` returning calculated metrics for the authenticated Requester: `activeTickets`, `inProgressTickets`, `resolvedTickets`, `closedTickets`, and the 5 most recent requests.
- **FR-08 (IT Staff Dashboard Metrics):** The system provides `/api/staff/dashboard` returning queue metrics: `newTickets`, `openTickets`, `inProgressTickets`, `waitingRequesterTickets`, `myAssignedTickets`, and recent operational queue updates.
- **FR-09 (Dashboard Drill-Down Navigation):** Every dashboard metric card and list item links directly to the corresponding filtered queue or ticket detail view with exact matching query counts.
- **FR-10 (Resolution Verification Gate):** Transitioning a ticket to `RESOLVED` requires verified action records. If no actions exist (or no actions created after reopen), the transition is blocked.
- **FR-11 (Concurrent Update Protection):** State transitions and action updates accept an optional `expectedUpdatedAt`. Stale updates return HTTP 409 Conflict (`STALE_UPDATE`).
- **FR-12 (Safe Failure & Double-Click Guard):** Form buttons disable immediately upon submission to prevent duplicate actions. Recoverable network errors preserve form state and provide a clear retry option without leaking system traces.
- **FR-13 (Full Regression Preservation):** All capabilities from Labs 1–3 (authentication, password changes, attachments, public comments, internal notes, admin user governance) must continue to pass all automated test suites.

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01 (Ticket Parent Binding & Immutability):** An Action Taken record must belong to exactly one Ticket (`ticketId` is mandatory, immutable, and references `Ticket.id`). `performedById` is immutable and cannot be reattributed.
- **BR-02 (Decoupled Actor Attribution):** The Ticket Owner coordinates the overall ticket, but any active IT Staff member or Administrator can record an Action Taken. The actor (`performedById`) is extracted directly from the session.
- **BR-03 (Follow-Up Constraint):** If `followUpRequired` is `true`, `followUpNote` must be a non-empty string between 5 and 2,000 characters. If `false`, `followUpNote` is optional or null.
- **BR-04 (Mandatory Description and Result):** `description` and `result` must each be non-empty strings between 5 and 2,000 characters (enforced at API layer).
- **BR-05 (Action Date/Time Boundaries):** `actionDateTime` defaults to current server timestamp. If supplied by client, it must satisfy two boundaries:
  - It cannot precede the ticket creation time (`actionDateTime >= ticket.createdAt`).
  - It cannot be in the future relative to server time, with a tolerance window of at most 60 seconds for clock drift (`actionDateTime <= now() + 60s`).
  - Dates exceeding this window (e.g. +5 minutes into future) or preceding ticket creation return HTTP 400 Bad Request (`INVALID_ACTION_DATE`).
- **BR-06 (Terminal Ticket Write Lock):** Actions Taken cannot be created or updated on tickets with status `CLOSED` or `CANCELLED`. Attempted writes return HTTP 400 Bad Request (`TICKET_TERMINAL`).
- **BR-07 (Append-Only Log Integrity):** Actions Taken records cannot be deleted by any role. Physical HTTP DELETE requests are rejected with HTTP 405 Method Not Allowed (`METHOD_NOT_ALLOWED`).

### Workflow & Lifecycle Rules
- **BR-08 (Permitted Ticket Statuses):** Valid statuses remain `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-09 (Staff-Only Status Transitions & Admin Boundary):** Only IT Staff can modify ticket status, assign tickets, or adjust IT priority. Administrators retain read-only audit access over ticket state transitions (HTTP 403 Forbidden), except for creating/updating Actions Taken as permitted by Handout Table 4.3.
- **BR-10 (State Transition Matrix & Automatic Assignment):**
  - `NEW` -> `OPEN` (automatic upon owner assignment or manual investigation), `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED` (subject to BR-12), `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED` (subject to BR-12), `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `REOPENED` -> `IN_PROGRESS`, `RESOLVED` (subject to BR-12), `CANCELLED`
  - `CLOSED` and `CANCELLED` are terminal states (no further transitions permitted).
  - Transitioning a ticket to `REOPENED` automatically sets `ticket.reopenedAt = now()` and resets `isRequesterResolved` to `false`.
- **BR-11 (Advisory Requester Resolution):** Setting `isRequesterResolved = true` via `PATCH /api/tickets/:id/resolve-indication` creates an automated system comment and signals readiness, but does not mutate `status`. This endpoint cannot be invoked on tickets with terminal status `CLOSED` or `CANCELLED` (returns HTTP 400 Bad Request with code `TICKET_TERMINAL`).
- **BR-12 (Resolution Gate):** Transitioning a ticket to `RESOLVED` requires that `actionsTaken.count >= 1`. If `ticket.reopenedAt` is not null, at least one action must have authoritative database creation time `createdAt > ticket.reopenedAt`. Comparing against `createdAt` ensures retrospective `actionDateTime` backdating or editing existing actions cannot bypass the gate. Actions logged by either IT Staff or Administrators are counted. Non-compliant requests are rejected with HTTP 400 Bad Request (`RESOLUTION_ACTION_REQUIRED`).

### Dashboard & Concurrency Rules
- **BR-13 (Requester Dashboard Isolation):** Metrics returned by `GET /api/requester/dashboard` are calculated exclusively where `requesterId == authenticatedUser.id`. Access by non-requesters returns HTTP 403 Forbidden (`FORBIDDEN`).
- **BR-14 (IT Staff Dashboard Aggregation):** Metrics returned by `GET /api/staff/dashboard` aggregate authoritative operational data. Access by requesters returns HTTP 403 Forbidden (`FORBIDDEN`).
- **BR-15 (Touch Parent Ticket on Action):** Creating an Action Taken must update `Ticket.updatedAt = now()` inside the same database transaction.
- **BR-16 (Optimistic Concurrency Control):** When `expectedUpdatedAt` is provided in PATCH requests for ticket status or action taken, the server compares `new Date(expectedUpdatedAt).getTime() === currentRecord.updatedAt.getTime()`. If mismatched, the request is rejected with HTTP 409 Conflict (`STALE_UPDATE`). If `expectedUpdatedAt` is omitted, validation is skipped for backward compatibility.

### 5.3 Dashboard Metric & Drill-Down Specification

| Role | Metric Card Name | Server Calculation Rule | Drill-Down URL | Supported Query Parameters |
|---|---|---|---|---|
| **Staff** | New | `status == 'NEW'` | `/staff/queue?status=NEW` | `status` |
| **Staff** | Open | `status IN ('OPEN', 'REOPENED')` | `/staff/queue?group=open` | `group=open`, `status` |
| **Staff** | In Progress | `status == 'IN_PROGRESS'` | `/staff/queue?status=IN_PROGRESS` | `status` |
| **Staff** | Waiting for Requester | `status == 'WAITING_FOR_REQUESTER'` | `/staff/queue?status=WAITING_FOR_REQUESTER` | `status` |
| **Staff** | My Assigned | `ownerId == currentUserId && status NOT IN ('CLOSED', 'CANCELLED')` | `/staff/queue?ownerId=me&activeOnly=true` | `ownerId=me`, `activeOnly=true` |
| **Requester** | Active Tickets | `requesterId == me && status IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')` | `/tickets?group=open` | `group=open` |
| **Requester** | In Progress | `requesterId == me && status == 'IN_PROGRESS'` | `/tickets?status=IN_PROGRESS` | `status` |
| **Requester** | Resolved | `requesterId == me && status == 'RESOLVED'` | `/tickets?status=RESOLVED` | `status` |
| **Requester** | Closed | `requesterId == me && status == 'CLOSED'` | `/tickets?status=CLOSED` | `status` |

*Drill-Down and Query Guard Rules:*
- On `/api/staff/queue`:
  - `group=open` matches tickets where `status IN ('OPEN', 'REOPENED')`.
  - `ownerId=me` evaluates to the authenticated user ID for both IT Staff and Administrators.
  - `activeOnly=true` filters out `CLOSED` and `CANCELLED` tickets.
- On `/api/tickets`, `group` supports only the value `open`. Providing an unapproved group value or supplying both `group` and `status` simultaneously returns HTTP 400 Bad Request (`VALIDATION_ERROR`).
- Staff "Recent Queue Updates" returns the 5 tickets ordered by `updatedAt DESC`.
- Requester "Recent Requests" returns the 5 tickets owned by requester ordered by `updatedAt DESC`. Items with `status == 'WAITING_FOR_REQUESTER'` include a `needsAttention: true` flag.

## 6. UI Specification Summary
(See complete details in `docs/lab-04/ui-spec.md`)
- **IT Staff Dashboard (`/staff/dashboard`):** 5 metric cards, recent queue feed, and quick actions.
- **Requester Dashboard (`/dashboard`):** 4 metric cards, attention required alerts, and recent requests.
- **Actions Taken Component:** Tab 3 in Ticket Detail. Timeline displays actor badge, timestamp, description, outcome, follow-up callout, and attachment note. Modal creation/editing with validation. Read-only for Requesters.

## 7. Data Changes

### 7.1 Prisma Schema Extension

```prisma
model User {
  id                  String          @id @default(uuid())
  name                String
  email               String          @unique
  passwordHash        String
  role                Role            @default(REQUESTER)
  isActive            Boolean         @default(true)
  mustChangePassword  Boolean         @default(false)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  requestedTickets    Ticket[]        @relation("TicketRequester")
  ownedTickets        Ticket[]        @relation("TicketOwner")
  sessions            Session[]
  publicComments      PublicComment[]
  internalNotes       InternalNote[]
  uploadedAttachments Attachment[]    @relation("UploadedAttachments")
  removedAttachments  Attachment[]    @relation("RemovedAttachments")
  actionsTaken        ActionTaken[]

  @@index([email])
  @@index([role])
}

model Ticket {
  id                  Int             @id @default(autoincrement())
  ticketNumber        String          @unique
  requesterId         String
  requester           User            @relation("TicketRequester", fields: [requesterId], references: [id])
  ownerId             String?
  owner               User?           @relation("TicketOwner", fields: [ownerId], references: [id])
  categoryId          Int
  category            Category        @relation(fields: [categoryId], references: [id])
  relatedSystemId     Int
  relatedSystem       RelatedSystem   @relation(fields: [relatedSystemId], references: [id])
  summary             String
  description         String
  requestedPriority   Priority
  itPriority          Priority?       @default(LOW)
  status              TicketStatus    @default(NEW)
  isRequesterResolved Boolean         @default(false)
  reopenedAt          DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  attachments         Attachment[]
  publicComments      PublicComment[]
  internalNotes       InternalNote[]
  actionsTaken        ActionTaken[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([status])
  @@index([itPriority])
  @@index([createdAt])
}

model ActionTaken {
  id               String    @id @default(uuid())
  ticketId         Int
  ticket           Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actionDateTime   DateTime  @default(now())
  description      String    @db.Text
  result           String    @db.Text
  performedById    String
  performedBy      User      @relation(fields: [performedById], references: [id])
  followUpRequired Boolean   @default(false)
  followUpNote     String?   @db.Text
  attachmentNotes  String?   @db.Text
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([ticketId, actionDateTime])
  @@index([performedById])
}
```

### 7.2 Database Design Decisions Justification
1. **UUID Identifier for ActionTaken (`id String @id @default(uuid())`):** Consistent with `PublicComment` and `InternalNote` schemas, preventing sequential ID enumeration.
2. **Nullable `reopenedAt` Column on Ticket:** Adding `reopenedAt DateTime?` provides explicit timestamp tracking when a ticket reopens. For pre-existing legacy tickets where `reopenedAt` is null, the resolution gate evaluates all historical actions taken, guaranteeing safe backward compatibility.
3. **Parent-Child Cascade Deletion on Ticket:** `ticketId` references `Ticket(id)` with `onDelete: Cascade`. Although tickets are not physically deleted in standard operations, cascade deletion aligns strictly with `PublicComment`, `InternalNote`, and `Attachment` conventions from Lab 3 and guarantees test fixtures and staging teardowns clean up cleanly.
4. **Decoupled `performedById` from `Ticket.ownerId`:** Linking `performedById` directly to `User(id)` allows multiple staff members (e.g. specialists, field techs) to log interventions independently of the primary coordinating ticket owner.
5. **Compound Index for Chronological Querying:** Added `@@index([ticketId, actionDateTime])` to optimize the exact query pattern required by the timeline: `WHERE ticketId = ? ORDER BY actionDateTime DESC`.
6. **Text Type Storage with API-Layer Length Enforcement:** Fields `description`, `result`, and `followUpNote` use `@db.Text` in PostgreSQL to avoid truncation, while validation rules (5 to 2,000 characters) are strictly enforced at the API layer.

### 7.3 Migration, Backfill & Rollback Plan

**Migration Execution**
1. Generate migration: `npx prisma migrate dev --name add_action_taken_and_reopened_at`
2. Generate Prisma client: `npx prisma generate`

**Safety Guarantee:** The migration creates table `ActionTaken` and adds the nullable column `reopenedAt` to table `Ticket`. Because `reopenedAt` is nullable with no default constraint, existing rows are unaffected and zero data loss occurs for legacy tickets.

**Rollback & Recovery Approach**

In case of deployment rollback, revert schema changes via Prisma down migration or execute:

```sql
DROP TABLE IF EXISTS "ActionTaken" CASCADE;
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "reopenedAt";
```

To bring Prisma's migration history tracking (`_prisma_migrations`) back in sync with the database schema after executing the rollback SQL, run:

```sql
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261025024500_add_action_taken_and_reopened_at';
```

*Note on Prisma synchronization:* Running `npx prisma migrate resolve --rolled-back` rejects applied migrations with error `P3012` because Prisma reserves the `--rolled-back` flag strictly for migrations in a failed state. Directly removing the migration row from `_prisma_migrations` is required so that Prisma recognizes the schema has reverted and allows future forward deployments (`prisma migrate deploy`) to reapply the migration cleanly without state drift.

Then re-generate the Prisma Client to restore previous types.

**Migration Testing & Seed Data**
- Seed verification: `npx prisma db seed` must be idempotent and safe to run repeatedly.
- Coverage in seed:
  - Realistic tickets across all 8 statuses (`NEW` through `CANCELLED`).
  - At least one ticket in `REOPENED` status with `reopenedAt` populated to verify post-reopen resolution constraints.
  - At least one ticket with status `WAITING_FOR_REQUESTER` owned by a test Requester to verify `needsAttention` flags.
  - At least one Action Taken recorded by an Administrator to verify multi-role action auditing.
  - Tickets with 0 Actions Taken, exactly 1 Action Taken, and multiple Actions Taken by different staff members.
  - Assigned and unassigned tickets.
  - At least one Requester account with zero tickets to test dashboard empty states.

## 8. REST API Increment Summary

| Method | Endpoint | Allowed Roles | Success | Error Codes | Description |
|---|---|---|---|---|---|
| GET | `/api/tickets/:id/actions` | Requester (Owned), Staff, Admin | 200 OK | NOT_FOUND, UNAUTHORIZED | Retrieve all actions for a ticket |
| POST | `/api/tickets/:id/actions` | IT Staff, Administrator | 201 Created | VALIDATION_ERROR, FORBIDDEN, NOT_FOUND, TICKET_TERMINAL, INVALID_ACTION_DATE | Create action; touches ticket `updatedAt` |
| PATCH | `/api/tickets/:id/actions/:actionId` | IT Staff, Administrator | 200 OK | VALIDATION_ERROR, FORBIDDEN, NOT_FOUND, TICKET_TERMINAL, STALE_UPDATE | Edit action; verifies concurrency |
| DELETE | `/api/tickets/:id/actions/:actionId` | All Roles | 405 Method Not Allowed | METHOD_NOT_ALLOWED | Physical deletion forbidden |
| PATCH | `/api/staff/tickets/:id/status` | IT Staff ONLY | 200 OK | VALIDATION_ERROR, FORBIDDEN, NOT_FOUND, RESOLUTION_ACTION_REQUIRED, STALE_UPDATE | Status transition with resolution gate & concurrency |
| PATCH | `/api/tickets/:id/resolve-indication` | Requester (Owned) | 200 OK | VALIDATION_ERROR, FORBIDDEN, NOT_FOUND, TICKET_TERMINAL | Advisory resolution flag & comment (Lab 3) |
| GET | `/api/requester/dashboard` | Requester ONLY | 200 OK | FORBIDDEN, UNAUTHORIZED | Requester metrics & recent requests |
| GET | `/api/staff/dashboard` | IT Staff, Administrator | 200 OK | FORBIDDEN, UNAUTHORIZED | Staff queue metrics & recent updates |
| GET | `/api/staff/queue` | IT Staff, Administrator | 200 OK | VALIDATION_ERROR, FORBIDDEN, UNAUTHORIZED | Enhanced with `group=open`, `ownerId=me`, and `activeOnly=true` |
| GET | `/api/tickets` | Requester | 200 OK | VALIDATION_ERROR, UNAUTHORIZED | Enhanced with `group=open` and `status` filter |

## 9. Acceptance Criteria & Test Traceability

- **AC-01 (Create Action Taken):** Given an authenticated IT Staff user and an active non-terminal ticket, when posting valid action details to `/api/tickets/:id/actions`, the system saves the record with `performedById` matching the authenticated user, touches `Ticket.updatedAt`, and returns HTTP 201 Created. *(Maps to API-01, E2E-01)*
- **AC-02 (Follow-up Note Enforcement):** Given `followUpRequired = true`, when `followUpNote` is omitted or shorter than 5 characters, the system rejects the request with HTTP 400 Bad Request (`VALIDATION_ERROR`). *(Maps to API-02, UI-01)*
- **AC-03 (Requester Action Restriction):** Given an authenticated Requester, when sending POST or PATCH to an action endpoint, the system rejects with HTTP 403 Forbidden (`FORBIDDEN`). *(Maps to API-03)*
- **AC-04 (Requester Action Visibility):** Given an authenticated Requester, when requesting actions for their owned ticket, they receive HTTP 200 with all actions; if requesting another user's ticket, they receive HTTP 404 Not Found (`NOT_FOUND`). *(Maps to API-04)*
- **AC-05 (Terminal Ticket Write Lock):** Given a ticket in `CLOSED` or `CANCELLED` status, when attempting to create or edit an Action Taken, or calling `resolve-indication`, the system rejects with HTTP 400 Bad Request (`TICKET_TERMINAL`). *(Maps to API-05)*
- **AC-06 (Action Date Boundary Validation):** Given an action payload with `actionDateTime`: *(Maps to API-06)*
  - When set to +30 seconds from server clock (within drift), the request succeeds (201 Created).
  - When set to +5 minutes into the future, the server rejects with HTTP 400 Bad Request (`INVALID_ACTION_DATE`).
  - When set prior to `ticket.createdAt`, the server rejects with HTTP 400 Bad Request (`INVALID_ACTION_DATE`).
- **AC-07 (Resolution Gate Enforcement):** Given a ticket in `IN_PROGRESS` or `WAITING_FOR_REQUESTER` with 0 Actions Taken, when IT Staff attempts to transition status to `RESOLVED`, the system rejects with HTTP 400 Bad Request (`RESOLUTION_ACTION_REQUIRED`). *(Maps to API-07, E2E-03)*
- **AC-08 (Resolution Gate Post-Reopen):** Given a ticket in `REOPENED` status with prior actions, when IT Staff attempts to transition to `RESOLVED` without recording a new Action Taken created after `ticket.reopenedAt`, the request is rejected with HTTP 400 Bad Request (`RESOLUTION_ACTION_REQUIRED`). Actions recorded by either Staff or Admin count toward passing the gate. *(Maps to API-08)*
- **AC-09 (Reopen State Effects):** Given a ticket transitioning to `REOPENED`, the server automatically sets `ticket.reopenedAt = now()` and resets `ticket.isRequesterResolved = false`. *(Maps to API-09)*
- **AC-10 (Optimistic Concurrency Conflict on Ticket):** Given an update payload containing a stale `expectedUpdatedAt`, the server rejects the request with HTTP 409 Conflict (`STALE_UPDATE`). When `expectedUpdatedAt` is omitted, the check is skipped. *(Maps to API-10)*
- **AC-11 (Optimistic Concurrency Conflict on Action):** Given an action edit containing a stale `expectedUpdatedAt`, the server rejects with HTTP 409 Conflict (`STALE_UPDATE`). *(Maps to API-11)*
- **AC-12 (Action Taken on Non-Existent Ticket):** Given an invalid or non-existent ticket ID in `/api/tickets/:id/actions/:actionId`, the server returns HTTP 404 Not Found (`NOT_FOUND`). *(Maps to API-12)*
- **AC-13 (Admin Operational Boundary):** Given an Administrator, when creating an Action Taken, the request succeeds (201 Created); when attempting to change ticket status, assign owner, or change IT priority, the server returns HTTP 403 Forbidden (`FORBIDDEN`). *(Maps to API-13)*
- **AC-14 (Requester Dashboard Isolation & Drill-Down):** Given an authenticated Requester, `/api/requester/dashboard` returns metrics counting only tickets where `requesterId == me`. Non-requesters receive 403 Forbidden (`FORBIDDEN`). Drill-down to `/tickets?group=open` displays exact matching active tickets. If an invalid `group` query is passed or both `group` and `status` are supplied, the server returns HTTP 400 Bad Request (`VALIDATION_ERROR`). *(Maps to API-14, UI-02, E2E-02)*
- **AC-15 (IT Staff Dashboard Aggregation & Drill-Down):** Given an authenticated IT Staff member or Administrator, `/api/staff/dashboard` returns metrics matching database queue queries. Clicking Open drill-down navigates to `/staff/queue?group=open`, and My Assigned drill-down opens `/staff/queue?ownerId=me&activeOnly=true` displaying exact matching items. If query parameters are omitted, `/api/staff/queue` preserves default Lab 3 pagination behavior. *(Maps to API-15, UI-03)*
- **AC-16 (Dashboard Zero-State Behavior):** Given a user with zero matching records, dashboards render 0 counters and informative empty feed states without errors or layout shifts. *(Maps to UI-04)*
- **AC-17 (Safe Failure & Double-Click Protection):** Action and status submit buttons enter disabled state during pending API requests. Recoverable failures render a retry banner without clearing user inputs. *(Maps to UI-05)*
- **AC-18 (Database Migration Data Preservation):** Given an existing database populated with Lab 3 tickets, running the Lab 4 migration preserves all tickets, users, comments, and attachments without corruption or loss. *(Maps to REG-01)*
- **AC-19 (Regression Verification):** All automated test suites from Labs 1, 2, and 3 pass on the main branch with 100% success rate. *(Maps to REG-02)*
- **AC-20 (Action Taken Delete Rejection):** Given any user role (Requester, Staff, or Admin), when sending an HTTP DELETE request to `/api/tickets/:id/actions/:actionId`, the server rejects with HTTP 405 Method Not Allowed (`METHOD_NOT_ALLOWED`). *(Maps to API-16)*
- **AC-21 (Optimistic Concurrency Conflict UI Notification):** Given a user performing a status change or action modification on stale data, when receiving an HTTP 409 Conflict response, the UI displays an alert banner warning of concurrent modification and provides a "Reload Latest" button. *(Maps to UI-06)*

## 10. Product Definition of Done (DoD)

- [ ] **Contracts Committed:** `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` committed to `feature/issue-1-sprint4-spec` before implementation code.
- [ ] **Schema & Migration:** Prisma schema cleanly evolved with `ActionTaken` model and `reopenedAt` column, migrations execute without data loss, idempotent seed populates realistic dashboard & action data.
- [ ] **Backend Security & Boundary:** All endpoints enforce server-side RBAC; Requesters cannot write actions; Admin operational boundary maintained per Option A; DELETE is universally rejected with 405.
- [ ] **Resolution Gate & Concurrency:** Gate rejects premature resolution with 400 (`RESOLUTION_ACTION_REQUIRED`); concurrent status and action modifications safely return HTTP 409 Conflict (`STALE_UPDATE`).
- [ ] **Zen Green UI Polish:** IT Staff and Requester Dashboards, Actions Taken list/modal on Ticket Detail adhere strictly to Zen Green design tokens across Desktop, Tablet, and Mobile with zero horizontal overflow.
- [ ] **Testing Verification:** Unit, API integration, UI component, and Playwright E2E test suites pass with 100% pass rate.
- [ ] **Regression Guarantee:** Zero regressions across all Lab 1, 2, and 3 workflows.

## 11. Assumptions and Decisions

1. **Administrator Operational Boundary (Option A Adopted):** Handout Table 4.3 allows Administrators to perform IT Staff behavior specifically regarding Actions Taken. To preserve Lab 3 regression tests (Lab 3 AC-19 expecting 403 when Admin touches assignment, priority, or status), we maintain Lab 3 BR-26 as the baseline: Administrators may record and edit Actions Taken, but operational ticket lifecycle controls (Assign, IT Priority, Status) remain restricted to IT Staff only.
2. **Resolution Gate Backward Compatibility:** The resolution gate strictly guards live status transitions (`PATCH /api/staff/tickets/:id/status`). To prevent breaking Lab 3 integration tests that transition tickets to `RESOLVED`, test fixtures in Lab 3 test suites that perform this transition are updated to create a mock Action Taken prior to resolution. For legacy tickets migrated from earlier sprints where `reopenedAt` is null, any historical action satisfies the gate as an intentional legacy data exception.
3. **Terminal Ticket Protection on Resolve Indication:** Rejecting `PATCH /api/tickets/:id/resolve-indication` on `CLOSED` or `CANCELLED` tickets with `TICKET_TERMINAL` is an intentional hardening rule introduced in Lab 4 to prevent state mutation on terminal records. Lab 3 regression suites are unaffected as existing tests execute this endpoint solely on active tickets (`OPEN` / `IN_PROGRESS`).
4. **Resolution Gate Timestamp Evaluation:** The resolution gate evaluates `ActionTaken.createdAt` rather than `actionDateTime` when checking post-reopen actions. This ensures retrospective time adjustments do not bypass workflow rules.
5. **Reopened Tickets in Operational Metrics:** On the IT Staff Dashboard, tickets in `REOPENED` status are categorized into the Open metric card, ensuring reopened work appears prominently in the active backlog for technician triage.
6. **Concurrency Scope & Intentional `updatedAt` Touch:**
   - `expectedUpdatedAt` is implemented strictly on status transitions and Action Taken modifications where cross-technician race conditions occur. Ticket assignment and priority updates retain Lab 3 signatures without concurrency locks to avoid breaking existing queue workflows.
   - Every modification to a ticket (including adding an Action Taken or submitting a Requester resolution indication) explicitly updates `Ticket.updatedAt = now()`. This intentional design ensures operational queues and "Recent Updates" dashboard feeds reflect actual technician intervention immediately.
7. **Concurrency Timestamp Precision & Optionality:** JavaScript `Date.toISOString()` and PostgreSQL `TIMESTAMP` precision differences are normalized by comparing epoch milliseconds via `.getTime()`. To preserve Lab 3 regression tests where status patches omit concurrency tokens, `expectedUpdatedAt` is evaluated only when explicitly provided in the request payload.
8. **Drill-Down Query Alignment & Backward Compatibility:**
   - `GET /api/staff/queue` is backward-compatibly enhanced to support `group=open` (matching `status IN ('OPEN', 'REOPENED')`), `ownerId=me` (matching current user ID for Staff and Admin), and `activeOnly=true`. Omitting these returns the full paginated queue as in Lab 3.
   - `GET /api/tickets` is backward-compatibly enhanced to support `group=open` and `status` filter queries. Omitting these parameters preserves default Lab 3 behavior.
9. **Timezone Standard:** Timestamps are stored in UTC on PostgreSQL and rendered formatted in Thailand local time (`Asia/Bangkok`, UTC+7) across all UI feeds.
10. **Unified Invalid Status and Transition Error Code (`VALIDATION_ERROR`):** Invalid ticket status values and invalid state transitions on `PATCH /api/staff/tickets/:id/status` return HTTP 400 with error code `VALIDATION_ERROR` and a structured `details` array across all user accounts regardless of email. This standardizes the error envelope format across the API and supersedes the legacy `BAD_REQUEST` code previously used in Lab 3 docs and tests, eliminating email-based branching and guaranteeing consistent RBAC behavior for all IT Staff members.
