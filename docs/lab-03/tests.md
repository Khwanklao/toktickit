# Sprint 3 Test Specification & Traceability Matrix: TokTickIT System

## 1. Test Strategy & Overview
This document defines the Test-Driven Development (TDD) test plan and Acceptance Test Matrix for Sprint 3, covering authentication, server-side permission enforcement, IT Staff ticket management processes, and the Administrator's Minimalist User Management screen. Testing covers all 8 dimensions specified in Worksheet Item 10:

* **Unit Tests:** Verify pure logic, validation rules, and state transitions at the function level without relying on external services
* **API / Integration Tests:** Verify HTTP status, cookie handling, request/response payloads, and interaction with the real database via Prisma
* **UI Component Tests:** Test DOM behavior, state changes, form input, and interactive feedback of React components
* **UI Style & Accessibility Tests:** Verify color tokens, badges, focus states, and contrast ratio per the Zen Green Theme requirements
* **Responsive Tests:** Verify layout adaptation across breakpoints (Desktop, Tablet, Mobile), especially Mobile Card Transformation
* **Security & Authorization Tests:** Verify server-side access control, role boundaries, resource hiding, and safety constraints
* **Migration & Regression Tests:** Verify continuity of the existing schema from Lab 2, persistence of Ticket/Attachment data, and correct Requester functionality
* **End-to-End (E2E) Tests:** Verify real user journeys through a Chromium browser using Playwright, covering every role

---

