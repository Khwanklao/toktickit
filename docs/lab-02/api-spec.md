# Lab 2 REST API Specification

## 1. Overview & Conventions
- **Base URL:** `/api`
- **Data Format:** `application/json` (unless handling `multipart/form-data` for file uploads)
- **Simulated Authentication Header:** `x-requester-id: <integer>`
  - Used on all ticket and attachment endpoints to identify the active Development Requester.
  - Missing header on protected routes returns `400 Bad Request`.
  - Header with an inactive requester ID returns `403 Forbidden` (`BR-05`).

---

## 2. Common Error Response Shape
All error responses adhere to a consistent JSON structure:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    {
      "field": "summary",
      "message": "Summary is required and must be between 5 and 100 characters"
    }
  ]
}
```
`errors` is present only for field-level validation failures; omitted for all other error types. `500` responses never include stack traces or internal details in `message`.

---

## 3. Reference Data Endpoints

### 3.1 Get Active Categories
**Path:** `GET /api/categories`
- **Description:** Returns all active ticket categories.
- **Response `200 OK`:**
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

### 3.2 Get Active Related Systems
**Path:** `GET /api/related-systems`
- **Description:** Returns all active related systems for ticket classification.
- **Response `200 OK`:**
```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" },
  { "id": 3, "name": "VPN" },
  { "id": 4, "name": "LEB2 App" },
  { "id": 5, "name": "Grade Submission App" },
  { "id": 6, "name": "Printer" },
  { "id": 7, "name": "Corporate Laptop" }
]
```

### 3.3 Get Active Development Requesters
**Path:** `GET /api/dev/requesters`
- **Description:** Lists active seeded requesters for user simulation. Inactive users (`isActive: false`) are excluded (BR-05, BR-19).
- **Response `200 OK`:**
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "department": "Engineering"
  },
  {
    "id": 2,
    "name": "Michael Brown",
    "email": "michael.brown@example.com",
    "department": "Finance"
  }
]
```
  An empty array `[]` is a valid `200` response when no active Requesters exist — the client shows the dedicated empty state and disables Continue (BR-19); this is not an error condition.
- **Error `500 Internal Server Error`:** generic error returned on database fetch failure (BR-18). The client shows a dismissible failure banner with a Retry action.

---

## 4. Ticket Endpoints

### 4.1 Create Ticket
**Path:** `POST /api/tickets`
- **Headers:** `x-requester-id: <int>` (required)
- **Request Body:**
```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM"
}
```
- **Validation Rules (BR-09):**
  - `categoryId`: required, integer, must reference a Category with `isActive = true`.
  - `relatedSystemId`: required, integer, must reference a RelatedSystem with `isActive = true`.
  - `summary`: required, trimmed string, min 5 / max 100 characters.
  - `description`: required, trimmed string, min 10 / max 2000 characters.
  - `requestedPriority`: required, enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - If `categoryId`/`relatedSystemId` reference a record that exists but is **inactive**, or does not exist at all, the request fails the same way: `400 Bad Request` with a field-level error (not `404`) — from the client's point of view this is a form validation failure, not a missing-resource failure.
