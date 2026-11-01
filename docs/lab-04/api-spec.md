# Sprint 4 REST API Specification: TokTickIT Actions Taken, Dashboards & Ticket Workflow

## 1. Overview & Conventions

- Base path `/api`; JSON request and response bodies; session cookie `toktickit_session` (Lab 3). Every endpoint enforces authentication and server-side RBAC.
- Labs 2 and 3 endpoints continue unchanged unless listed here.
- Ticket IDs are integers; action IDs are UUID strings. The ticket text field is `summary` (as in the Prisma schema).
- Timestamps are ISO 8601 UTC strings.

### 1.1 Error envelope (same as Lab 3)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A human-readable description of the error.",
    "details": []
  }
}
```

`details` is an array of `{ "field": "...", "message": "..." }` for validation errors and may be empty. Responses never contain stack traces, SQL, or file paths.

### 1.2 Error code registry

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid body/query: length, enum, missing follow-up note, invalid transition, bad `group`/`status` combination |
| `INVALID_ACTION_DATE` | 400 | `actionDateTime` before ticket creation or more than 60 seconds in the future |
| `TICKET_TERMINAL` | 400 | Write attempted on a `CLOSED` or `CANCELLED` ticket (actions, resolve-indication) |
| `RESOLUTION_ACTION_REQUIRED` | 400 | Transition to `RESOLVED` without a qualifying Action Taken |
| `UNAUTHORIZED` | 401 | Missing or expired session (Lab 3 returns 401 for this; this sprint names the code `UNAUTHORIZED`; login failure keeps `INVALID_CREDENTIALS`) |
| `FORBIDDEN` | 403 | Role not permitted (also used with `PASSWORD_CHANGE_REQUIRED` as in Lab 3) |
| `NOT_FOUND` | 404 | Resource missing, or ticket not owned by the requesting Requester |
| `METHOD_NOT_ALLOWED` | 405 | DELETE on Actions Taken |
| `STALE_UPDATE` | 409 | `expectedUpdatedAt` does not match the stored `updatedAt` |

### 1.3 Concurrency token
`expectedUpdatedAt` is optional. When present it is compared as epoch milliseconds (`new Date(value).getTime() === record.updatedAt.getTime()`); a mismatch returns `409 STALE_UPDATE`. When omitted, the check is skipped (Lab 3 compatibility).

## 2. Actions Taken

### 2.1 `GET /api/tickets/:id/actions`
**Access:** Requester (owned tickets only), IT Staff, Administrator. Ordered by `actionDateTime DESC`, then `createdAt DESC`.

**Response 200**
```json
{
  "ticketId": 101,
  "actions": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "ticketId": 101,
      "actionDateTime": "2026-10-19T10:30:00.000Z",
      "description": "Replaced RAM module and ran memory diagnostics.",
      "result": "4 passes of MemTest86 with 0 errors.",
      "performedBy": { "id": "u-staff-uuid", "name": "Alex Staff", "role": "IT_STAFF" },
      "followUpRequired": true,
      "followUpNote": "Monitor stability for 24 hours.",
      "attachmentNotes": "Look for RAM_diagnostic_report.png",
      "createdAt": "2026-10-19T10:35:00.000Z",
      "updatedAt": "2026-10-19T10:35:00.000Z"
    }
  ]
}
```
**Errors:** 401 `UNAUTHORIZED`; 404 `NOT_FOUND` (missing ticket, or Requester does not own it).

### 2.2 `POST /api/tickets/:id/actions`
**Access:** IT Staff, Administrator (Requester: 403 `FORBIDDEN`).
**Side effect:** in one transaction, creates the action and sets `Ticket.updatedAt = now()`.

**Request**
```json
{
  "actionDateTime": "2026-10-19T10:30:00.000Z",
  "description": "Replaced faulty Ethernet jack and re-crimped cable.",
  "result": "Gigabit link established and verified.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "See network_speed_test.png"
}
```

**Validation**
- `description`, `result`: 5 to 2,000 characters.
- `actionDateTime`: optional (default server now); must be `>= ticket.createdAt` and `<= now + 60s`.
- `followUpRequired`: boolean, default `false`; when `true`, `followUpNote` is required (5 to 2,000 characters).
- `attachmentNotes`: optional, up to 500 characters.
- `performedById` is always taken from the session; any client value is ignored.

**Response 201**
```json
{
  "action": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "ticketId": 101,
    "actionDateTime": "2026-10-19T10:30:00.000Z",
    "description": "Replaced faulty Ethernet jack and re-crimped cable.",
    "result": "Gigabit link established and verified.",
    "performedBy": { "id": "u-staff-uuid", "name": "Alex Staff", "role": "IT_STAFF" },
    "followUpRequired": false,
    "followUpNote": null,
    "attachmentNotes": "See network_speed_test.png",
    "createdAt": "2026-10-19T10:35:00.000Z",
    "updatedAt": "2026-10-19T10:35:00.000Z"
  },
  "ticketUpdatedAt": "2026-10-19T10:35:00.000Z"
}
```
`ticketUpdatedAt` lets the client keep a valid concurrency token for the next status change.

**Errors:** 400 `VALIDATION_ERROR`, `INVALID_ACTION_DATE`, `TICKET_TERMINAL`; 401; 403 `FORBIDDEN`; 404 `NOT_FOUND`.

### 2.3 `PATCH /api/tickets/:id/actions/:actionId`
**Access:** IT Staff, Administrator. `ticketId` and `performedById` cannot be changed. Editing does not change `createdAt`.

**Request** (any editable subset, same validation as create; cross-field rule for follow-up still applies)
```json
{
  "description": "Updated diagnostic details and verified firmware patch.",
  "result": "Packet drop issue resolved.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "updated_test_log.txt",
  "expectedUpdatedAt": "2026-10-19T10:35:00.000Z"
}
```
`expectedUpdatedAt` is compared with the action's `updatedAt`.

**Response 200:** `{ "action": { ...same shape as 2.2... }, "ticketUpdatedAt": "..." }`
**Errors:** 400 `VALIDATION_ERROR`, `INVALID_ACTION_DATE`, `TICKET_TERMINAL`; 401; 403 `FORBIDDEN`; 404 `NOT_FOUND` (ticket or action); 409 `STALE_UPDATE`.

### 2.4 `DELETE /api/tickets/:id/actions/:actionId` (and `/actions`)
**Access:** all roles. Always rejected. Unauthenticated requests receive 401 UNAUTHORIZED; authenticated users of any role receive 405 METHOD_NOT_ALLOWED.

**Response 405**
```json
{
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Actions Taken records are append-only and cannot be deleted.",
    "details": []
  }
}
```

## 3. Ticket Workflow

### 3.1 `GET /api/tickets/:id` (Lab 3, extended)
Adds `updatedAt` and `reopenedAt` (nullable) to the ticket object, in addition to the Lab 3 fields. Requester sees only owned tickets (404 otherwise); Staff and Administrator see all.

### 3.2 `PATCH /api/staff/tickets/:id/status`
**Access:** IT Staff only (Administrator and Requester: 403 `FORBIDDEN`).

**Request**
```json
{
  "status": "RESOLVED",
  "expectedUpdatedAt": "2026-10-19T09:14:00.000Z"
}
```

**Rules**
- Transition must follow the matrix in specification BR-10. Invalid transition: 400 `VALIDATION_ERROR`.
- Target `RESOLVED` requires at least one Action Taken; if `reopenedAt` is not null, at least one action with `createdAt > reopenedAt`. Otherwise 400 `RESOLUTION_ACTION_REQUIRED`. Actions by Staff or Administrators both count.
- Target `REOPENED` sets `reopenedAt = now()` and `isRequesterResolved = false`.
- `NEW` to `OPEN` also happens automatically on owner assignment (Lab 3).

**Response 200**
```json
{
  "ticketId": 101,
  "status": "RESOLVED",
  "reopenedAt": null,
  "isRequesterResolved": true,
  "updatedAt": "2026-10-19T10:40:00.000Z"
}
```
**Errors:** 400 `VALIDATION_ERROR`, `RESOLUTION_ACTION_REQUIRED`; 401; 403 `FORBIDDEN`; 404 `NOT_FOUND`; 409 `STALE_UPDATE`.

### 3.3 `PATCH /api/tickets/:id/resolve-indication` (Lab 3, extended)
**Access:** Requester (owned ticket). Body `{}`.
Sets `isRequesterResolved = true`, posts the system comment, touches `Ticket.updatedAt`; status is never changed. Blocked on `CLOSED`/`CANCELLED` with 400 `TICKET_TERMINAL`.

**Response 200**
```json
{
  "message": "Problem indicated as resolved by requester.",
  "ticket": {
    "id": 101,
    "status": "IN_PROGRESS",
    "isRequesterResolved": true,
    "updatedAt": "2026-10-19T10:45:00.000Z"
  }
}
```
**Errors:** 400 `TICKET_TERMINAL`; 401; 403 `FORBIDDEN` (non-Requester); 404 `NOT_FOUND`.

### 3.4 Assign and priority
`PATCH /api/staff/tickets/:id/assign` and `/priority` are unchanged from Lab 3 (IT Staff only, no concurrency token, Administrator 403). They still update `Ticket.updatedAt`.

## 4. Dashboards

Counts are calculated by the backend. No date-boundary metrics are used, so time zone does not affect any count.

### 4.1 `GET /api/requester/dashboard`
**Access:** Requester only (IT Staff and Administrator: 403 `FORBIDDEN`). Uses only tickets where `requesterId` = caller.

**Response 200**
```json
{
  "metrics": {
    "activeTickets": 3,
    "inProgressTickets": 2,
    "resolvedTickets": 5,
    "closedTickets": 12
  },
  "recentRequests": [
    {
      "id": 105,
      "ticketNumber": "TKT-2026-001154",
      "summary": "Laptop battery drains quickly",
      "status": "WAITING_FOR_REQUESTER",
      "needsAttention": true,
      "updatedAt": "2026-10-19T09:14:00.000Z"
    }
  ]
}
```
- `activeTickets`: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- `recentRequests`: up to 5, `updatedAt DESC`; `needsAttention` is true when status is `WAITING_FOR_REQUESTER`.
- Empty: all metrics `0`, `recentRequests: []`.

### 4.2 `GET /api/staff/dashboard`
**Access:** IT Staff, Administrator (Requester: 403 `FORBIDDEN`).

**Response 200**
```json
{
  "metrics": {
    "newTickets": 14,
    "openTickets": 23,
    "inProgressTickets": 18,
    "waitingRequesterTickets": 7,
    "myAssignedTickets": 16
  },
  "recentQueueUpdates": [
    {
      "id": 102,
      "ticketNumber": "TKT-2026-001022",
      "summary": "VPN connection drops intermittently",
      "status": "IN_PROGRESS",
      "itPriority": "HIGH",
      "owner": { "id": "u-staff-uuid", "name": "Alex Staff" },
      "updatedAt": "2026-10-19T09:14:00.000Z"
    }
  ]
}
```
- `openTickets`: `status IN (OPEN, REOPENED)`.
- `myAssignedTickets`: `ownerId` = caller and status not `CLOSED`/`CANCELLED`.
- `recentQueueUpdates`: up to 5, `updatedAt DESC`; `owner` may be `null`.
- Empty: all metrics `0`, `recentQueueUpdates: []`.

## 5. Query Enhancements (backward compatible)

### 5.1 `GET /api/staff/queue`
Lab 3 parameters are preserved (`page`, `limit`, `search`, `categoryId`, `status`, `itPriority`, `ownerId`, `sortBy`, `sortOrder`). New:
- `group=open`: `status IN (OPEN, REOPENED)`. Only the value `open` is valid; other values return 400 `VALIDATION_ERROR`. Supplying both `group` and `status` returns 400 `VALIDATION_ERROR`.
- `ownerId=me`: resolves to the caller's ID (Staff and Administrator). `unassigned` and UUID values keep working.
- `activeOnly=true`: excludes `CLOSED` and `CANCELLED`. Any other value returns 400 `VALIDATION_ERROR`.

Omitting all new parameters returns the same results as Lab 3.

### 5.2 `GET /api/tickets` (Requester)
New parameters (the Lab 3 endpoint had none):
- `status`: one valid status, otherwise 400 `VALIDATION_ERROR`.
- `group=open`: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`.
- `group` with an unapproved value, or `group` together with `status`: 400 `VALIDATION_ERROR`.
- Each ticket in the list response also includes `updatedAt`. Omitting parameters keeps the Lab 3 behavior.