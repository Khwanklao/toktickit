# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a responsive, Requester-facing ticketing MVP for TokTickIT, built on the Zen Green design
system. Requesters can create tickets with attachments, browse and search their own tickets, view
ticket details, and manage attachments — all scoped to a simulated "Development Requester" identity
that stands in for real authentication until Lab 3.

## 2. Stakeholder Request Interpretation
IT needs a self-service portal where end users can log a support issue (category, related system,
priority, description, optional attachments) and track it afterward. Requesters must only ever see
their own tickets — never another Requester's data. Since real login isn't built yet, a temporary
"Development Requester" picker simulates "being logged in as" one of several seeded test users.

## 3. Scope

### Included
- Development Requester picker + session context (testing-only, not real auth)
- Create Ticket flow with client + server validation and attachment upload
- My Tickets: search, filter, multi-field sort, pagination
- Requester Ticket Detail (read-only)
- Attachment lifecycle: upload, metadata view, download, soft-removal with reason
- Ownership isolation across all of the above
- Zen Green responsive UI foundation and shared components

### Excluded
- Real authentication (passwords, sessions, tokens, login/logout)
- IT Staff dashboard, claiming/reassigning, IT priority overrides
- Public Comments, Internal Notes, Actions Taken
- Status transitions beyond initial `NEW` (resolve/close/cancel/reopen)
- Admin management of users, roles, or reference data

## 4. Functional Requirements
- **FR-01**: Provide a Development Requester selector listing only active Requesters.
- **FR-02**: Persist the selected Requester context and show their name in the app header.
- **FR-03**: Allow switching the current Development Requester at any time.
- **FR-04**: Allow the selected Requester to submit a new ticket with required fields and optional attachments.
- **FR-05**: Auto-generate a unique official Ticket Number on creation.
- **FR-06**: Show only tickets belonging to the currently selected Requester.
- **FR-07**: Support text search across Ticket Number and Summary.
- **FR-08**: Support filtering by Category, Requested Priority, and Status.
- **FR-09**: Support sorting by Created Date, Last Updated, and Ticket Number.
- **FR-10**: Support pagination with configurable page size.
- **FR-11**: Allow viewing an owned ticket's details in read-only mode.
- **FR-12**: Allow uploading permitted attachments (JPG/PNG/WEBP/PDF, ≤5MB, ≤5 active files/ticket).
- **FR-13**: Support soft-removal of attachments with a mandatory reason.
- **FR-14**: Block download/preview of soft-removed attachments while keeping their metadata visible.
- **FR-15**: Block access to another Requester's tickets or attachments.

## 5. Business Rules

