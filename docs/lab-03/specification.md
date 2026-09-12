# Sprint 3 Engineering Specification: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

## 1. Sprint Goal
Elevate the TokTickIT system into a production-ready application by replacing the temporary Development Requester selector with real Authentication (Email/Password) and Role-Based Access Control (RBAC) supporting three roles: Requester, IT Staff, and Administrator. This sprint also introduces a Ticket Queue and Ticket management workflow for IT Staff, communication via Public Comments / Internal Notes, and a Minimalist User Management screen for Administrators — while fully preserving the existing Requester functionality delivered in Lab 2.

## 2. Stakeholder Request
"The temporary Requester selector was useful for development, but the system now needs real users. Replace it with secure login. Administrators need a simple User Management screen where they can view users, create an account, assign one role, update basic account information, activate or deactivate an account, and set a new initial password. A user signing in with an initial password must choose a new password before entering the application. Requesters must continue using the ticket functions built in Lab 2, but the current Requester must now come from the authenticated account. IT Staff need a professional Ticket Queue where they can find work, open Ticket Detail, claim or reassign a Ticket, set IT Priority, communicate with the Requester through Public Comments, record private Internal Notes, and update the Ticket through its permitted workflow. Requesters may indicate that a problem appears resolved, but IT Staff remain responsible for formally resolving or closing the Ticket. Protect every API and screen according to role and ownership. Hiding a button is not authorization. Continue using the Zen Green design language and reusable components established in Lab 2."

## 3. Scope

**In-Scope:**
* **Authentication & Session:** Email/Password login, logout (session invalidation), retrieving the current authenticated user (`/api/auth/me`), and mandatory password change on first login (`mustChangePassword`)
* **Role-Based Authorization:** Server-side enforcement of permissions for 3 roles: Requester, IT Staff, Administrator (1 user has exactly 1 role)
* **Requester Migration & Regression:** Remove the Requester selector; use Authenticated Identity as the source of truth for Ticket and Attachment ownership carried over from Lab 2
* **IT Staff Ticket Queue:** Ticket list table display, Search, Filter, Sort, and Pagination
* **IT Staff Ticket Operations:** Claim and Reassign a ticket, adjust IT Priority, change status per the Status Transition Matrix, and receive the Requester Resolved signal
* **Collaboration:** Public Comments (accessible to Requester/Staff/Admin) and Internal Notes (restricted to Staff/Admin), both append-only
* **Minimalist Administrator User Management:** User list, search by name/email, filter by role, create a new user with an initial password, edit basic account info, activate/deactivate accounts, reset initial password, plus supporting safety constraints
* **Data Evolution & Idempotent Seed Data:** Evolving the existing schema, preserving existing Lab 2 data, and required seed data sets

**Explicitly Excluded:**
* Any real email delivery (e.g., password reset links, invite emails, notifications)
* Multi-Factor Authentication (MFA), OAuth, Social Login, Single Sign-On (SSO)
* Self-registration
* Recording IT Actions Taken (deferred to Lab 4)
* SLA calculation, escalation rules, notification engine
* User deletion (hard delete), bulk user operations, import/export, audit logs
* Multiple roles per user, department/organizational structures, profile photos

---

