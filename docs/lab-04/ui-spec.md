# Sprint 4 UI Specification: TokTickIT Zen Green Dashboards, Actions Taken & Workflow UI

This document is the UI contract for Sprint 4. It must stay consistent with `docs/lab-04/specification.md` (BR/AC IDs) and `docs/lab-04/api-spec.md` (endpoints, fields, error codes). Behavior not changed here is inherited from Labs 2 and 3.

## 1. Zen Green Design Tokens

| Token | Value | Usage |
|---|---|---|
| Brand primary | `#10403E` | Header, primary buttons, active nav, focus ring |
| Accent / soft surfaces | `#A7F3D0`, `#DCFCE7`, `#ECFDF5` | Badges, success, active-nav underline |
| App canvas | `#F9FAFB` | Page background |
| Card / modal surface | `#FFFFFF` | `border-radius: 8px`, `1px solid #E5E7EB`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)` |
| Heading text | `#111827` | Semibold/bold |
| Body text | `#374151` | |
| Muted text | `#6B7280` | |
| Danger | text `#DC2626`, surface `#FEF2F2`, border `#FECACA` | Errors |
| Warning / Internal Notes | text `#D97706`, surface `#FFFBEB`, border `#FDE68A` | Follow-up callouts, attention, internal notes |
| Actions Taken accent | text `#047857`, surface `#ECFDF5`, border `#A7F3D0` | Actions Taken tab, cards |

**Non-color cues:** every badge has text plus an icon. Status badges (all 8) and priority badges follow the table below; the private-content cue is a lock icon.

| Status | Icon | | Priority | Icon |
|---|---|---|---|---|
| NEW | sparkle | | LOW | arrow-down |
| OPEN | circle-dot | | MEDIUM | minus |
| IN_PROGRESS | clock | | HIGH | arrow-up |
| WAITING_FOR_REQUESTER | pause | | URGENT | exclamation |
| RESOLVED | check-circle | | | |
| CLOSED | archive | | | |
| REOPENED | rotate-ccw | | | |
| CANCELLED | x-circle | | | |

Role badges: Requester blue, IT Staff green, Administrator purple (as Lab 3).

## 2. Application Shell & Role Navigation

- Header height `64px`, background `#10403E`, white text. Left: TokTickIT emblem and wordmark. Right: user name, role badge, Profile/Sign Out menu.
- Active route: `border-b-2 border-[#A7F3D0]`, `font-semibold`, and `aria-current="page"`.

| Role | Navigation links |
|---|---|
| Requester | Dashboard (`/dashboard`), My Tickets (`/tickets`), + Create Ticket (`/tickets/new`) |
| IT Staff | Dashboard (`/staff/dashboard`), Ticket Queue (`/staff/queue`) |
| Administrator | Dashboard (`/staff/dashboard`), Ticket Queue (`/staff/queue`), User Management (`/admin/users`) |

- Route guards: a Staff/Admin opening `/dashboard` is redirected to `/staff/dashboard`; a Requester opening `/staff/*` or `/admin/*` sees the Access Restricted page (section 9).
- Mobile (< 768px): links collapse into a hamburger menu (button with `aria-expanded`, `aria-controls`); the menu closes on Esc and returns focus to the button.

## 3. Dashboards

Dashboards summarize data and never replace the detailed screens. All counts come from the backend (BR-13, BR-14); the UI never recomputes them.

### 3.1 IT Staff Dashboard (`/staff/dashboard`, also used by Administrator)

- Greeting: "Welcome back, {name}!" with subtitle "Here's what's happening with your queue today."
- Top-right "Refresh" button (re-fetches `GET /api/staff/dashboard`; shows spinner, disabled while loading).
- Data source: `GET /api/staff/dashboard`.

**Metric cards (5)**