- **Response `201 Created`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "status": "NEW",
  "createdAt": "2026-08-24T05:26:00.000Z",
  "updatedAt": "2026-08-24T05:26:00.000Z"
}
```
- **Errors:**
  - `400 Bad Request`: validation failure (including inactive/missing `categoryId`/`relatedSystemId`), or missing `x-requester-id` header.
  - `403 Forbidden`: `x-requester-id` belongs to an inactive requester.
  - `500 Internal Server Error`: safe database error; no Ticket is created; client preserves all entered form values for retry (BR-10).

### 4.2 List Requester's Tickets (My Tickets)
**Path:** `GET /api/tickets`
- **Headers:** `x-requester-id: <int>` (required)
- **Query Parameters:**
  - `search` (string, optional): text query matching `ticketNumber` or `summary` (FR-07).
  - `categoryId` (int, optional): filter by Category ID (FR-08).
  - `priority` (string, optional): filter by `requestedPriority` (`LOW|MEDIUM|HIGH|URGENT`).
  - `status` (string, optional): filter by `status` (`NEW|IN_PROGRESS|RESOLVED|CLOSED`).
  - `sortBy` (string, optional): `createdAt` (default), `updatedAt`, or `ticketNumber` (FR-09, BR-08).
  - `sortDir` (string, optional): `asc` or `desc` (default: `desc`).
  - `page` (int, optional): page number (default: `1`, min: `1`) (FR-10).
  - `pageSize` (int, optional): `10` (default), `25`, `50` (BR-16).
  - **Invalid parameter fallback (BR-16):** an unrecognized `sortBy` value, an unrecognized `sortDir` value, a `pageSize` outside `{10, 25, 50}`, or a non-positive/non-numeric `page` never returns a `400`. Each falls back silently to its default (`createdAt` / `desc` / `10` / `1` respectively) and the request still succeeds with `200`.
  - **Tie-breaker Sorting (BR-17):** when the primary `sortBy` value ties across rows (e.g., identical `createdAt`), secondary order is always `ticketNumber DESC`, regardless of which field was requested as primary. This guarantees deterministic pagination and is not itself exposed as a query parameter.
- **Response `200 OK`:**
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-000101",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": null,
      "status": "NEW",
      "createdAt": "2026-08-24T05:26:00.000Z",
      "updatedAt": "2026-08-24T05:26:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```
  An empty `data: []` array with `totalItems: 0` is a valid `200`. The client distinguishes the Empty State (no `search`/filter params sent, zero tickets overall) from the No-Results State (a `search`/filter param was sent, zero matches) per BR-12 — this distinction is made client-side from the request it sent, not from a separate API flag.
- **Errors:**
  - `400 Bad Request`: missing `x-requester-id` header.
  - `403 Forbidden`: inactive requester.
  - `500 Internal Server Error`: safe database error.