- **BR-01**: The official Ticket Number is backend-generated and globally unique (`TKT-YYYY-XXXXXX`).
- **BR-02**: A new Ticket starts with `status = NEW`.
- **BR-03**: The Development Requester selector is a Lab 2 testing mechanism only — not authentication.
- **BR-04 (Ownership Isolation)**: A Requester may only view/search/open/modify tickets and attachments where `requesterId` matches their active session context. Unauthorized direct access returns `404` or `403`.
- **BR-05 (Inactive Users)**: Inactive Requesters (`isActive = false`) are excluded from the selector and cannot perform any action, even via direct API call.
- **BR-06 (Attachment Limits)**: Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`. Max size 5MB. Max 5 *active* attachments per ticket.
- **BR-07 (Soft Removal)**: Removing an attachment sets `isRemoved = true`, records `removedAt`/`removedBy`/`removalReason`; file content becomes unreachable for download/preview but metadata remains visible in the UI.
- **BR-08 (Default Sorting)**: My Tickets defaults to `createdAt DESC`.
- **BR-09 (Field Constraints)**: Summary (5–100 chars, required), Description (10–2000 chars, required), Category/Related System/Requested Priority all required. Leading/trailing whitespace is trimmed before validation and storage.
- **BR-10 (Error Preservation)**: On submission failure, all user-entered form values are preserved — no re-entry required.
- **BR-11 (Duplicate Submission Prevention)**: While a create-ticket request is in flight, the Submit button is disabled and shows a busy state; a second submission cannot be triggered until the first resolves.
- **BR-12 (Empty vs. No-Results State)**: Zero tickets overall → Empty State with a "Create your first ticket" call-to-action. Tickets exist but the current search/filter matches none → distinct No-Results State with a "Clear Filters" action. These two states must never share the same copy.
- **BR-13 (Auth Migration Readiness)**: The `x-requester-id` header and `requesterId` foreign key must be designed so Lab 3 can swap in session-derived identity without changing the `Ticket`/`Attachment` ownership schema.
- **BR-14 (Requester Switching Reload)**: Switching the Development Requester clears any loaded ticket list, active filters, and pagination state, then re-fetches data scoped to the new Requester. Stale data from the previous Requester must never remain on screen.
- **BR-15 (Attachment Limit Enforcement)**: A 6th active-attachment upload attempt is rejected client- and server-side with a clear message. Soft-removed attachments do not count toward the 5-file cap.
- **BR-16 (Pagination Defaults)**: Default page size is 10; allowed sizes are 10/25/50. An invalid requested page size silently falls back to the default rather than erroring.
- **BR-17 (Secondary Sort)**: When the primary sort field ties (e.g., identical `createdAt`), apply `ticketNumber DESC` as a tie-breaker so pagination order stays deterministic.
- **BR-18 (Requester Selection Failure)**: If the active Requester list cannot be loaded, the selector shows a safe, dismissible API-failure message with a retry action; no ticket route is accessible until a valid active Requester is selected.
- **BR-19 (No Active Requesters)**: If no active Requesters exist, the selector shows a dedicated empty state, disables Continue, and does not allow a manually entered or inactive Requester ID to become the active context.
- **BR-20 (Attachment Upload Failure)**: Ticket creation and attachment upload are treated as separate operations. If the Ticket is created successfully but an attachment upload fails, the Ticket remains saved, the failed attachment is not recorded as an active Attachment, and the UI clearly reports the failed upload and allows the Requester to retry without recreating the Ticket.
- **BR-21 (Attachment Metadata)**: Attachment metadata includes original filename, MIME type, file size, upload timestamp, removal state, and removal information when applicable. Metadata remains visible after soft removal, but removed content is never downloadable or previewable.
- **BR-22 (Attachment Removal Confirmation)**: Before soft-removing an active Attachment, the UI requires explicit confirmation and a non-empty removal reason. Canceling the confirmation leaves the Attachment unchanged.
- **BR-23 (Attachment Validation)**: Client-side validation provides immediate feedback for unsupported MIME types, files larger than 5MB, and attempts beyond five active attachments; server-side validation repeats the same checks and is authoritative.
- **BR-24 (Ticket Creation and Attachment Ordering)**: The Ticket is created first so the backend can assign the official Ticket Number and ownership. Attachments are uploaded only after successful Ticket creation. A failed attachment upload never causes a duplicate Ticket creation when the Requester retries the upload.

## 6. UI Specification Summary

Detailed visual tokens, typography, spacing, component states, accessibility rules, and screenshot-based visual checks are defined in `docs/lab-02/ui-spec.md`. This section summarizes the implementation-level UI rules that are mandatory for all Lab 2 screens.

### Application Shell
Header in Primary Green (`#006B3C`) containing the TokTickIT logo, My Tickets / Create Ticket nav,
and the current Requester's name with a "Change Requester" action. The active nav item is highlighted
with Secondary Green (`#0B7A46`).

### Shared Screen States
Every data screen (Create Ticket, My Tickets, Ticket Detail) implements: Initial, Loading (skeleton/spinner,
no layout jump), Validation Error (inline, directly under the field), API Failure (dismissible banner,
form values retained per BR-10), Success (green confirmation), and the Empty vs. No-Results split from BR-12.

### Badges
Priority badges (Requested/IT): LOW / MEDIUM / HIGH / URGENT — each pairs a color with a visible text
label (never color alone). Status badges: NEW, IN_PROGRESS, RESOLVED, CLOSED.

### Form Components
Editable fields: white background, neutral border. Read-only fields (Ticket Number, Requester): soft
gray-green background. Required fields: red asterisk plus a validation message, never the asterisk alone.
Buttons follow a Primary (filled green) / Secondary (outline) / Destructive (red outline, e.g. Remove
Attachment) hierarchy, each with visible disabled and busy states.

### Responsive Rules
Desktop (≥992px): multi-column, centered with max-width. Tablet (768–991px): two-column where practical.
Mobile (<768px): vertical stack, touch-friendly controls, no horizontal scroll. At all sizes: no clipped
labels, overlapping messages, or hidden buttons.