| Card | API field | Meaning | Click destination |
|---|---|---|---|
| New | `newTickets` | `status = NEW` | `/staff/queue?status=NEW` |
| Open | `openTickets` | `status IN (OPEN, REOPENED)` | `/staff/queue?group=open` |
| In Progress | `inProgressTickets` | `status = IN_PROGRESS` | `/staff/queue?status=IN_PROGRESS` |
| Waiting for Requester | `waitingRequesterTickets` | `status = WAITING_FOR_REQUESTER` | `/staff/queue?status=WAITING_FOR_REQUESTER` |
| My Assigned | `myAssignedTickets` | `ownerId = me`, not CLOSED/CANCELLED | `/staff/queue?ownerId=me&activeOnly=true` |

- Each card is a link/button with `aria-label` such as "Open tickets: 23, view in queue". A value of `0` is displayed as `0`.
- The queue page reads `status`, `group`, `ownerId`, `activeOnly` from the URL, applies them, and shows removable filter chips ("Open tickets", "My active tickets") so the row total equals the card count (FR-09, AC-15).

**Recent Queue Updates feed**
- Title "Recent Queue Updates": the 5 tickets with the latest `updatedAt` (API order).
- Columns: Ticket No., Summary, Status badge, Updated time (`Asia/Bangkok`). Row click opens `/staff/tickets/:id`.
- Empty state: "No recent queue updates found."

**Quick Actions**
- Search Tickets: `/staff/queue` with the search field focused.
- My Queue: `/staff/queue?ownerId=me&activeOnly=true`.
- Ticket Queue: `/staff/queue`.

### 3.2 Requester Dashboard (`/dashboard`)

- Greeting: "Welcome, {name}!" with subtitle "Here's the latest on your requests."
- Data source: `GET /api/requester/dashboard` (Requester only).

**Metric cards (4)**

| Card | API field | Meaning | "View all" destination |
|---|---|---|---|
| Active Tickets | `activeTickets` | NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED | `/tickets?group=open` |
| In Progress | `inProgressTickets` | `IN_PROGRESS` | `/tickets?status=IN_PROGRESS` |
| Resolved | `resolvedTickets` | `RESOLVED` (set only by IT Staff) | `/tickets?status=RESOLVED` |
| Closed | `closedTickets` | `CLOSED` | `/tickets?status=CLOSED` |

- Note: Active Tickets includes In Progress; cards are not mutually exclusive.
- The My Tickets screen reads `group`/`status` from the URL and shows a removable filter chip.

**Recent Requests feed**
- 5 most recently updated tickets owned by the Requester (API order, `updatedAt DESC`).
- Items with `needsAttention: true` (status `WAITING_FOR_REQUESTER`) show an amber border and an "Action Required" badge with icon, with hint "IT Staff is waiting for your reply. Add a comment."
- Row click opens `/tickets/:id`.
- Empty state: "You haven't submitted any tickets yet." with a "+ Create First Ticket" button.

**Quick Actions:** "+ Create Ticket" (`/tickets/new`) and "View My Tickets" (`/tickets`).

### 3.3 Administrator Dashboard
Administrators use the IT Staff dashboard at `/staff/dashboard` (read-only audit view) plus the User Management navigation link.

## 4. Ticket Detail: Workflow & Resolution

Applies to `/staff/tickets/:id` (Staff/Admin) and `/tickets/:id` (Requester). The page holds `ticket.updatedAt` and `ticket.reopenedAt` from `GET /api/tickets/:id`, and refreshes both after every successful write.

### 4.1 Status control (IT Staff only)

- Shown in the ticket header card. Options are filtered to the permitted transitions from the current status:

| From | Allowed targets |
|---|---|
| NEW | OPEN, CANCELLED |
| OPEN | IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED |
| IN_PROGRESS | WAITING_FOR_REQUESTER, RESOLVED, CANCELLED |
| WAITING_FOR_REQUESTER | IN_PROGRESS, RESOLVED, CANCELLED |
| RESOLVED | CLOSED, REOPENED |
| REOPENED | IN_PROGRESS, RESOLVED, CANCELLED |
| CLOSED, CANCELLED | none (control disabled, labelled "Final status") |

