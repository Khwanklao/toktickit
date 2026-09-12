# Sprint 3 REST API Specification: TokTickIT Helpdesk System

## 1. Overview & Protocol Conventions

### 1.1. Base URL & Content Type
* Base URL prefix: `/api`
* Request Body Content-Type: `application/json` (except Multipart for Attachment upload from Lab 2)
* Response Body Content-Type: `application/json`

### 1.2. Authentication, Session & Security Strategy
* **Session Storage:** Uses an HTTP-Only, Secure, SameSite=Lax cookie named `toktickit_session` to store the encrypted token/session ID
* **Session Expiration:** Sessions have a lifetime of 24 hours (TTL = 86,400 seconds) from the moment of successful authentication. Once expired, the system rejects requests and responds with `401 Unauthorized`
* **CSRF Considerations:** Setting the cookie to `SameSite=Lax` safely protects against Cross-Site Request Forgery (CSRF) attacks for state-changing requests (`POST`, `PATCH`, `DELETE`) from third-party origins in this Course Stack environment
* **Authentication Middleware:** Every request accessing a protected endpoint must pass through cookie decryption, session validation, and user lookup from the database. If the user is disabled (`isActive = false`), the session is immediately rejected (`401 Unauthorized`)
* **Mandatory Password Barrier:** If a user has `mustChangePassword = true`, the system blocks access to every endpoint except:
  * `POST /api/auth/change-password`
  * `POST /api/auth/logout`
  * `GET /api/auth/me`
  All other requests are rejected with `403 Forbidden` and error code `PASSWORD_CHANGE_REQUIRED`