## 4. Functional Requirements (FR)
* **FR-01 (Login):** The system must authenticate users via email and password; if valid and the account is Active, it must issue a session/token.
* **FR-02 (Mandatory Password Change):** The system must check the `mustChangePassword` flag and must not allow access to the main application until a new password has been successfully set.
* **FR-03 (Logout & Session Revocation):** The system must support logout by destroying or rejecting that session/token on subsequent requests.
* **FR-04 (Current Authenticated User):** The system must provide an endpoint that returns the current user's data (ID, Name, Email, Role, mustChangePassword).
* **FR-05 (Requester Operations):** Requesters must be able to create, view, and manage their own tickets and attachments, always identified from the server session.
* **FR-06 (Staff Ticket Queue):** IT Staff and Administrators can view the full ticket queue, with Search, Filter, Sort, and Pagination (Admin access is for Audit/Support purposes).
* **FR-07 (Ownership Management):** Only IT Staff can Claim a ticket or Reassign a ticket to another Active IT Staff or Administrator.
* **FR-08 (IT Priority Management):** Only IT Staff can adjust `itPriority` without affecting the original `requestedPriority`.
* **FR-09 (Status Transition):** Only IT Staff can change a ticket's status in accordance with the State Transition Matrix.
* **FR-10 (Requester Resolution Indication):** The Requester who owns a ticket must be able to indicate that their problem appears resolved.
* **FR-11 (Public Comments):** Any user with access to a ticket must be able to read and post Public Comments.
* **FR-12 (Internal Notes):** Only IT Staff and Administrators can read and create Internal Notes.
* **FR-13 (User Listing & Filtering):** Administrators must be able to view the user list, search by name or email, and filter by role.
* **FR-14 (User Creation & Editing):** Administrators must be able to create a new user with one role and an initial password, and edit name, email, role, and Active/Inactive status.
* **FR-15 (Reset Initial Password):** Administrators must be able to set a new initial password for a user, forcing a password change on next login.

---

## 5. Business Rules (BR)

### Authentication & Account Rules
* **BR-01 (Active Account Authentication):** Only a user with Active status (`isActive = true`) and valid credentials may successfully authenticate.
* **BR-02 (Mandatory Password Change Interception):** A user with `mustChangePassword = true` is denied access to all business endpoints except the password-change and logout endpoints.
* **BR-03 (Generic Failure Feedback):** When login credentials are invalid or the account is Inactive, the system must return a generic error (e.g., "Invalid email or password") without revealing whether the email exists in the system or whether the account is suspended.
* **BR-04 (Login Attempt Policy):** The system authenticates using credentials only. For Sprint 3, no account lockout or rate-limiting is implemented after consecutive failed login attempts, consistent with the explicit exclusion in item 4.2 of the requirements.
* **BR-05 (Session / Token Invalidation):** When a user logs out, that session or token must be cleared and cannot be used for any further API requests.
* **BR-06 (Current Identity Trust):** The current user endpoint (`/api/auth/me`) must reflect the latest state in the database; if the account is deactivated during an active session, that session must be revoked immediately.
* **BR-07 (Password Complexity):** Passwords must be at least 8 characters long, containing uppercase, lowercase, a number, and at least one special character; a new password must not match the previous password.

### Authorization & Identity Rules
* **BR-08 (Server-Side Identity Determination):** The identity of the requesting user must always come from the authenticated session as verified on the server. The system must never trust a `requesterId` or `userId` supplied by the client in the request body or query parameters.
* **BR-09 (Requester Data Isolation & Resource Protection):** A Requester may only view and manage tickets and attachments they own. If a user attempts to access another user's ticket, the system must always respond with HTTP 404 Not Found, to prevent leaking whether the resource or Ticket ID exists in the system.
* **BR-10 (Single Role Policy):** Each user account may have exactly one role, chosen from: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.