### 4.3 Get Ticket Details
**Path:** `GET /api/tickets/:id`
- **Headers:** `x-requester-id: <int>` (required)
- **Ownership Rule (BR-04, FR-11):** a Requester can only retrieve a ticket if `ticket.requesterId == x-requester-id`.
- **Response `200 OK`:**
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-000101",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idle.",
  "requestedPriority": "MEDIUM",
  "itPriority": null,
  "status": "NEW",
  "createdAt": "2026-08-24T05:26:00.000Z",
  "updatedAt": "2026-08-24T05:26:00.000Z",
  "requester": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com"
  },
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "attachments": [
    {
      "id": 501,
      "originalFileName": "battery_report.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "createdAt": "2026-08-24T05:27:00.000Z",
      "isRemoved": false,
      "removedAt": null,
      "removalReason": null
    }
  ]
}
```
- **Errors:**
  - `400 Bad Request`: missing `x-requester-id` header.
  - `403 Forbidden`: inactive requester.
  - `404 Not Found`: ticket does not exist, **or** exists but belongs to another requester (BR-04) — the two cases are indistinguishable in the response to avoid leaking existence of another Requester's data.

---

## 5. Attachment Endpoints

### 5.1 Upload Attachment
**Path:** `POST /api/tickets/:id/attachments`
- **Headers:** `x-requester-id: <int>` (required)
- **Content-Type:** `multipart/form-data`
- **Form Body:** `file` (binary file)
- **Validation Rules (BR-06, BR-15, BR-23):**
  - Supported MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Max file size: 5 MB (5,242,880 bytes).
  - Active attachment limit: the ticket cannot exceed 5 active (`isRemoved: false`) attachments. Soft-removed attachments do not count toward this limit.
  - The server repeats these checks even though the client also validates client-side; the server check is authoritative.
- **Response `201 Created`:**
```json
{
  "id": 501,
  "ticketId": 101,
  "originalFileName": "battery_report.pdf",
  "fileSize": 1048576,
  "mimeType": "application/pdf",
  "createdAt": "2026-08-24T05:27:00.000Z",
  "isRemoved": false
}
```
- **Errors:**
  - `400 Bad Request`: unsupported file type or file exceeds 5MB.
  - `404 Not Found`: ticket not found or not owned by requester.
  - `409 Conflict`: ticket already has 5 active attachments; the existing 5 attachments are unaffected.
  - `500 Internal Server Error`: upload failure (e.g., disk write error, storage service unavailable). **This case is governed by BR-20 and BR-24 and requires specific handling:**
    - The parent Ticket (already created in a prior, separate request — see §4.1) is **never** rolled back, deleted, or modified because of an attachment failure.
    - No Attachment record is created for the failed file — there is no "partial" or orphaned row.
    - The response body still uses the Common Error Shape (§2) with a safe message (e.g., `"Attachment upload failed. Your ticket was saved — you can retry the upload."`), never a stack trace.
    - The client keeps the Ticket visible/saved and offers a retry of only the failed file. Retrying calls this same endpoint again for the same `:id` — it never re-calls `POST /api/tickets`, so a retry cannot create a duplicate Ticket.

### 5.2 Get Attachment Metadata
**Path:** `GET /api/attachments/:id`
- **Headers:** `x-requester-id: <int>` (required)
- **Description:** retrieves metadata for an active or soft-removed attachment (BR-21). Metadata is always returned regardless of removal state — only the download endpoint (§5.3) blocks removed content.
- **Response `200 OK`:**
```json
{
  "id": 501,
  "ticketId": 101,
  "originalFileName": "battery_report.pdf",
  "fileSize": 1048576,
  "mimeType": "application/pdf",
  "createdAt": "2026-08-24T05:27:00.000Z",
  "isRemoved": false,
  "removedAt": null,
  "removalReason": null
}
```
- **Errors:**
  - `404 Not Found`: attachment does not exist, or its parent ticket is not owned by the requester.

### 5.3 Download Active Attachment
**Path:** `GET /api/attachments/:id/download`
- **Headers:** `x-requester-id: <int>` (required)
- **Ownership & Soft-removal Check (BR-04, BR-07, FR-14):**
  - Must belong to a ticket owned by `x-requester-id`.
  - `isRemoved` must be `false`.
- **Response `200 OK`:** binary file stream with headers:
  - `Content-Type: <mimeType>`
  - `Content-Disposition: attachment; filename="battery_report.pdf"`
- **Errors:**
  - `404 Not Found`: attachment does not exist or ticket not owned by requester.
  - `410 Gone`: attachment has been soft-removed; download is blocked even though the record exists and is owned (FR-14). Preferred over `404` for this case since the resource's prior existence is known to the caller (they're looking at its metadata already) — `404` is acceptable as an equivalent fallback if the framework doesn't distinguish them cleanly.
  - `500 Internal Server Error`: unexpected file-read failure.

### 5.4 Soft-Remove Attachment
**Path:** `DELETE /api/attachments/:id`
- **Headers:** `x-requester-id: <int>` (required)
- **Request Body:**
```json
{ "reason": "Uploaded incorrect log file" }
```
- **Validation Rules (BR-07, BR-22):**
  - `reason`: required, non-empty trimmed string (min 3 chars).
- **Response `200 OK`:**
```json
{
  "id": 501,
  "ticketId": 101,
  "originalFileName": "battery_report.pdf",
  "isRemoved": true,
  "removedAt": "2026-08-24T05:30:00.000Z",
  "removedBy": 1,
  "removalReason": "Uploaded incorrect log file"
}
```
- **Errors:**
  - `400 Bad Request`: missing or empty removal reason (AC-22).
  - `404 Not Found`: attachment not found or belongs to another requester's ticket.
  - `409 Conflict`: attachment is already soft-removed (`isRemoved` is already `true`). Removal is **not** idempotent-success — a second removal attempt does not silently return `200` and must not overwrite the original `removedAt`/`removedBy`/`removalReason`.

---

## 6. HTTP Status Code Summary

| Status | Used By |
| :--- | :--- |
| `200` | Successful `GET`, successful `DELETE` (soft-remove) |
| `201` | `POST /api/tickets`, `POST /api/tickets/:id/attachments` |
| `400` | Missing header, field validation failure, inactive/missing category or related system reference, invalid file type/size, missing removal reason |
| `403` | `x-requester-id` belongs to an inactive requester |
| `404` | Resource not found, or exists but not owned by the calling requester (ownership failures never use `403`) |
| `409` | 6th active attachment upload attempt; soft-removing an already-removed attachment |
| `410` | Downloading a soft-removed attachment (or `404` as an equivalent fallback) |
| `500` | Unexpected/database failure on any endpoint, including attachment upload failure after Ticket creation (BR-20) |