## 2. Full Traceability Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Authenticate using a correct email and password for an active user | Status 200 OK, receives Set-Cookie `toktickit_session`, returns user data and role securely | `server/tests/lab-03/auth.api.test.ts` | Planned |
| NAV-01 | Component | AC-01 | Navigation Bar display based on user role (Role Navigation) | Requester sees only My Tickets/Create Ticket, IT Staff sees My Queue, Admin sees User Management | `client/tests/lab-03/Navigation.test.tsx` | Planned |
| UI-01 | Component | AC-01 | Display of the Login form and Sign In button | Form displays Email and Password fields, a functional Sign In button, and calls the handler on submit | `client/tests/lab-03/Login.test.tsx` | Planned |
| E2E-01 | E2E | AC-01 | Successful login flow for each role into the system | Successfully logs in and is redirected to that role's home page, with the Header displaying a Role Badge | `e2e/lab-03/authentication.spec.ts` | Planned |
| API-02 | API | AC-02 | Submit incorrect login data (wrong password or email not in the system) | Status 401 Unauthorized, generic error ("Invalid email or password."), no cookie issued | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-03 | API | AC-02 | Submit correct login data but the account is deactivated (`isActive = false`) | Status 401 Unauthorized, same generic error, does not reveal that the account is Inactive | `server/tests/lab-03/auth.api.test.ts` | Planned |
| UI-02 | Component | AC-02 | Display of the failure alert when a login error occurs | Red message box displays the generic error, and the Sign In button is unlocked to allow retrying | `client/tests/lab-03/Login.test.tsx` | Planned |
| E2E-02 | E2E | AC-02 | Testing a failed login on a real browser | Screen remains on `/login`, displays a red alert, no cookie is created in the browser | `e2e/lab-03/authentication.spec.ts` | Planned |
| UNIT-01 | Unit | AC-03 | Verify password boundary & complexity rules (BR-07) | Rejects passwords shorter than 8 characters, missing uppercase/lowercase/numbers/special characters, or matching the old password | `server/tests/lab-03/password-validator.test.ts` | Planned |
| API-04 | API | AC-03 | A user with `mustChangePassword = true` calls a general API (e.g., Queue or Ticket) | Status 403 Forbidden with error code `PASSWORD_CHANGE_REQUIRED` | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-05 | API | AC-03 | A user under `mustChangePassword` submits a password change request via `/api/auth/change-password` | Status 200 OK, new password saved successfully, `mustChangePassword` flag changes to false | `server/tests/lab-03/auth.api.test.ts` | Planned |
| API-05b | API | AC-03 | Submit a password change request where `currentPassword` does not match the current password in the system | Status 400 Bad Request with error code `INVALID_CURRENT_PASSWORD`, no update to the password or the `mustChangePassword` flag | `server/tests/lab-03/auth.api.test.ts` | Planned |
| UI-03 | Component | AC-03 | Real-time Password Checklist on the Change Password page | Green checkmarks update according to the rules: 8-character length, uppercase/lowercase letters, numbers, and special characters | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| UI-03b | Component | AC-03 | Error display when the Current Password is entered incorrectly | Red message box displays *"Current password is incorrect. Please try again."* below the Current Password field | `client/tests/lab-03/ChangePassword.test.tsx` | Planned |
| E2E-03 | E2E | AC-03 | Mandatory password change flow from First-login through to the main page | Log in with the initial password → forced redirect to `/change-password` → set a new password → able to access the system normally | `e2e/lab-03/authentication.spec.ts` | Planned |
| API-06 | API | AC-04 | Logging out via `/api/auth/logout` and repeated calls | Status 200 OK, cookie is cleared (`Max-Age=0`), a subsequent request using the old session receives 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | Planned |
| E2E-04 | E2E | AC-04 | Clicking Sign Out from the Profile Dropdown | Cookie is cleared from browser storage, navigates back to `/login`, pressing Back cannot return to the previous page | `e2e/lab-03/authentication.spec.ts` | Planned |
| API-07 | API | AC-05 | Requester creates a ticket while attempting to attach a fake `requesterId` in the body | The backend always retrieves identity from the real session and creates a ticket tied to the actual sender's ID in the database | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-08 | API | AC-05 | Requester attempts to access or download an attachment belonging to another user's ticket | Status 404 Not Found (Idempotent Resource Hiding for security) | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| REGR-01 | API | AC-05 | Requester operations regression from Lab 2 after removing the selector | Successfully creates a ticket, retrieves its own ticket list, and accesses attachments completely using the authenticated session | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| API-09 | API | AC-06 | IT Staff searches and filters tickets in the queue (`GET /api/staff/queue`) | Status 200 OK, ticket data correctly matches the filters (Status, IT Priority), pagination metadata is correct | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| API-10 | API | AC-06 | Submit invalid query parameters (e.g., invalid enum, page < 1) | Status 400 Bad Request with a message identifying the invalid parameter | `server/tests/lab-03/staff-queue.api.test.ts` | Planned |
| UI-04 | Component | AC-06 | Display of the Queue table and functionality of the filter controls | Displays all table columns, correct badge colors, and triggers a search event when typing in the search field | `client/tests/lab-03/StaffTicketQueue.test.tsx` | Planned |
| RESP-01 | Component | AC-06 | Responsive layout of the IT Staff Queue (Desktop Table vs Mobile Cards) | Screens ≥ 1024px display the full table, screens < 768px transform into a vertical card stack | `client/tests/lab-03/QueueResponsive.test.tsx` | Planned |
| STYLE-01 | Component | AC-06 | Correctness of Zen Green design tokens and badges | Badge colors match the UI spec table (Role, Status, Priority), and contrast ratio meets WCAG AA | `client/tests/lab-03/BadgeStyles.test.tsx` | Planned |
| API-11 | API | AC-07 | IT Staff claims or reassigns a ticket to an Active Staff/Admin | Status 200 OK, `ownerId` value updates correctly, and a ticket with status NEW is automatically changed to OPEN | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-12 | API | AC-07 | IT Staff attempts to assign a ticket to a user who is a Requester or Inactive | Status 400 Bad Request, the `ownerId` update is rejected | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| UNIT-02 | Unit | AC-08 | Independent separation of priority (Priority Decoupling Logic - BR-12) | `requestedPriority` always remains unchanged when `itPriority` is calculated or updated | `server/tests/lab-03/priority-logic.test.ts` | Planned |
| API-13 | API | AC-08 | IT Staff adjusts the ticket's `itPriority` | Status 200 OK, `itPriority` value changes, but the original `requestedPriority` remains the same | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| UNIT-03 | Unit | AC-09 | Verify State Machine Transition Logic (BR-14) including REOPENED outgoing transitions | The pure function returns true for allowed transitions (including REOPENED -> IN_PROGRESS, RESOLVED, CANCELLED) and false for transitions that violate the rules | `server/tests/lab-03/ticket-status-transition.test.ts` | Planned |
| API-14 | API | AC-09 | IT Staff changes ticket status per the State Transition Matrix (including REOPENED workflow continuation) | Status 200 OK for valid sequences (e.g., OPEN → IN_PROGRESS → RESOLVED → REOPENED → IN_PROGRESS / RESOLVED / CANCELLED) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-15 | API | AC-09 | IT Staff attempts to skip a status transition step (e.g., NEW directly to RESOLVED) | Status 400 Bad Request with a message stating Invalid Status Transition | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Planned |
| API-16 | API | AC-10 | Requester submits a request indicating the problem has been resolved (`PATCH /api/tickets/:id/resolve-indication`) | Status 200 OK, flag `isRequesterResolved = true`, creates a system comment, but status remains unchanged | `server/tests/lab-03/requester-regression.api.test.ts` | Planned |
| UI-05 | Component | AC-10 | Display of the Requester Resolution Banner | The Staff Ticket Detail screen displays a blue notification bar when the ticket has `isRequesterResolved = true` | `client/tests/lab-03/StaffTicketDetail.test.tsx` | Planned |
| API-17 | API | AC-11 | Every role with permission can send and read public comments (`POST`/`GET /comments`) | Status 201 Created, message is stored as append-only, full history is retrievable | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| STYLE-02 | Component | AC-12 | Color distinction between Comments and Internal Notes | Public Comments use the standard Zen Green color, Internal Notes use a soft yellow/orange warning background | `client/tests/lab-03/InternalNotesStyles.test.tsx` | Planned |
| API-18 | API | AC-12 | IT Staff and Admin can access and create Internal Notes | Status 200 OK / 201 Created, message is saved and Author ID is correctly identified | `server/tests/lab-03/comments-notes.api.test.ts` | Planned |
| API-19 | API | AC-12 | Requester attempts to view or post Internal Notes (`/internal-notes`) | Status 403 Forbidden, request is rejected and internal note data is never leaked | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| API-20 | API | AC-13 | Administrator retrieves the user list, searches, and filters by role (`GET /admin/users`) | Status 200 OK, returns a user list matching the search query and role filter | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| UI-06 | Component | AC-13 | Display of the Users table and the Create/Edit User modal | Table displays all columns completely, Role/Status badges are correct, form opens/closes correctly | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| RESP-02 | Component | AC-13 | Responsive layout of Admin User Management | Desktop displays the full table and side panel, Mobile displays stacked cards and a 100%-wide modal | `client/tests/lab-03/UserAdminResponsive.test.tsx` | Planned |
| API-21 | API | AC-14 | Administrator creates a new user with an email that already exists in the system | Status 409 Conflict, new account is not created | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| UI-07 | Component | AC-14 | Display of the inline conflict error when an email is duplicated | The email input field's border turns red with a warning message that the email is already in use | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| API-22 | API | AC-15 | Submit a role value that does not match the enum when creating or editing a user | Status 400 Bad Request, the save is rejected | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-23 | API | AC-16 | Administrator attempts to deactivate their own account (`isActive = false`) | Status 400 Bad Request, the system prevents updating one's own status to Inactive | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-24 | API | AC-17 | Deactivating or changing the role of the last remaining Active Administrator | Status 400 Bad Request, the system disallows this to prevent the system from being left without an administrator | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| UI-08 | Component | AC-16 | Safety defense on the Admin's Active Toggle switch | The deactivate switch is disabled with a warning message when an Admin edits themselves or is the last remaining Admin | `client/tests/lab-03/UserManagement.test.tsx` | Planned |
| API-25 | API | AC-18 | Administrator resets a user's initial password (`POST /reset-password`) | Status 200 OK, new temporary password saved successfully, and `mustChangePassword` is set to true | `server/tests/lab-03/users-admin.api.test.ts` | Planned |
| API-26 | API | AC-19 | Administrator attempts to submit a Claim, edit priority, or change a ticket's status | Status 403 Forbidden on every operational endpoint (Admin has Read-Only Audit access only) | `server/tests/lab-03/authorization.api.test.ts` | Planned |
| MIGR-01 | API | Scope | Idempotency of seed data and persistence of the original schema from Lab 2 | Seed can be run repeatedly safely, existing tickets and attachments from Lab 2 remain fully intact and correct | `server/tests/lab-03/migration-seed.test.ts` | Planned |
| E2E-05 | E2E | AC-19 | Full end-to-end ticket management by IT Staff via a real browser | Staff logs in → opens Queue → claims a ticket → changes priority → adjusts status → posts a note | `e2e/lab-03/staff-ticket-flow.spec.ts` | Planned |
| E2E-06 | E2E | AC-18 | Full end-to-end user management by Administrator via a real browser | Admin logs in → creates a new user → resets the password → verifies deactivation | `e2e/lab-03/user-administration.spec.ts` | Planned |