## 7. Data Changes (Prisma / PostgreSQL)
- **RequesterUser**: `id`, `name`, `email`, `department`, `isActive`, `createdAt`, `updatedAt`
- **Category**: `id`, `name` (unique), `isActive`
- **RelatedSystem**: `id`, `name` (unique), `isActive`
- **Ticket**: `id`, `ticketNumber` (unique), `requesterId` (FK), `categoryId` (FK), `relatedSystemId` (FK), `summary`, `description`, `requestedPriority` (enum), `itPriority` (enum, nullable), `status` (enum, default `NEW`), `createdAt`, `updatedAt`
- **Attachment**: `id`, `ticketId` (FK), `originalFileName`, `storedFileName`, `mimeType`, `fileSize`, `uploadedBy` (FK), `createdAt`, `isRemoved` (default false), `removedAt`, `removedBy` (FK, nullable), `removalReason`
- **Indexes**: `ticketNumber` (unique), `[requesterId, createdAt]`, `[requesterId, status]`

**Nullability**: `Ticket.itPriority`, `Attachment.removedAt`, and `Attachment.removedBy` are nullable because IT priority and removal metadata are not present at initial creation. `Attachment.removalReason` is nullable while `isRemoved = false` and required when `isRemoved = true`.

**Enums**: `requestedPriority` and `itPriority` use `LOW | MEDIUM | HIGH | URGENT`; `status` uses `NEW | IN_PROGRESS | RESOLVED | CLOSED`, although Lab 2 creates Tickets only with `NEW`.

**Relationships**: one `RequesterUser` has many `Ticket` records; one `Ticket` has many `Attachment` records; `Category` and `RelatedSystem` each have many `Ticket` records. `Attachment.uploadedBy` and `Attachment.removedBy` reference `RequesterUser`.

**Design decision**: `[requesterId, createdAt]` is justified because My Tickets always scopes queries by Requester and defaults to `createdAt DESC`; the index supports the ownership-filtered default listing efficiently.

**Migration decision**: the schema keeps `requesterId` as an explicit Ticket ownership foreign key so Lab 3 can replace the simulated `x-requester-id` identity source with real session-derived identity without changing `Ticket`/`Attachment` ownership relationships.

## 8. API Contract Summary

### `POST /api/tickets`
Headers: `x-requester-id: <int>` (required)
Request:
```json
{
  "categoryId": 2,
  "relatedSystemId": 5,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual...",
  "requestedPriority": "MEDIUM"
}
```
Success `201`: returns the created ticket including `ticketNumber`, `status`, `createdAt`.
Errors: `400` field-level validation array · `403` requesterId doesn't match an active Requester · `500` generic safe error (no stack trace).

### `GET /api/tickets`
Query: `search`, `category`, `priority`, `status`, `sortBy` (`createdAt|updatedAt|ticketNumber`), `sortDir` (`asc|desc`), `page`, `pageSize` (`10|25|50`, default 10).
Success `200`:
```json
{
  "data": [ { "...": "ticket" } ],
  "pagination": { "page": 1, "pageSize": 10, "totalItems": 42, "totalPages": 5 }
}
```
Invalid `sortBy`/`pageSize` fall back to defaults per BR-16/BR-17 rather than erroring.

### `GET /api/tickets/:id`
Ownership-checked. Success `200` full ticket + attachment metadata. `403/404` if not owned.

### `POST /api/tickets/:id/attachments`
Multipart upload. Success `201` attachment metadata. Errors: `400` invalid type/size, `409` if already at 5 active attachments, `403/404` ownership.
If the upload fails after Ticket creation, the API returns a safe error and does not create an Attachment record for the failed file. The client keeps the Ticket and permits a retry.

### `GET /api/attachments/:id`
Ownership-checked. Success `200` returns attachment metadata only. `403/404` if not owned or not found. Soft-removed attachments may still return metadata because metadata retention is required.

### `GET /api/attachments/:id/download`
Success `200` file stream (active only). `404/410` if soft-removed. `403/404` if not owned.

### `DELETE /api/attachments/:id`
Body: `{ "reason": "..." }` (required, non-empty). Success `200` updated metadata with `isRemoved: true`. `400` missing reason. `403/404` ownership.

### `GET /api/dev/requesters`, `GET /api/categories`, `GET /api/related-systems`
Success `200`: array of active records only (`isActive = true`).

For `GET /api/dev/requesters`, a backend failure returns `500` with a safe error message. If the response contains no active Requesters, the selector shows a dedicated empty state and disables Continue. The client must not allow an inactive or missing Requester ID to become the active context.