### Ticketing & Workflow Rules
* **BR-11 (Ticket Ownership Assignment):** Each ticket may have at most one primary Ticket Owner, who must be an Active user with the role `IT_STAFF` or `ADMINISTRATOR`. A user with the `REQUESTER` role, or an Inactive user, cannot be assigned as ticket owner. A newly created ticket may remain Unassigned (Ticket Owner is null).
* **BR-12 (Priority Decoupling):** `requestedPriority` is recorded as submitted by the Requester at ticket creation and cannot be edited. `itPriority` initially copies `requestedPriority` and can only be changed by IT Staff.
* **BR-13 (Valid Status Set):** A ticket's status must be one of the following values only: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
* **BR-14 (Status Transition Governance):** Status changes must be performed by IT Staff and must follow the permitted state machine only:
  * `NEW` → `OPEN` (upon owner assignment or when investigation begins), `CANCELLED`
  * `OPEN` → `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  * `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  * `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  * `RESOLVED` → `CLOSED`, `REOPENED`
  * `CLOSED` and `CANCELLED` are terminal states; no further transitions are allowed.
* **BR-15 (Requester Resolution Limitation):** A Requester cannot directly set a ticket's status to `RESOLVED` or `CLOSED`. They may only signal "Problem Appears Resolved" (`isRequesterResolved = true`), which the system records for IT Staff to formally review and close.

### Comments & Notes Rules
* **BR-16 (Public Comments Visibility):** Public Comments are accessible to the ticket's owning Requester, IT Staff, and Administrators.
* **BR-17 (Internal Notes Confidentiality):** Internal Notes are visible and manageable only by users with the role `IT_STAFF` or `ADMINISTRATOR`. If a Requester requests them, the system must respond with HTTP 403 Forbidden and must not expose any note data whatsoever.
* **BR-18 (Append-Only Audit):** Public Comments and Internal Notes are append-only; editing or deletion is not permitted.
* **BR-19 (Author & Timestamp Immutability):** The author (`authorId`) and creation time (`createdAt`) of Comments and Notes must be recorded from server context only. Content must be between 1 and 2,000 characters and must not be empty or whitespace-only.

### Administrator & Safety Rules
* **BR-20 (Unique Email):** A user's email address must be unique across the system, case-insensitively.
* **BR-21 (Role Value Validation):** When creating or editing a user account, the `role` value must exactly match a defined enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`). Any other or invalid value must be rejected with HTTP 400 Bad Request.
* **BR-22 (No Hard Delete):** User accounts may not be deleted from the database. Suspension must be performed only via `isActive = false`.
* **BR-23 (Self-Deactivation Prevention):** An Administrator cannot deactivate their own account.
* **BR-24 (Last Active Administrator Protection):** The system must not allow deactivating or changing the role of the last remaining Active Administrator.
* **BR-25 (Initial Password Reset Enforcement):** When an Administrator sets a new initial password for a user, the system must immediately set `mustChangePassword = true` for that account.
* **BR-26 (Admin Operational Boundary):** Administrators have Read-Only access to ticket data, for system auditing purposes only. If an Administrator attempts to Claim a ticket, Reassign a ticket, edit IT Priority, or change ticket status, the system must reject the request with HTTP 403 Forbidden.

---

## 6. UI Specification Summary
*(See full screen structure, color tokens, and responsive behavior in `docs/lab-03/ui-spec.md`)*

* **Design Language & Shell:** Continues the **Zen Green** theme, using deep green/natural tones, clean white space, and standardized badges by role (Requester: blue, IT Staff: green, Admin: purple) and ticket status. The top navigation bar shows only menus permitted for the current role, along with the current user's name and role, and a Logout button.
* **Screen Modes & User Feedback:**
  * **Login & Mandatory Password Change:**
    * *Login:* Form with Email, Password fields, with safe feedback on incorrect credentials.
    * *First-login Change Password:* Form with temporary password, new password, confirm password, plus a real-time password-complexity checklist.
  * **IT Staff Ticket Queue:**
    * Responsive table structure (full table on Desktop / card layout on Mobile)
    * Ticket search field, dropdown filters (Category, IT Priority, Status), sort controls, and pagination controls
    * Loading spinner, Empty state, No-results state, and Error alert feedback
  * **IT Staff Ticket Detail:**
    * Clear information grouping: ticket header, description, requester, assignment info
    * Claim / Reassign mechanism and dropdowns for `itPriority` and Status, for IT Staff
    * Public Comments tab (standard green) and Internal Notes tab (orange/yellow warning color to prevent accidental cross-posting)
  * **Administrator User Management:**
    * User list screen with a "+ Create User" button, search by name/email, and role filter
    * Modal or side sheet for Create User and Edit User, with a toggle switch for Active status and a Reset Initial Password action