### 1.3. Standard Error Envelope
All system errors are returned in the same standard JSON structure:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "A human-readable description of the error.",
    "details": []
  }
}
```

Standard Status Codes:
* `200 OK`: Request succeeded and returns result data
* `201 Created`: New resource created successfully
* `400 Bad Request`: Input validation failed / wrong query or body type / violates state transition rules
* `401 Unauthorized`: Missing cookie / expired session / invalid login credentials
* `403 Forbidden`: Authenticated but insufficient role permissions / `mustChangePassword` flag is set
* `404 Not Found`: Resource not found or attempting to access another user's ticket (Idempotent Resource Hiding)
* `409 Conflict`: Data conflicts with the database (e.g., duplicate email)
* `500 Internal Server Error`: Internal server error

---

## 2. Authentication Endpoints

### 2.1. `POST /api/auth/login`
Validates credentials and issues a session cookie for an active user

* **Access:** Public
* **Request Body:**
```json
{
  "email": "req.active1@toktickit.local",
  "password": "Password123!"
}
```
* **Response `200 OK`:**
  * Header: `Set-Cookie: toktickit_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400;`
```json
{
  "user": {
    "id": "uuid-v4",
    "name": "Alex Requester",
    "email": "req.active1@toktickit.local",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```
* **Error `401 Unauthorized`:** (Generic safe feedback for cases of incorrect email, wrong password, or `isActive = false`)
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

---

### 2.2. `POST /api/auth/logout`
Destroys the session on the server and clears the session cookie

* **Access:** Authenticated (All Roles)
* **Response `200 OK`:**
  * Header: `Set-Cookie: toktickit_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0;`
```json
{
  "message": "Successfully logged out."
}
```

---

### 2.3. `GET /api/auth/me`
Retrieves the current information and latest permission status of the logged-in user

* **Access:** Authenticated (All Roles)
* **Response `200 OK`:**
```json
{
  "user": {
    "id": "uuid-v4",
    "name": "Sarah Staff",
    "email": "staff.sarah@toktickit.local",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
}
```
* **Error `401 Unauthorized`:** When there is no cookie or the session has expired

---

### 2.4. `POST /api/auth/change-password`
Sets a new password to clear the `mustChangePassword` flag

* **Access:** Authenticated (All Roles)
* **Request Body:**
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```
* **Response `200 OK`:**
```json
{
  "message": "Password changed successfully.",
  "user": {
    "id": "uuid-v4",
    "name": "Alex Requester",
    "email": "req.active1@toktickit.local",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```
* **Error `400 Bad Request`:** (New password validation fails complexity requirements, `newPassword` does not match `confirmPassword`, or `newPassword` is the same as the old password)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters."
  }
}
```
* **Error `400 Bad Request`:** (When the submitted `currentPassword` does not match the user's current password in the system)
```json
{
  "error": {
    "code": "INVALID_CURRENT_PASSWORD",
    "message": "Current password is incorrect."
  }
}
```

---

## 3. Requester Ticketing Endpoints (Lab 2 Continuation)
> **Note on Attachments:** File attachment upload and download functionality continues to use the exact same contract and endpoints as Lab 2 (`POST /api/tickets/:id/attachments`, `GET /api/attachments/:id`), except that ownership permission is now verified via the Authenticated Requester Identity instead of the original Requester Selector.

### 3.1. `GET /api/tickets`
Retrieves the list of all tickets created by the currently authenticated Requester

* **Access:** Requester Only
* **Response `200 OK`:**
```json
{
  "tickets": [
    {
      "id": "uuid-ticket-1",
      "ticketNumber": "TKT-2026-00001",
      "title": "Cannot access VPN",
      "category": { "id": "cat-1", "name": "Network" },
      "requestedPriority": "HIGH",
      "status": "OPEN",
      "isRequesterResolved": false,
      "createdAt": "2026-09-10T08:00:00.000Z"
    }
  ]
}
```

---

### 3.2. `POST /api/tickets`
Creates a new ticket. The server always determines `requesterId` from the user's session, even if the client sends a different value.

* **Access:** Requester Only
* **Request Body:**
```json
{
  "title": "Laptop battery drains quickly",
  "description": "Battery depletes in less than 45 minutes even on idle.",
  "categoryId": "uuid-cat-1",
  "relatedSystemId": "uuid-sys-1",
  "requestedPriority": "MEDIUM"
}
```
* **Response `201 Created`:**
```json
{
  "ticket": {
    "id": "uuid-ticket-2",
    "ticketNumber": "TKT-2026-00002",
    "title": "Laptop battery drains quickly",
    "requestedPriority": "MEDIUM",
    "itPriority": "MEDIUM",
    "status": "NEW",
    "requesterId": "uuid-current-requester",
    "ownerId": null,
    "isRequesterResolved": false,
    "createdAt": "2026-09-11T06:00:00.000Z"
  }
}
```

---

### 3.3. `GET /api/tickets/:id`
Retrieves details for a single ticket

* **Access:** Requester (Owned only), IT Staff, Administrator (Read-Only Audit)
* **Response `200 OK`:**
```json
{
  "ticket": {
    "id": "uuid-ticket-1",
    "ticketNumber": "TKT-2026-00001",
    "title": "Cannot access VPN",
    "description": "Fails at handshake step.",
    "category": { "id": "cat-1", "name": "Network" },
    "relatedSystem": { "id": "sys-1", "name": "Corporate VPN" },
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "status": "OPEN",
    "isRequesterResolved": false,
    "requester": { "id": "user-req", "name": "Alex Requester" },
    "owner": { "id": "user-staff", "name": "Sarah Staff" },
    "attachments": [],
    "createdAt": "2026-09-10T08:00:00.000Z"
  }
}
```
* **Error `404 Not Found`:** When the ticket ID is not found, or a Requester attempts to access another user's ticket

---

### 3.4. `PATCH /api/tickets/:id/resolve-indication`
The Requester who owns the ticket signals that the issue is likely resolved
* **Side Effects:**
  1. The server updates the `isRequesterResolved` flag to `true`
  2. The server automatically creates a public comment notification on the ticket: `"[System] Requester indicated that the problem appears resolved."`
  3. **The ticket `status` absolutely does not change** (it remains in its current status, e.g., `IN_PROGRESS` or `WAITING_FOR_REQUESTER`), pending official verification and resolution by IT Staff

* **Access:** Requester (Owned only)
* **Request Body:** `{}` (Empty Object)
* **Response `200 OK`:**
```json
{
  "message": "Problem indicated as resolved by requester.",
  "ticket": {
    "id": "uuid-ticket-1",
    "status": "OPEN",
    "isRequesterResolved": true
  }
}
```
*(Note: the `status` field in the response reflects the ticket's current status at that moment — it is not changed to RESOLVED)*
* **Error `404 Not Found`:** When the ticket ID is not found, or the caller is not the ticket's owner

---

## 4. IT Staff Ticket Queue & Operations

### 4.1. `GET /api/staff/queue`
Retrieves the list of all tickets in the system with search, filter, sort, and pagination

* **Access:** IT Staff, Administrator (Read-Only Audit)
* **Query Parameters:**
  * `page` (integer, default: `1`): The page number requested
  * `limit` (integer, default: `10`): Number of items per page (range: 1 to 100)
  * `search` (string, optional): Case-insensitive search on `ticketNumber` or `title`
  * `categoryId` (UUID, optional): Filter by category ID
  * `status` (string, optional): Filter by status (`NEW`, `OPEN`, `IN_PROGRESS`, etc.)
  * `itPriority` (string, optional): Filter by priority level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
  * `ownerId` (string, optional): Filter by ticket owner, accepting 2 formats:
    * Literal string `"unassigned"`: filters only tickets with no owner (`ownerId IS NULL`)
    * Target User UUID: filters only tickets belonging to that staff member
  * `sortBy` (string, default: `"createdAt"`): Field used for sorting; supports `createdAt`, `ticketNumber`, `itPriority`, `status`
  * `sortOrder` (string, default: `"desc"`): Sort direction; supports `asc` or `desc`
* **Query Parameter Validation Behavior:**
  * If a non-existent enum value is submitted (e.g., `status=INVALID_STATUS` or `itPriority=SUPER_HIGH`), the system immediately rejects with **`400 Bad Request`** to prevent silent failures
  * If `page` or `limit` is submitted as a non-numeric value or less than 1, the system responds with **`400 Bad Request`**
* **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid-ticket-1",
      "ticketNumber": "TKT-2026-00001",
      "title": "Cannot access VPN",
      "category": { "name": "Network" },
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "status": "OPEN",
      "owner": { "id": "staff-1", "name": "Sarah Staff" },
      "createdAt": "2026-09-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalRecords": 87,
    "totalPages": 9
  }
}
```
* **Error `403 Forbidden`:** When a Requester attempts to access this endpoint

---

### 4.2. `PATCH /api/staff/tickets/:id/assign`
Assigns a ticket owner (Claim or Reassign). The assignee must be an Active IT Staff member or Active Administrator.
* **Side Effects:**
  * If the ticket's current status is `NEW`, assigning an owner automatically changes the ticket status to `OPEN` per BR-14
  * If the ticket's current status is not `NEW` (e.g., already `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`), the ticket status remains unchanged — it is not reverted to `OPEN`

* **Access:** IT Staff Only (Admin: `403 Forbidden`)
* **Request Body:**
```json
{
  "ownerId": "uuid-active-staff-or-admin"
}
```
*(Send `"ownerId": null` to unassign the ticket back to Unassigned)*
* **Response `200 OK`:**
```json
{
  "ticketId": "uuid-ticket-1",
  "ownerId": "uuid-active-staff-or-admin",
  "status": "OPEN"
}
```
*(The `status` field will be OPEN if the ticket was originally NEW, or will be the ticket's current status if reassigned in another status)*
* **Error `400 Bad Request`:** When `ownerId` is not an Active user, or that user's role is `REQUESTER`
* **Error `403 Forbidden`:** When an Administrator or Requester attempts to call this endpoint
* **Error `404 Not Found`:** When the ticket ID is not found in the system

---

### 4.3. `PATCH /api/staff/tickets/:id/priority`
Updates the operational priority level (`itPriority`)

* **Access:** IT Staff Only (Admin: `403 Forbidden`)
* **Request Body:**
```json
{
  "itPriority": "CRITICAL"
}
```
* **Response `200 OK`:**
```json
{
  "ticketId": "uuid-ticket-1",
  "requestedPriority": "MEDIUM",
  "itPriority": "CRITICAL"
}
```
* **Error `400 Bad Request`:** `itPriority` value does not match the enum (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
* **Error `403 Forbidden`:** When an Administrator or Requester attempts to call this endpoint
* **Error `404 Not Found`:** When the ticket ID is not found in the system

---

### 4.4. `PATCH /api/staff/tickets/:id/status`
Changes the ticket status according to the State Transition Matrix

* **Access:** IT Staff Only (Admin: `403 Forbidden`)
* **Request Body:**
```json
{
  "status": "IN_PROGRESS"
}
```
* **Response `200 OK`:**
```json
{
  "ticketId": "uuid-ticket-1",
  "status": "IN_PROGRESS",
  "updatedAt": "2026-09-11T06:30:00.000Z"
}
```
* **Error `400 Bad Request`:** Status change violates transition rules (e.g., going directly from `NEW` to `RESOLVED`, or attempting to change the status of a ticket that is `CLOSED`/`CANCELLED`)
* **Error `403 Forbidden`:** When an Administrator or Requester attempts to call this endpoint
* **Error `404 Not Found`:** When the ticket ID is not found in the system

---

## 5. Communication Endpoints (Comments & Notes)

### 5.1. `GET /api/tickets/:id/comments`
Retrieves all public comments for a ticket

* **Access:** Requester (Owned only), IT Staff, Administrator
* **Response `200 OK`:**
```json
{
  "comments": [
    {
      "id": "uuid-comment-1",
      "author": { "name": "Sarah Staff", "role": "IT_STAFF" },
      "content": "Investigating network gateway logs now.",
      "createdAt": "2026-09-10T09:15:00.000Z"
    }
  ]
}
```
* **Error `404 Not Found`:** When the ticket ID is not found, or a Requester attempts to view another user's ticket

---

### 5.2. `POST /api/tickets/:id/comments`
Adds a new public comment (Append-only)

* **Access:** Requester (Owned only), IT Staff, Administrator
* **Request Body:**
```json
{
  "content": "I still cannot reach the portal even after rebooting."
}
```
* **Response `201 Created`:**
```json
{
  "comment": {
    "id": "uuid-comment-2",
    "authorId": "uuid-current-user",
    "content": "I still cannot reach the portal even after rebooting.",
    "createdAt": "2026-09-10T09:20:00.000Z"
  }
}
```
* **Error `400 Bad Request`:** Content is empty, contains only whitespace, or exceeds 2,000 characters
* **Error `404 Not Found`:** When the ticket ID is not found, or a Requester attempts to comment on another user's ticket

---

### 5.3. `GET /api/tickets/:id/internal-notes`
Retrieves all internal notes for a ticket

* **Access:** IT Staff, Administrator Only
* **Response `200 OK`:**
```json
{
  "notes": [
    {
      "id": "uuid-note-1",
      "author": { "name": "David Staff", "role": "IT_STAFF" },
      "content": "Switch port #4 had packet drop issues last night.",
      "createdAt": "2026-09-10T09:30:00.000Z"
    }
  ]
}
```
* **Error `403 Forbidden`:** When a Requester attempts to view this (prevents leakage of internal information)
* **Error `404 Not Found`:** When the ticket ID is not found

---

### 5.4. `POST /api/tickets/:id/internal-notes`
Adds a new internal note (Append-only)

* **Access:** IT Staff, Administrator Only
* **Request Body:**
```json
{
  "content": "Vendor contacted regarding firmware bug."
}
```
* **Response `201 Created`:**
```json
{
  "note": {
    "id": "uuid-note-2",
    "authorId": "uuid-current-user",
    "content": "Vendor contacted regarding firmware bug.",
    "createdAt": "2026-09-10T10:00:00.000Z"
  }
}
```
* **Error `400 Bad Request`:** Content is empty, or exceeds 2,000 characters
* **Error `403 Forbidden`:** When a Requester attempts to create a note
* **Error `404 Not Found`:** When the ticket ID is not found

---

## 6. Administrator User Management Endpoints

### 6.1. `GET /api/admin/users`
Retrieves a list of all users, searchable by name/email and filterable by role

* **Access:** Administrator Only
* **Query Parameters:**
  * `search` (string, optional): Search keyword for name or email
  * `role` (string, optional): Filter by role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
* **Response `200 OK`:**
```json
{
  "users": [
    {
      "id": "uuid-user-1",
      "name": "Alex Thompson",
      "email": "alex.thompson@toktickit.com",
      "role": "IT_STAFF",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-08-01T00:00:00.000Z"
    }
  ]
}
```
* **Error `400 Bad Request`:** If an invalid `role` value is submitted per the enum
* **Error `403 Forbidden`:** When a Requester or IT Staff member attempts to access this endpoint

---

### 6.2. `POST /api/admin/users`
Creates a new user account with one role and an initial password

* **Access:** Administrator Only
* **Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
* **Response `201 Created`:**
```json
{
  "user": {
    "id": "uuid-user-2",
    "name": "Jane Doe",
    "email": "jane.doe@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true
  }
}
```
* **Error `400 Bad Request`:** Validation failed (invalid email format, password does not meet requirements, or invalid role)
* **Error `409 Conflict`:** Email is already in use by an existing user

---

### 6.3. `PATCH /api/admin/users/:id`
Edits a user's basic information (name, email, role, Active/Inactive status)

* **Access:** Administrator Only
* **Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@toktickit.com",
  "role": "IT_STAFF",
  "isActive": false
}
```
* **Response `200 OK`:**
```json
{
  "user": {
    "id": "uuid-user-2",
    "name": "Jane Smith",
    "email": "jane.smith@toktickit.com",
    "role": "IT_STAFF",
    "isActive": false
  }
}
```
* **Error `400 Bad Request`:**
  * An Administrator attempts to deactivate their own account (`isActive: false`)
  * Deactivating or changing the role would leave no Active Administrator remaining in the system
  * An invalid `role` value is submitted per the enum
* **Error `404 Not Found`:** Specified user ID not found
* **Error `409 Conflict`:** Email is already in use by another user

---

### 6.4. `POST /api/admin/users/:id/reset-password`
Sets a new initial password for a user and sets the mandatory password-change flag

* **Access:** Administrator Only
* **Request Body:**
```json
{
  "newInitialPassword": "TemporaryPassword456!"
}
```
* **Response `200 OK`:**
```json
{
  "message": "Initial password reset successfully.",
  "userId": "uuid-user-2",
  "mustChangePassword": true
}
```
* **Error `400 Bad Request`:** Password does not meet the minimum security requirement of 8 characters
* **Error `404 Not Found`:** Specified user ID not found