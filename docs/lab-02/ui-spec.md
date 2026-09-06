# Lab 2 UI Specification: TokTickIT Zen Green Design System

## 1. Visual Design Language & Color Tokens

| Token Name | Hex Code / Value | Usage & Context |
| :--- | :--- | :--- |
| `primary-green` | `#006B3C` | App header, primary action buttons, main emphasis[cite: 1] |
| `secondary-green` | `#0B7A46` | Active navigation tabs, link hover, focus ring accents[cite: 1] |
| `pale-green` | `#EAF6EF` | Selected card highlights, success banners, subtle section emphasis[cite: 1] |
| `page-bg` | `#F5F7F6` | Global page background (neutral soft white-gray)[cite: 1] |
| `surface-card` | `#FFFFFF` | Form cards, tables, modal containers[cite: 1] |
| `text-primary` | `#1A2E22` | Dark charcoal-green for primary body text and titles[cite: 1] |
| `text-muted` | `#5A6E63` | Subtitles, helper text, timestamps, table column headers |
| `border-neutral` | `#D1DCD5` | Default input borders, card borders, table dividers |
| `field-readonly-bg` | `#EDF2EE` | Background for read-only / system-generated inputs[cite: 1] |
| `field-disabled-bg` | `#F1F3F2` | Background for disabled (not merely read-only) inputs; text at 50% opacity |
| `error-red` | `#B91C1C` | Field validation text, input error borders, destructive buttons[cite: 1] |
| `error-bg` | `#FEF2F2` | Background for error alert callouts and banners |
| `warning-amber` | `#D97706` | Warning badge, callouts (not for general decoration)[cite: 1] |
| `warning-bg` | `#FFFBEB` | Warning banner background |
| `info-blue` | `#0369A1` | Informational callouts (e.g. "Authentication coming in Lab 3")[cite: 1] |
| `info-bg` | `#EFF8FF` | Informational callout background |

---

## 2. Typography & Spacing System
- **Font Family:** Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Scale:**
  - Page Title: `1.5rem` (24px), font-weight 700
  - Section Title: `1.125rem` (18px), font-weight 600
  - Body / Form Inputs: `0.875rem` (14px), font-weight 400
  - Labels / Table Headers: `0.75rem` (12px), font-weight 600, uppercase or sentence case
  - Small / Helper / Error: `0.75rem` (12px), font-weight 400
- **Form Controls:** Consistent height of `40px` (`h-10`) for single-line inputs and dropdowns[cite: 1]. Multiline Description minimum height `120px`, resizable vertically only, capped so it never breaks the card layout[cite: 1].
- **Focus Ring:** `2px solid #0B7A46` with an offset of `2px`, applied to every interactive element (inputs, buttons, links, table sort headers) for full keyboard navigation[cite: 1].

---

## 3. Component Hierarchy & States

### 3.1 Buttons
- **Primary Button:** Solid background `#006B3C`, white text, border radius `6px`[cite: 1].
  - *Hover:* `#0B7A46`
  - *Disabled:* `#94A3B8` background, white text at reduced opacity, cursor `not-allowed`[cite: 1]
  - *Busy / In-flight:* Shows spinner + text "Submitting…", button disabled, no double-submit possible (`BR-11`)[cite: 1]
- **Secondary Button:** White background, border `1px solid #D1DCD5`, text `#1A2E22`.
  - *Disabled:* border `#E5E9E7`, text `#94A3B8`
- **Destructive Button:** White/transparent background, red text `#B91C1C`, border `1px solid #B91C1C`.
  - *Busy:* spinner + "Removing…", disabled during the soft-removal request
- **Icon-Only Buttons:** Must provide `aria-label` and a visible tooltip on hover/focus[cite: 1].

### 3.2 Form Input States
Every input field must be visually distinguishable in each of the following five states[cite: 1]:

| State | Background | Border | Text | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Editable (default)** | `#FFFFFF` | `1px solid #D1DCD5` | `#1A2E22` | Normal interactive state, no error[cite: 1] |
| **Focused** | `#FFFFFF` | `2px solid #0B7A46` | `#1A2E22` | Focus ring per Section 2; keyboard Tab & mouse click[cite: 1] |
| **Read-only** | `#EDF2EE` | `1px solid #D1DCD5` | `#1A2E22` | System-generated values (e.g. Ticket Number, Requester)[cite: 1] |
| **Disabled** | `#F1F3F2` | `1px solid #E5E9E7` | `#1A2E22` (50% opacity) | Temporarily not interactive (e.g. while submitting)[cite: 1] |
| **Invalid** | `#FFFFFF` | `1px solid #B91C1C` | `#1A2E22` | Validation error message shown directly below[cite: 1] |