## 9. Acceptance Criteria
- **AC-01**: Given valid ticket data and a selected Requester, when submitted, then a ticket is saved with `status = NEW` and its unique `ticketNumber` is displayed.
- **AC-02**: Given no Requester is selected, when visiting any ticket route, then the user is redirected to Development Requester Selection.
- **AC-03**: Given Requester A is selected, when requesting a ticket owned by Requester B, then the system returns an empty result or `404`.
- **AC-04**: Given an attachment >5MB or an invalid MIME type, when uploading, then the upload is rejected with a clear inline message.
- **AC-05**: Given an active attachment, when soft-removed with a valid reason, then `isRemoved` becomes true and subsequent downloads return `404/410`.
- **AC-06**: Given search text "laptop", when filtering My Tickets, then only tickets matching summary or ticket number are returned.
- **AC-07**: Given a backend failure on ticket creation, then a readable error banner appears and all filled form fields are retained.
- **AC-08**: Given a Requester with zero tickets, when visiting My Tickets, then the Empty State (not No-Results) appears with a "Create Ticket" call-to-action.
- **AC-09**: Given a Requester with tickets but a search matching none, when searching, then the No-Results State appears, distinct from Empty, with a "Clear Filters" action.
- **AC-10**: Given a create-ticket request in progress, when Submit is clicked again, then no duplicate ticket is created and the button stays disabled/busy.
- **AC-11**: Given Requester A is viewing My Tickets, when switching to Requester B, then A's list/filters/pagination clear and B's data loads fresh.
- **AC-12**: Given a ticket already has 5 active attachments, when a 6th is uploaded, then it's rejected with a clear message and the existing 5 are unaffected.
- **AC-13**: Given an owned active attachment, when downloaded, then it succeeds; once soft-removed, a repeat download returns `404/410`.
- **AC-14**: Given Requester A directly requests a ticket/attachment ID owned by Requester B (via URL or API), then the system returns `403/404` without leaking B's data.
- **AC-15**: Given the My Tickets screen at <768px width, when viewed, then all fields remain readable as stacked cards with no horizontal scrolling.
- **AC-16**: Given a keyboard-only user, when navigating Create Ticket, then every field, the attachment control, and Submit are reachable via Tab/Enter with visible focus indicators.
- **AC-17**: Given the active-Requester API call fails, when the Development Requester Selection screen loads, then a dismissible API-failure message with a retry action is shown, and no ticket route becomes accessible.
- **AC-18**: Given zero active Requesters exist, when the Development Requester Selection screen loads, then a dedicated empty state is shown and the Continue button is disabled.
- **AC-19**: Given a Ticket is created successfully but its attachment upload fails, when the failure occurs, then the Ticket remains saved, no Attachment record exists for the failed file, and the UI clearly reports the failure with a retry option — without creating a second Ticket.
- **AC-20**: Given a Requester retries a failed attachment upload on an already-created Ticket, when the retry succeeds, then exactly one Ticket exists and the attachment is now active on it.
- **AC-21**: Given an active Attachment, when the Requester opens the remove-attachment confirmation and cancels it, then the Attachment remains unchanged (not soft-removed).
- **AC-22**: Given an active Attachment, when the Requester attempts to soft-remove it without entering a removal reason, then the removal is blocked with a validation message and the Attachment stays active.
- **AC-23**: Given an invalid attachment (wrong type, oversized, or 6th file) is selected, when validated, then the client rejects it immediately before any upload request is sent, and the server independently rejects the same case if the client check is bypassed.

## 10. Definition of Done
- All FR-01–FR-15 and BR-01–BR-24 implemented.
- Every Acceptance Criterion has passing, traceable automated tests (unit, API, UI, E2E) on `main`.
- Seed script is idempotent: 4 active + 1 inactive Requester, 4 Categories, ≥6 Related Systems.
- UI matches Zen Green spec across Desktop/Tablet/Mobile with no visual defects.
- Peer-reviewed, merged via `lab2-staging` PR, documented in `reviewer.md`.
- No required test is skipped, disabled, or commented out.
- README setup/test instructions are current and accurate.
- `ui-spec.md` and `api-spec.md` are consistent with this specification; implementation does not silently introduce undocumented behavior.

## 11. Assumptions and Decisions
- **Ticket Number Scheme**: `TKT-YYYY-XXXXXX`, generated from creation year + a zero-padded sequential counter (not purely timestamp-based, to keep numbers short and sortable).
- **Storage Strategy**: Attachments stored locally under `uploads/` with UUID-based stored filenames to avoid collisions; original filenames kept only as metadata.
- **Requester State Storage**: Client keeps `requesterId` in React Context (mirrored to `localStorage` for persistence across refresh) and sends it via the `x-requester-id` header — explicitly a simulated identity, not a security boundary.
- **Pagination default**: 10 items/page chosen as the most usable default for a support-ticket list on mobile; 25/50 offered for power users.
- **Tie-breaking sort**: `ticketNumber DESC` chosen over `id DESC` since ticket numbers are already the user-facing sortable identifier.