---

## 3. Server-Side Security & Boundary Test Details

### 3.1. Role-Based Access Barriers

**Requester Restrictions:**
* Requests access to `/api/staff/queue` → expects 403 Forbidden
* Requests access to `/api/tickets/:id/internal-notes` → expects 403 Forbidden
* Requests access to `/api/admin/users` → expects 403 Forbidden
* Views another Requester's ticket (`/api/tickets/:otherUserTicketId`) → expects 404 Not Found

**IT Staff Restrictions:**
* Requests access to `/api/admin/users` → expects 403 Forbidden

**Administrator Operational Boundaries:**
* Submits `PATCH /api/staff/tickets/:id/assign` → expects 403 Forbidden
* Submits `PATCH /api/staff/tickets/:id/priority` → expects 403 Forbidden
* Submits `PATCH /api/staff/tickets/:id/status` → expects 403 Forbidden

### 3.2. Data Integrity & Safety Constraints
* **Duplicate Email:** Prevents creating or editing a user with an email that duplicates an existing one in the system, case-insensitively (409 Conflict)
* **Last Active Administrator Defense:** The system counts the number of Administrators with `isActive = true` in the database before confirming a deactivation or role-downgrade request. If only 1 account would remain, the system immediately rejects the request (400 Bad Request)
* **Password Boundaries:** Password validation testing per BR-07 criteria must reject passwords shorter than 8 characters, missing uppercase/lowercase letters/numbers/special characters, or a new password that duplicates the old one

---

## 4. Test Execution & Evidence Commands
Commands for running the full test suite locally and on the CI/CD pipeline:

```bash
# 1. Run database migration and seed data before testing
npm run prisma:migrate
npm run prisma:seed

# 2. Run backend API, security & authorization tests
npm run test:server -- server/tests/lab-03/

# 3. Run frontend UI component, style & responsive tests
npm run test:client -- client/tests/lab-03/

# 4. Run Playwright end-to-end tests (headless)
npx playwright test e2e/lab-03/
```