- **Labels:** Positioned above input controls with uniform font weight[cite: 1].
- **Required Indicator:** Red asterisk (`*`) placed next to the label. The asterisk alone never substitutes for a validation message[cite: 1].
- While a Create Ticket submission is in flight (`BR-11`), all form fields switch to `Disabled` and the Submit button switches to `Busy` simultaneously[cite: 1].

### 3.3 Validation Errors
- Dark red text `#B91C1C` placed directly below the invalid control[cite: 1].
- Input border turns `#B91C1C` (Invalid state per 3.2)[cite: 1].
- Errors appear on blur and on submit attempt; they never appear only as a single banner at the top of the form[cite: 1].

### 3.4 Status & Priority Badges
Every badge pairs a background tint with an explicit textual label (never color alone)[cite: 1]:
- **Priority:**
  - `LOW`: Light green background (`#DCFCE7`), dark green text (`#166534`)
  - `MEDIUM`: Light amber background (`#FEF3C7`), dark amber text (`#92400E`)
  - `HIGH`: Light orange background (`#FFEDD5`), dark orange text (`#C2410C`)
  - `URGENT`: Light red background (`#FEE2E2`), dark red text (`#991B1B`)
- **Status:**
  - `NEW`: Light blue-gray background (`#E0F2FE`), text (`#0369A1`)[cite: 1]
  - `IN_PROGRESS`: Light emerald background (`#D1FAE5`), text (`#047857`)
  - `RESOLVED`: Light violet background (`#EDE9FE`), text (`#6D28D9`)
  - `CLOSED`: Gray background (`#F3F4F6`), text (`#4B5563`)

---

## 4. Shared Screen-Level States

| State | Appearance | Applies To |
| :--- | :--- | :--- |
| **Initial** | Default rendered view once data (or the empty form) is ready | All screens |
| **Loading** | Skeleton rows/cards or centered spinner; no layout shift once loaded[cite: 1] | My Tickets, Ticket Detail, Requester Selector[cite: 1] |
| **Validation Error** | Inline, per-field, red text below the field[cite: 1] | Create Ticket[cite: 1] |
| **Submitting / Busy** | Primary button busy state + all fields Disabled[cite: 1] | Create Ticket, Attachment upload/removal[cite: 1] |
| **Success** | Green confirmation banner (`pale-green` bg) with concrete result & next action[cite: 1] | Create Ticket, Attachment upload/removal[cite: 1] |
| **API Failure** | Dismissible red banner (`error-bg`/`error-red`); all form values preserved (`BR-10`)[cite: 1] | Create Ticket, My Tickets, Ticket Detail, Requester Selector[cite: 1] |
| **Empty vs. No-Results** | Two visually distinct states per `BR-12` (different copy and illustrations)[cite: 1] | My Tickets[cite: 1] |

---

## 5. Screen Layouts

### 5.1 Application Shell & Navigation
- **Top Header Bar (`#006B3C`):**[cite: 1]
  - Left: "TokTickIT" logo with clock icon[cite: 1].
  - Center/Nav: Links to "My Tickets" and "Create Ticket" (active item highlighted with `#0B7A46` underline/background)[cite: 1].
  - Right: Development Requester identity pill showing the active Requester's name and a "Change Requester" action[cite: 1].
- **Responsive Navigation:** Hamburger dropdown drawer on screens `< 768px`[cite: 1].

### 5.2 Development Requester Selection Screen (`/select-requester`)
- Centered card container (max-width `540px`) on `#F5F7F6` background[cite: 1].
- Header with user-switch icon and title "Select Development Requester"[cite: 1].
- Explanatory callout: *"Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen."*[cite: 1]
- Dropdown select listing active Requesters populated from PostgreSQL[cite: 1].
- Informational note (`info-bg`/`info-blue`): *"Authentication coming in Lab 3."*[cite: 1]
- Action: "Continue" button — disabled when no Requester is selected[cite: 1].
- Loading state: Dropdown shows a skeleton/spinner while requesters are being fetched[cite: 1].
- Empty state (`BR-19`): If zero active Requesters exist, shows "No active development requesters are available." and Continue stays disabled[cite: 1].
- Failure state (`BR-18`): Safe, dismissible error banner with a "Retry" button[cite: 1].