- Assigning an owner to a `NEW` ticket moves it to `OPEN` automatically (Lab 3); the header refreshes to show it.
- **Confirmation dialog** for RESOLVED, CLOSED, CANCELLED, showing the count and latest of the ticket's Actions Taken.
- Every change sends `expectedUpdatedAt`. On success the header badge, available options, `updatedAt` and `reopenedAt` update without a page reload.
- **Administrator:** status, owner and IT priority controls are visible but disabled with tooltip "Only IT Staff can change status, owner, or priority." (Administrators can still record and edit Actions Taken.)

### 4.2 Resolution gate feedback (BR-12)
- If the ticket has no Action Taken (or none created after `reopenedAt`, when `reopenedAt` is set), the RESOLVED option shows the hint "Record an Action Taken first". It remains selectable so the backend stays the authority.
- On `RESOLUTION_ACTION_REQUIRED`, show an inline error: "Record at least one Action Taken (after the reopen, if reopened) before resolving." with a "Record Action Taken" button that opens the modal.

### 4.3 Requester resolution indication
- On `/tickets/:id`, a button "Problem Appears Resolved" is shown to the owning Requester when the ticket is not RESOLVED, CLOSED or CANCELLED and `isRequesterResolved` is false.
- Helper text: "This tells IT Staff the problem looks fixed. Only IT Staff can resolve or close the ticket."
- On success the button becomes a disabled "Resolution indicated" tag and a system comment appears in Public Comments. Status is unchanged.
- IT Staff/Admin see a badge "Requester indicates resolved" while `isRequesterResolved` is true (cleared when the ticket is reopened).

## 5. Actions Taken UI

### 5.1 Tabs
Tab order: **Public Comments** (green, all roles), **Internal Notes** (amber, lock icon, Staff/Admin only, hidden from Requester), **Actions Taken** (emerald, all roles, count badge, Requester read-only), **Attachments**.

### 5.2 Timeline
- Ordering: `actionDateTime DESC`, then newest created first. No delete control exists for any role (BR-07).
- Card content: performer name, role badge, date/time (`Oct 19, 2026, 10:30 AM`, `Asia/Bangkok`); Description; Result; follow-up section; Attachment Notes in italics (e.g. *Look for RAM_diagnostic_report.png*).
- Follow-up: if `followUpRequired`, amber badge "Follow-Up Required" with icon and the note in a callout; otherwise muted "No follow-up needed".
- "Edited" tag with the update time when `updatedAt` is later than `createdAt`.
- Staff/Admin see "+ Record Action" (tab header) and an "Edit" button per card. Requesters see neither.
- Terminal tickets (CLOSED/CANCELLED): "+ Record Action" and "Edit" are hidden and a note reads "This ticket is closed; Actions Taken can no longer be changed."
- Empty state: "No actions recorded yet. IT Staff will log diagnostic and repair steps here."

### 5.3 Create / Edit modal (Staff and Admin)
Header "Record Action Taken" (create) or "Edit Action Taken" (edit). Width `600px` on desktop (to be confirmed against the Lab 3 modal width).

| Field | Rule |
|---|---|
| Action Date/Time | Pre-filled with now. Must be on/after ticket creation and no more than 60 seconds in the future (`min`/`max` set on the input). |
| Performed by (auto) | Disabled display of current user name and role badge. Not sent. |
| Action Description | Textarea, required, 5 to 2,000 characters, with counter. |
| Result | Textarea, required, 5 to 2,000 characters, with counter. |
| Follow-up required | Checkbox "Follow-up required for this issue". |
| Follow-up Note | Textarea, shown always, required (5 to 2,000) when the checkbox is checked. |
| Attachment Notes | Single-line text, optional, up to 500 characters. |

- In edit mode `performedBy` and ticket are read-only; the form sends `expectedUpdatedAt` of that action.
- Validation messages appear under each field and in an error summary with `role="alert"`: "Follow-up note is required when follow-up is checked." and "Action date/time must be after the ticket was created and not in the future."
- The Save button is disabled while validation fails and while a request is pending (spinner), preventing duplicate submits (FR-12).
- Esc, the close button, or clicking outside: if the form has unsaved changes, ask "Discard changes?"; otherwise close. A recoverable network failure keeps the modal open with all input intact and shows a retry banner.
- After a successful create, the timeline refreshes and the page stores the new ticket `updatedAt` (`ticketUpdatedAt` in the response), so a following status change does not raise a false conflict.