* **Responsive Breakpoints:**
  * Desktop (≥ 1024px): full multi-column table, all data shown
  * Tablet (768px - 1023px): reduce non-essential columns, adjust padding and grid
  * Mobile (< 768px): table converts to card list, collapsible hamburger navigation, full-width forms

---

## 7. Data Changes
This builds on the Lab 2 PostgreSQL and Prisma ORM design, preserving existing data relationships.

### 7.1. Prisma Schema Evolution
```prisma
enum Role {
  REQUESTER
  IT_STAFF
  ADMINISTRATOR
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TicketStatus {
  NEW
  OPEN
  IN_PROGRESS
  WAITING_FOR_REQUESTER
  RESOLVED
  CLOSED
  REOPENED
  CANCELLED
}

model User {
  id                 String          @id @default(uuid())
  name               String
  email              String          @unique
  passwordHash       String
  role               Role            @default(REQUESTER)
  isActive           Boolean         @default(true)
  mustChangePassword Boolean         @default(false)
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  // Relationships
  requestedTickets   Ticket[]        @relation("TicketRequester")
  ownedTickets       Ticket[]        @relation("TicketOwner")
  publicComments     PublicComment[]
  internalNotes      InternalNote[]

  @@index([email])
  @@index([role])
}

model Ticket {
  id                  String          @id @default(uuid())
  ticketNumber        String          @unique
  title               String
  description         String
  categoryId          String
  category            Category        @relation(fields: [categoryId], references: [id])
  relatedSystemId     String?
  relatedSystem       RelatedSystem?  @relation(fields: [relatedSystemId], references: [id])

  requesterId         String
  requester           User            @relation("TicketRequester", fields: [requesterId], references: [id])

  ownerId             String?
  owner               User?           @relation("TicketOwner", fields: [ownerId], references: [id])

  requestedPriority   TicketPriority  @default(LOW)
  itPriority          TicketPriority  @default(LOW)
  status              TicketStatus    @default(NEW)
  isRequesterResolved Boolean         @default(false)

  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  attachments         Attachment[]
  publicComments      PublicComment[]
  internalNotes       InternalNote[]

  @@index([requesterId])
  @@index([ownerId])
  @@index([status])
  @@index([itPriority])
  @@index([createdAt])
}

model PublicComment {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  content   String   @db.Text
  createdAt DateTime @default(now())

  @@index([ticketId])
}

model InternalNote {
  id        String   @id @default(uuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  content   String   @db.Text
  createdAt DateTime @default(now())

  @@index([ticketId])
}
```

### 7.2. Indexing Strategy
* `User(email)`: speeds up user lookup during login and enforces the unique-email check.
* `Ticket(status, itPriority, ownerId)`: supports Filter, Sort, and Pagination on the IT Staff Ticket Queue.
* `PublicComment(ticketId)` and `InternalNote(ticketId)`: supports fast retrieval of conversation and internal notes per Ticket ID.

### 7.3. Migration Strategy from Lab 2
* Convert existing Requester records from Lab 2 into the `User` table with `role = REQUESTER`, a bcrypt-hashed default password, and `mustChangePassword = true`.
* Correctly link existing Ticket `requesterId` values to the corresponding `User.id`.
* Existing tickets receive default values: `itPriority = requestedPriority`, `ownerId = null`, and `isRequesterResolved = false`.

### 7.4. Seed Data Requirements
The system must include an idempotent seed script (`prisma/seed.ts`) that is safe to re-run, containing at minimum the following data per Lab 3 requirements:

**Requester Accounts (at least 4 Active + 1 Inactive):**
* `req.active1@toktickit.local` (Active, Regular)
* `req.active2@toktickit.local` (Active, Regular)
* `req.active3@toktickit.local` (Active, Regular)
* `req.active4@toktickit.local` (Active, `mustChangePassword = true` for testing first login)
* `req.inactive@toktickit.local` (Inactive, for testing login blocking)

**IT Staff Accounts (at least 3 Active + 1 Inactive):**
* `staff.alex@toktickit.local` (Active)
* `staff.sarah@toktickit.local` (Active)
* `staff.david@toktickit.local` (Active)
* `staff.inactive@toktickit.local` (Inactive)

**Administrator Accounts (at least 1 Active for User Management testing):**
* `admin.main@toktickit.local` (Active)
* `admin.secondary@toktickit.local` (Active, to test last-active-admin protection)

**Realistic Tickets:**
* Sample tickets distributed across all statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `CANCELLED`)
* Distributed across all priority levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
* Includes both assigned tickets (`ownerId != null`) and unassigned ones

**Sample Comments & Notes:**
* Some tickets have Public Comments simulating conversation between Requester and IT Staff
* Some tickets have Internal Notes for Staff/Admin, without exposing any real sensitive information

---

## 8. API Contract Summary
*(See full request/response payloads, schema validation, and cookie/token structure in `docs/lab-03/api-spec.md`)*

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Authenticates via email/password and sets a session cookie/token |
| POST | `/api/auth/logout` | Authenticated | Logs out and invalidates the current session/token |
| GET | `/api/auth/me` | Authenticated | Returns the current user's profile, role, and mandatory-password-change flag |
| POST | `/api/auth/change-password` | Authenticated | Sets a new password (clears the mustChangePassword flag) |
| GET | `/api/tickets` | Requester | Retrieves only tickets owned by the current user (Lab 2 continued) |
| POST | `/api/tickets` | Requester | Creates a new ticket, bound to the server-session identity |
| GET | `/api/tickets/:id` | Requester (Owned), Staff, Admin | Retrieves ticket details and attachments (Admin: read-only) |
| PATCH | `/api/tickets/:id/resolve-indication` | Requester (Owned) | Signals that the problem appears resolved |
| GET | `/api/staff/queue` | IT Staff, Admin | Retrieves the Ticket Queue with search, filter, sort, pagination (Admin: read-only audit) |
| PATCH | `/api/staff/tickets/:id/assign` | IT Staff only | Claims or reassigns ticket ownership to an Active Staff/Admin user (Admin: 403 Forbidden) |
| PATCH | `/api/staff/tickets/:id/priority` | IT Staff only | Updates the itPriority value (Admin: 403 Forbidden) |
| PATCH | `/api/staff/tickets/:id/status` | IT Staff only | Changes status per the state transition rules (Admin: 403 Forbidden) |
| GET | `/api/tickets/:id/comments` | Requester (Owned), Staff, Admin | Retrieves all Public Comments on the ticket |
| POST | `/api/tickets/:id/comments` | Requester (Owned), Staff, Admin | Adds a new Public Comment (append-only) |
| GET | `/api/tickets/:id/internal-notes` | IT Staff, Admin | Retrieves Internal Notes (Requester: 403 Forbidden) |
| POST | `/api/tickets/:id/internal-notes` | IT Staff, Admin | Adds a new Internal Note (Requester: 403 Forbidden) |
| GET | `/api/admin/users` | Administrator | Retrieves the full user list, searchable by name/email and filterable by role |
| POST | `/api/admin/users` | Administrator | Creates a new user account with one role and an initial password |
| PATCH | `/api/admin/users/:id` | Administrator | Edits name, email, role, and Active/Inactive status |
| POST | `/api/admin/users/:id/reset-password` | Administrator | Sets a new initial password and forces a password change on next login |

---