### 5.3 Create Ticket Screen (`/tickets/new`)
- **Breadcrumbs:** `My Tickets > Create Ticket`
- **Card Layout:**
  - Row 1 (Read-only / System): Requester Name (pre-filled, `field-readonly-bg`), Date/Time (read-only)[cite: 1].
  - Row 2 (Classification): Category (Dropdown *), Related System (Dropdown *), Requested Priority (Dropdown *)[cite: 1].
  - Row 3: Summary input (single line *, min 5 / max 100 chars, live character counter)[cite: 1].
  - Row 4: Description textarea (multiline *, min 10 / max 2000 chars, live character counter)[cite: 1].
  - Row 5: Attachment upload drag-and-drop zone with accepted formats and 5MB / 5-files limit notice[cite: 1].
  - Actions: "Cancel" (Secondary) and "Submit Ticket" (Primary Green)[cite: 1].

#### 5.3a Create Ticket — Screen States
- **Initial:** Empty form, defaults applied, Requester/Date pre-filled read-only[cite: 1].
- **Validation Error:** Per-field inline errors; Submit remains enabled for retry[cite: 1].
- **Submitting:** All fields `Disabled`, Submit shows busy state ("Submitting…") (`BR-11`)[cite: 1].
- **Success:** Form is replaced by a `pale-green` confirmation panel showing the generated Ticket Number (`TKT-YYYY-XXXXXX`) and two actions: "View Ticket" and "Create Another Ticket"[cite: 1].
- **API Failure:** Red dismissible banner above the form; form values preserved (`BR-10`)[cite: 1].

#### 5.3b Attachment Control — States (Create Ticket & Ticket Detail)

| State | Appearance |
| :--- | :--- |
| **Empty / Idle** | Drag-and-drop zone with format/size/count hint text[cite: 1] |
| **File selected, valid** | File chip with name, size, and a remove (✕) icon, awaiting submission[cite: 1] |
| **File selected, invalid** | File chip in `error-bg` with inline error message; rejected client-side before network request (`AC-23`)[cite: 1] |
| **Uploading** | Progress bar or spinner on the file chip; control disabled during upload[cite: 1] |
| **Upload failed after Ticket saved (`BR-20`)** | File chip in `error-bg` with "Upload failed — Ticket was saved. Retry upload." and "Retry" button[cite: 1] |
| **Active (existing)** | Filename, size, upload date, download icon, destructive "Remove" button[cite: 1] |
| **Soft-removed** | Filename with strikethrough + gray "Removed" badge, removal reason visible, download disabled[cite: 1] |

### 5.4 My Tickets Screen (`/tickets`)
- **Header:** "My Tickets" title, subtitle "View and track all of your support requests", and "+ Create Ticket" primary button[cite: 1].
- **Filter Toolbar:**
  - Search input (queries Ticket Number and Summary)[cite: 1].
  - Dropdowns: Category, Requested Priority, Status[cite: 1].
  - "Clear Filters" button (visible only when filters are applied)[cite: 1].
- **Sorting (`FR-09`, `BR-08`, `BR-17`):**
  - Desktop: `Ticket No`, `Created Date`, and `Last Updated` column headers are clickable with sort chevrons[cite: 1].
  - Mobile: "Sort by" dropdown (Created Date, Last Updated, Ticket Number) with asc/desc toggle[cite: 1].
  - Default: `Created Date DESC` with `Ticket Number DESC` tie-breaker[cite: 1].
- **Data Representation:**
  - Desktop (≥992px): Data table with columns `Ticket No`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `Current Status`, `Last Updated`[cite: 1].
  - Mobile (<768px): Stacked card view displaying key metadata and badges without horizontal scrolling[cite: 1].