## 6. Error and State Mapping

| Situation / code | UI behavior |
|---|---|
| Loading | Skeleton cards (96px) and 4 skeleton rows; container `aria-busy="true"`; status text via `role="status"` |
| Empty | See sections 3 and 5 |
| `VALIDATION_ERROR` | Field-level messages from `details`, focus moves to first invalid field |
| `INVALID_ACTION_DATE` | Message under Action Date/Time (section 5.3) |
| `TICKET_TERMINAL` | Banner "This ticket is closed and can no longer be changed."; controls hidden after refresh |
| `RESOLUTION_ACTION_REQUIRED` | Section 4.2 |
| `STALE_UPDATE` (409) | Alert banner "This record was updated by another user. Reload to see the latest version before saving." with "Reload Latest" button; entered text is kept until reload (AC-21) |
| `FORBIDDEN` (403) | Access Restricted page: "You do not have permission to view this screen." with "Return to Dashboard" |
| `NOT_FOUND` (404) | "Ticket not found. It may not exist or you may not have permission to view it." |
| `UNAUTHORIZED` (401) | Redirect to login with message "Your session has expired." |
| Network / 5xx | Soft red banner "Something went wrong. Please try again." with Retry; no stack traces, SQL or paths |

Error banners use `role="alert"`. Dashboards render failures per card region with a Retry button.

## 7. Responsive Rules

| Viewport | Layout |
|---|---|
| Desktop (>= 1024px) | Staff: 5 cards in one row; feed and quick actions side by side (2/3 + 1/3). Requester: 4 cards in one row. Modal 600px. |
| Tablet (768px to 1023px) | Cards wrap 2 to 3 per row; feed and quick actions stack |
| Mobile (< 768px) | Cards in 1 or 2 columns (wrapping, no sideways scrolling); tables become card stacks; modals full width with sticky footer buttons; hamburger navigation |

No horizontal page scrolling at 360px. Use `min-w-0`, `flex-wrap` and text wrapping instead of hiding overflow. Wide content (long words, tables) wraps or scrolls inside its own container, never the page.

## 8. Accessibility

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; focus trap; Esc handling per section 5.3; focus returns to the opening button.
- Tabs: `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"`; Left/Right arrows and Home/End move between tabs.
- Visible 2px focus ring (`#10403E` on light, `#A7F3D0` on dark surfaces) on all interactive elements.
- Metric cards and quick actions have descriptive `aria-label`s; badges always carry text and icon.
- Text contrast meets WCAG AA (4.5:1); required fields are marked with text, not color alone.

## 9. Assumptions and Decisions

1. Timestamps are stored in UTC and shown in `Asia/Bangkok`.
2. "+N from yesterday" deltas shown in the handout mockup are out of scope (they need a historical-comparison query).
3. Tickets-by-IT-Priority and a "my recent Actions Taken" widget are not part of the Sprint 4 dashboards.
4. Create Ticket remains a Requester-only function (Lab 3 authorization matrix), so it is not in Staff/Admin navigation or quick actions.
5. The dashboard shows status only; the full history stays in Ticket Detail.

## 10. Final Visual & Accessibility Checklist (complete after testing)

- [ ] Design system tokens consistent across all views
- [ ] Requester sees 4 cards with working drill-downs; Staff sees 5 cards with working drill-downs and matching counts
- [ ] Actions Taken visible to all roles; Requester read-only; Admin can record/edit
- [ ] Follow-up and date validation messages placed under the fields
- [ ] Status control shows only permitted transitions; resolution gate feedback works
- [ ] 409 banner with Reload Latest; double-click protection; form data preserved after failures
- [ ] Non-color cues on all badges
- [ ] Keyboard: focus ring, modal focus trap, tab arrows
- [ ] No clipping, overlap or horizontal overflow on desktop, tablet and mobile (360px)