## 9. Acceptance Criteria
* **AC-01 (Valid Authentication):** Given an Active user submits a correct email and password, when they log in, then the system must return their identity data, role, and a session/token successfully.
* **AC-02 (Invalid / Inactive Login):** Given invalid login data or an Inactive account, when login is attempted, then the system must return a generic error such as "Invalid email or password" (HTTP 401) without revealing the account's status.
* **AC-03 (Mandatory Password Change Barrier):** Given a user with `mustChangePassword = true` logs in successfully, then the system must block access to normal ticket screens and allow only the change-password action via `/api/auth/change-password` or logout.
* **AC-04 (Session Logout Invalidation):** Given a user sends a logout request, when the session is invalidated, then any subsequent API request using the old session must receive HTTP 401.
* **AC-05 (Server Identity Enforcement & Resource Protection):** Given a Requester creates or retrieves a ticket, then the system must always reference `User.id` from the server identity, and if they attempt to access a ticket they do not own, the system must respond with HTTP 404 Not Found.
* **AC-06 (Staff Queue Querying):** Given IT Staff or Admin queries the Queue with search terms, filters (Category, Status, IT Priority), sort order, and page/limit parameters, then the system must return the correct ticket list and pagination metadata.
* **AC-07 (Ownership Assignment):** Given IT Staff Claims or Reassigns a ticket to an Active Staff or Admin user, then the system must correctly update `ownerId`, and must reject assignment to an Inactive user or a Requester.
* **AC-08 (IT Priority Decoupling):** Given IT Staff edits a ticket's `itPriority`, when the update succeeds, then the original `requestedPriority` value must remain unchanged.
* **AC-09 (Status Transition Compliance):** Given a status change follows the defined State Machine, then the system must allow and record it; given an invalid transition (e.g., jumping directly from `NEW` to `RESOLVED`), then the system must reject it with HTTP 400 Bad Request.
* **AC-10 (Requester Resolution Signaling):** Given the owning Requester clicks "Problem Appears Resolved," then the system must successfully record `isRequesterResolved = true`, while the ticket's `status` must not automatically change to `RESOLVED`.
* **AC-11 (Public Comments Access):** Given the owning Requester, IT Staff, or Admin, they must be able to successfully post and read Public Comments on the ticket.
* **AC-12 (Internal Notes Authorization Barrier):** Given a Requester attempts to retrieve or post Internal Notes via the API, then the system must respond with HTTP 403 Forbidden and must not expose any note content.
* **AC-13 (Admin User Listing & Filtering):** Given an Administrator queries the user list, then the system must return correct results filtered by search keyword and/or role.
* **AC-14 (Duplicate Email Rejection):** Given an Admin creates or edits a user with an email address already in use, then the system must reject the request with HTTP 409 Conflict or a clear validation error.
* **AC-15 (Invalid Role Value Rejection):** Given an Admin submits a `role` value that does not match the defined enum, then the system must reject the request with HTTP 400 Bad Request.
* **AC-16 (Admin Self-Deactivation Prevention):** Given an Admin attempts to set their own account to `isActive = false`, then the system must reject the request with HTTP 400 Bad Request and preserve the original status.
* **AC-17 (Last Active Admin Protection):** Given an Admin attempts to deactivate or change the role of the last remaining Active Administrator, then the system must reject the request with an error stating that at least one Active Admin must remain.
* **AC-18 (Initial Password Reset Flag):** Given an Admin resets a user's initial password, then that account must have `mustChangePassword = true`, and the user must be forced to change their password immediately upon logging in with the new credential.
* **AC-19 (Admin Operational Restriction):** Given an Administrator sends a PATCH request to `/api/staff/tickets/:id/assign`, `/priority`, or `/status`, then the system must respond with HTTP 403 Forbidden and must not allow the operational data to be modified.

---