- **List States:**
  - Loading: Skeleton rows (desktop) or skeleton cards (mobile)[cite: 1].
  - Empty State (`BR-12`): Ticket illustration, "No tickets found. Create your first support ticket to get started.", "Create Ticket" CTA[cite: 1].
  - No-Results State (`BR-12`): "No tickets match your search or filter criteria.", "Clear Filters" CTA[cite: 1].
  - API Failure: Dismissible error banner with "Retry" action[cite: 1].
- **Pagination Footer:** Displays total count (`Showing 1 to 10 of 42 tickets`), Previous/Next, page numbers, and page size selector (`10/25/50`)[cite: 1].

### 5.5 Ticket Detail Screen (`/tickets/:id`)
- **Breadcrumbs:** `My Tickets > Ticket Details` with "← Back to My Tickets" link[cite: 1].
- **Header Details Card (Read-only):** Shaded `field-readonly-bg` style showing Ticket No, Ticket Date, Category, Related System, Requester, Requested Priority, IT Priority, Status, Summary, Description[cite: 1].
- **Tabbed Interface:**
  - Tab "Attachments" (Active in Lab 2)[cite: 1].
  - Tabs "Public Comments", "Service Actions", "Event Log" (Disabled / Placeholder per Lab 2 Scope Exclusions)[cite: 1].
- **Attachment Section:**
  - List of attachments using states defined in 5.3b[cite: 1].
  - "Add Attachment" control (disabled once 5 active files reached)[cite: 1].
  - Soft-removal confirmation modal: Requires non-empty reason before removal is enabled (`AC-22`); "Cancel" leaves attachment unchanged (`AC-21`)[cite: 1].
- **Access Violation / Not Found:** If ticket does not belong to active Requester, displays safe "Ticket not found" state (`BR-04`)[cite: 1].

---

## 6. Responsive Behavior Breakpoints

| Viewport Width | Layout & Adaptations |
| :--- | :--- |
| **Desktop (≥ 992px)** | Multi-column grid layout, table list view with clickable sort headers, centered container max-width `1200px`[cite: 1]. |
| **Tablet (768px – 991px)** | 2-column form grids; Summary and Description full width; table falls back to cards if overflow occurs[cite: 1]. |
| **Mobile (< 768px)** | Single-column vertical stack; My Tickets as stacked cards with "Sort by" dropdown; hamburger nav; touch target ≥ 44×44px; zero horizontal page overflow[cite: 1]. |

---

## 7. Accessibility Rules
- Every interactive element is reachable via `Tab` and operable via `Enter`/`Space`, with the focus ring visible[cite: 1].
- Every icon-only control has an `aria-label` and visible tooltip[cite: 1].
- Status/priority is never conveyed by color alone (badges carry text labels)[cite: 1].
- Form errors use `aria-describedby` associated with their respective input[cite: 1].
- Soft-removal modal traps keyboard focus while open and returns focus to triggering element on close.

---

## 8. Visual Inspection Checklist
- [ ] No clipped labels, truncated badges, or cut-off buttons at any viewport[cite: 1].
- [ ] No overlapping text or controls (e.g. validation message overlapping next field)[cite: 1].
- [ ] No unintended horizontal scrolling at Mobile or Tablet widths[cite: 1].
- [ ] Read-only, Disabled, Invalid, and Focused input states are visually distinct (3.2)[cite: 1].
- [ ] All badges show text labels, not color swatches alone[cite: 1].
- [ ] Sort indicator (chevron) reflects actual sort field and direction[cite: 1].
- [ ] Empty State and No-Results State use different copy and imagery (`BR-12`)[cite: 1].
- [ ] Attachment states (Idle, Valid, Invalid, Uploading, Upload-failed, Active, Soft-removed) are distinct[cite: 1].
- [ ] Focus ring is visible on every interactive element during keyboard navigation[cite: 1].

---

## 9. Screenshot Artifact Targets
- `artifacts/lab-02/screenshots/create-ticket/` (Desktop, Tablet, Mobile, Validation error, Submitting, Success, API failure, Invalid-attachment)[cite: 1]
- `artifacts/lab-02/screenshots/my-tickets/` (Desktop table w/ sort applied, Mobile cards, Loading, Empty state, No-results state)[cite: 1]
- `artifacts/lab-02/screenshots/ticket-detail/` (Read-only view, Attachment list incl. uploading/failed/removed states, Removal confirmation modal)[cite: 1]