## 10. Definition of Done (DoD)
* **Specification & Contract:** `specification.md`, `ui-spec.md`, `api-spec.md`, and `tests.md` are complete and committed as evidence before the main implementation begins.
* **Database & Migration:** Prisma schema updates succeed, database migration runs while preserving all existing Lab 2 data, and seed data runs safely and idempotently.
* **Backend & Security:** All endpoints strictly enforce Authentication and server-side Authorization according to the Authorization Matrix, without relying solely on UI-level validation.
* **Requester Regression:** All Requester ticket create/view/manage functionality from Lab 2 continues to work fully after removing the temporary selector.
* **Zen Green UI & Usability:** Login, Change Password, IT Staff Queue, IT Staff Detail, and Admin User Management screens follow the Zen Green component guidelines and pass responsive testing on Desktop, Tablet, and Mobile.
* **Test Coverage:** Unit tests, API/Integration tests, Component tests, and Playwright E2E tests all pass (100% passing) on the main branch.
* **Traceability & Delivery:** Code review recorded in `reviewer.md`, AI prompts recorded in `ai-use.md`, all artifacts/screenshots collected as specified, and compiled into the required 9-Part PDF report.

---

## 11. Assumptions and Decisions

### 11.1. Authorization Matrix and Role Responsibilities

**Separation of duties between IT Staff and Administrator:**
Handout item 4.3 states: *"Administrator and IT Staff responsibilities should remain conceptually separate... An Administrator does not automatically need to perform IT Staff Ticket operations unless the approved authorization matrix explicitly permits it."*

**Decision:** For Sprint 3, Administrators are granted Read-Only access to the ticket queue and to Ticket/Comments/Notes details, for system auditing and support purposes. However, Administrators are **not** permitted to perform day-to-day ticket operations such as claiming a ticket for themselves or changing its status.

**Administrator's eligibility as a Ticket Owner (per item 4.5):**
Handout item 4.5 states: *"Each Ticket may have one primary Ticket Owner who is an active IT Staff or Administrator user."*

**Decision:** The system allows a Ticket Owner to be either an Active `IT_STAFF` or Active `ADMINISTRATOR` user (to support special cases where an administrator is assigned for review). However, if a ticket is assigned to an Admin, that Admin account remains subject to the same Read-Only operational policy — they cannot claim other tickets, or change IT Priority or Ticket Status themselves.

**Authorization Matrix:**

| Resource / Action | Requester | IT Staff | Administrator |
|---|---|---|---|
| Login / Logout / Change Own Password | Yes | Yes | Yes |
| Create Ticket | Yes | No (403) | No (403) |
| View Owned Tickets & Attachments | Yes (Owned only) | Yes (All) | Yes (All) |
| View Staff Ticket Queue | No (403) | Yes | Yes (Audit View) |
| Claim / Reassign Ownership | No (403) | Yes | No (403 Forbidden) |
| Update IT Priority | No (403) | Yes | No (403 Forbidden) |
| Transition Ticket Status | No (403) | Yes | No (403 Forbidden) |
| Indicate Problem Resolved | Yes (Owned only) | No | No |
| Post Public Comment | Yes (Owned only) | Yes | Yes |
| View / Post Internal Notes | No (403 Forbidden) | Yes | Yes (Audit / Note) |
| User Management (CRUD, Reset PW) | No (403 Forbidden) | No (403 Forbidden) | Yes |

### 11.2. Authentication & Session Strategy
* **Session Storage:** HTTP-Only, Secure, `SameSite=Lax` cookies are used to store the token/session, to protect against Cross-Site Scripting (XSS) attacks compared to storing tokens in LocalStorage.
* **Password Hashing:** bcrypt (salt rounds = 10) is used to hash passwords; plaintext storage is never permitted.

### 11.3. Requester Resolution Flow
When a Requester clicks "Problem Appears Resolved," the ticket's `status` is not changed to `RESOLVED` directly. Instead, the system records the flag `isRequesterResolved = true` and automatically adds a notification Public Comment to the ticket, so that IT Staff can review and confirm the formal transition to `RESOLVED` or `CLOSED`.