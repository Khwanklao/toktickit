# Sprint 3 UI Specification: TokTickIT Design System & Interfaces

## 1. Zen Green Design System Tokens & Foundations
Lab 3 strictly extends the visual system from Lab 2, preserving its clean, calm, and easy-to-use identity.

### 1.1. Color Palette
* **Brand Primary (Zen Green):**
  * Deep Forest Header / Primary Buttons: `#1B4D3E`
  * Primary Hover: `#153C30`
  * Focus Ring / Soft Tint: `#E8F0EC`
* **Neutrals & Surfaces:**
  * App Background: `#F8F9FA`
  * Card / Panel Surface: `#FFFFFF`
  * Table Header Background: `#F1F3F2`
  * Border Default: `#E2E8F0`
  * Border Focused: `#1B4D3E`
  * Text Primary: `#1A202C`
  * Text Secondary (Muted): `#718096`
* **Semantic Feedback:**
  * Danger / Error / Deactivate: `#DC2626` (Surface: `#FEF2F2`, Border: `#FECACA`)
  * Warning / Internal Note Tint: `#D97706` (Surface: `#FFFBEB`, Border: `#FDE68A`)
  * Success / Active State: `#16A34A` (Surface: `#F0FDF4`, Border: `#BBF7D0`)
  * Info / Auditing: `#2563EB` (Surface: `#EFF6FF`, Border: `#BFDBFE`)

### 1.2. Status & Role Badge Conventions
All badges use a compact bold font (Text XS, Bold), fully rounded corners (`rounded-full`), with a soft background and dark text color:

| Category | Badge Label | Background Color | Text Color |
| :--- | :--- | :--- | :--- |
| **Roles** | `Requester` | `#EFF6FF` (Soft Blue) | `#1D4ED8` |
| | `IT Staff` | `#DCFCE7` (Soft Green) | `#15803D` |
| | `Administrator` | `#F3E8FF` (Soft Purple) | `#7E22CE` |
| **Account Status** | `Active` | `#DCFCE7` | `#15803D` |
| | `Inactive` | `#FEE2E2` | `#B91C1C` |
| **Ticket Priority** | `Low` | `#F1F5F9` (Muted Gray) | `#475569` |
| | `Medium` | `#FEF3C7` (Amber) | `#B45309` |
| | `High` | `#FFEDD5` (Orange) | `#C2410C` |
| | `Critical` | `#FEE2E2` (Soft Red) | `#B91C1C` |
| **Ticket Status** | `New` | `#E0E7FF` (Indigo Tint) | `#4338CA` |
| | `Open` | `#DBEAFE` (Blue Tint) | `#1D4ED8` |
| | `In Progress` | `#CCFBF1` (Teal Tint) | `#0F766E` |
| | `Waiting for Requester` | `#FEF3C7` (Amber Tint) | `#B45309` |
| | `Resolved` | `#DCFCE7` (Green Tint) | `#15803D` |
| | `Closed` | `#F1F5F9` (Slate Tint) | `#475569` |
| | `Reopened` | `#FAE8FF` (Fuchsia Tint) | `#86198F` |
| | `Cancelled` | `#FEE2E2` (Red Tint) | `#991B1B` |

---

## 2. Application Shell & Role-Based Navigation
The top navigation bar changes its display based on the authenticated identity and role of the user:

* **Header Styling:** Deep Forest green background (`#1B4D3E`), white text (`#FFFFFF`), 64px height
* **Left Section:** TokTickIT logo (a clock icon inside a circle, alongside the brand text)
* **Center Navigation Links (Dynamic based on role):**
  * `Requester`: Shows the "My Tickets" link and a "+ Create Ticket" button
  * `IT Staff`: Shows the "My Queue" link
  * `Administrator`: Shows the "User Management" and "Ticket Queue (Audit)" links
* **Right Profile Menu:**
  * Displays the user's name with a Role Badge alongside it
  * Dropdown Menu: contains "Change Password" and "Sign Out" options (clears the cookie and navigates back to the login page)
* **Removal of Temporary Controls:** The temporary Requester identity switcher (Development Requester selector) from Lab 2 has been permanently removed

---

## 3. Screen Specifications & User Flows

### 3.1. Login Screen (`/login`)
A concise, secure login screen centered on the page (Centered Card)

* **Layout:** A white card box with a maximum width of 420px, a soft shadow (`shadow-md`), and rounded corners (`rounded-lg`)
* **Form Elements:**
  * TokTickIT logo at the top
  * Email Input: type email, auto-focus, placeholder `user@toktickit.com`
  * Password Input: type password with an eye icon to show/hide password visibility (Show/Hide toggle)
  * Submit Button: full-width Zen Green button with text "Sign in"
* **Client-Side Validation:**
  * When Submit is pressed with empty fields: displays a red warning message below the field, e.g., *"Email is required"* or *"Password is required"*
  * When an invalid email format is entered: displays the warning *"Please enter a valid email address"* immediately on blur from the input
* **Interactive & Feedback States:**
  * *Busy State:* The Sign In button dims, a loading spinner icon appears, and repeated clicks are disabled
  * *Failure Alert:* A soft pink bar (`#FEF2F2`) with a red exclamation icon displays a safe, generic message: `"Invalid email or password. Please try again."` (does not reveal whether the account is inactive or the email doesn't exist)

---

### 3.2. Mandatory First-Login Password Change Screen (`/change-password`)
A forced password-change screen for users with the `mustChangePassword = true` flag

* **Layout:** A centered card identical to the Login page, but with a clear warning heading: *"You must change your password to continue"*
* **Form Elements:**
  * Input: Current (Temporary) Password
  * Input: New Password with a Show/Hide toggle
  * Input: Confirm New Password
  * Real-Time Password Checklist (a security rule checklist):
    * [ ] Be at least 8 characters
    * [ ] Include upper and lower case letters
    * [ ] Include a number and a special character
    *(Each item turns green with a checkmark icon once the user's input satisfies the condition)*
  * Action Button: A Zen Green "Continue" button (only enabled once every checklist item passes and the confirmation password matches)
* **Feedback States:**
  * *Invalid Current Password Error:* Displays the red warning *"Current password is incorrect. Please try again."* if the temporary password entered is incorrect
  * *Mismatch Error:* Displays the red warning *"Passwords do not match"* if Confirm Password does not match New Password
  * *Same Password Error:* Displays the red warning *"New password must not be identical to current password"*

---

### 3.3. Requester My Tickets & Ticket Detail Screens (Lab 2 Regression & Enhancements)

#### 3.3.1. My Tickets Screen (`/tickets`)
A screen displaying only the list of tickets owned by the authenticated Requester

* **Header Controls:** "My Tickets" heading, a summary count of the user's own tickets, and a Zen Green "+ Create Ticket" button
* **Ticket Cards / Table View:** Displays the user's own ticket list; columns include `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `Status` (with a badge colored per the standard)
* **Empty State:** Displays the message *"You haven't submitted any tickets yet"* along with a button to create the first ticket

#### 3.3.2. Requester Ticket Detail Screen (`/tickets/:id`)
A ticket detail screen for the Requester, extending Lab 2 by adding Public Comments and the ability to indicate the problem is resolved

* **Breadcrumb & Header:** `My Tickets > Ticket Detail` with a `<- Back to My Tickets` button
* **Ticket Grouped Info (Read-Only):**
  * Ticket data: Ticket No., Category, Related System, Status Badge, Requested Priority Badge
  * Problem details: Summary and Description Box (Read-Only)
  * Attachments: Displays the existing attachment list from Lab 2 with file name, size, and Preview / Download buttons (attachment behavior and permissions follow the same rules established directly in Lab 2)
* **Requester Action Bar:**
  * **"Problem Appears Resolved" Button:**
    * A Zen Green button that appears clickable only when the ticket has not yet been Resolved/Closed and this signal has not been sent before (`isRequesterResolved = false`)
    * When clicked, a confirmation modal appears: *"Are you sure you want to mark this issue as resolved?"*
    * Once confirmed successfully: the button becomes disabled and a blue info banner appears: *"You indicated that this issue appears resolved. IT Staff will verify and formally close the ticket."*
* **Public Comments Section:**
  * A text box for adding a public comment, with a Zen Green "Post Comment" button
  * A chronological history of comments, showing the author's name, Role Badge (Requester / IT Staff / Admin), timestamp, and content
  * **Security Protection:** This page absolutely has no tab or content relating to Internal Notes

---

### 3.4. IT Staff Ticket Queue (`/staff/queue`)
The main screen for searching, filtering, and accessing tickets, for IT Staff and Administrator (Audit Mode)

* **Header Controls Area:**
  * **Search Bar:** A search field with a magnifying glass icon, placeholder: *"Search by ticket number or summary..."*, supporting debounced search
  * **Filter Triggers:** Dropdown filter buttons:
    * Category Filter (dropdown list of categories)
    * IT Priority Filter (Low, Medium, High, Critical)
    * Status Filter (New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled)
    * Owner Filter (All, Unassigned, Assigned to Me, Specific Active Staff/Admin)
  * **Counter Text:** Displays a result count, e.g., *"Showing 1 to 10 of 87 tickets"*
* **Queue Data Table (Desktop View):**
  * Columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Req. Priority`, `IT Priority`, `Status`, `Owner`
  * Column headers `Ticket No.`, `Created Date`, `Status`, `IT Priority` have arrow icons for click-to-sort (sortable columns)
  * Data rows support a hover effect (turning a very light green, `#F7FAF8`), and a row can be clicked to open the Ticket Detail page
* **Pagination Bar:**
  * `< Previous` button, page numbers `1`, `2`, `3` ... with the current page highlighted by a dark green circle, and a `Next >` button
* **Queue Screen States & Feedback:**
  * *Loading State:* The table shows 5 flickering gray skeleton rows
  * *Empty State:* The table shows the message *"No tickets currently in queue"* when there is no ticket data in the system yet
  * *No-Results State:* Shows an illustration with the message *"No tickets found matching your criteria"* and a "Clear Filters" button
  * *Forbidden State (403):* Shows a centered error screen: *"Access Denied: You do not have permission to view the IT Staff Queue"* with a button to navigate back to Home / My Tickets
  * *Failure / Network Error State:* A red alert bar above the table: *"Failed to load ticket queue. Please check your network connection and retry."* with a "Retry" button

---

### 3.5. IT Staff Ticket Detail Screen (`/staff/tickets/:id`)
The screen for IT Staff to review and manage work on a ticket

* **Breadcrumb & Navigation:**
  * Back link: `My Queue > Ticket Detail` and a `<- Back to Queue` button in the top-right corner
* **Ticket Metadata Card (Grouped Grid Layout):**
  * Row 1: `Ticket No.` (read-only text), `Category` (read-only badge/text), `Related System` (read-only text)
  * Row 2: `Requester` (name and email), `Requested Priority` (badge - read-only), `Current Status` (a dropdown letting IT Staff change status per the Transition Matrix)
  * Row 3:
    * `Ticket Owner` (an assignment dropdown, or a "Claim Ticket" button): **the dropdown list shows every Active IT Staff member and Active Administrator in the system**, or the option to select Unassigned
    * `IT Priority` (a dropdown to adjust Low/Medium/High/Critical, IT Staff only)
* **Ticket Content Section:**
  * `Summary` (the subject line - light gray background, read-only)
  * `Description` (problem details - a multi-line box, read-only)
  * `Requester Resolution Banner` (appears only when the ticket has `isRequesterResolved = true`): a light blue box notifying staff that *"The requester indicated that this issue appears resolved. Please verify and formally update status."*
* **Operational Tabs Section:**
  * **Tab 1: Public Comments (standard Zen Green color):**
    * A text box form for typing a new comment, with a dark green "Post Comment" button
    * A chronological comment history showing initial avatars, author name, Role Badge, creation time, and content
  * **Tab 2: Internal Notes (orange/yellow, for a security warning):**
    * A yellow warning bar reads: *"Internal notes are strictly confidential and only visible to IT Staff and Administrators."*
    * A text box form for internal notes, with a dark orange "Save Note" button
    * The background of content in this tab uses a soft pale yellow (`#FFFBEB`) so it is instantly visually distinguishable, preventing accidental posting in the wrong place
  * **Tab 3: Attachments:**
    * Displays the existing attachment list from Lab 2 with file size and a download button
* **Admin Read-Only Restriction Styling:**
  * If the viewer's role is `Administrator`, the dropdown controls for `Current Status`, `IT Priority`, and `Ticket Owner` are disabled, with a tooltip stating: *"Administrators have read-only audit access to ticket operations."*

---

### 3.6. Administrator User Management Screen (`/admin/users`)
A minimalist screen for managing user accounts

* **Header Controls:**
  * "Users" heading
  * A search field for users by name or email
  * A role filter dropdown (`All Roles`, `Requester`, `IT Staff`, `Administrator`)
  * Primary button: a Zen Green `+ Create User`
* **Users Table:**
  * Columns: `Name`, `Email`, `Role` (badge), `Status` (Active/Inactive badge), `Actions` (an "Edit" button)
* **Create / Edit User Slide-over Panel (Modal / Drawer):**
  * **Panel Title:** "Create New User" or "Edit User"
  * **Field 1: Full Name** (required text input)
  * **Field 2: Email Address** (required email input)
  * **Field 3: Role** (dropdown: `Requester`, `IT Staff`, `Administrator`)
  * **Field 4: Active Toggle Switch** (a green on/off Yes/No switch)
    * *Safety Rule Defense:* If the Admin is editing their own account, or editing the last remaining Active Admin, this switch is disabled with a red warning message beneath it: *"Cannot deactivate your own account or the last active administrator."*
  * **Field 5: Initial Password (Create and Reset modes only):**
    * An initial password input field, with a caption: *"User will be forced to change this password on first login."*
  * **Action Buttons:**
    * A Zen Green "Save User" button
    * A "Reset Initial Password" button (Edit mode only)
    * A gray-bordered "Cancel" button
* **Feedback, Validation & Conflict States:**
  * *Duplicate Email Conflict (409):* If the email is a duplicate of one already in the system, the Email field's border turns red, with a warning message below it: *"This email is already in use by another account."*
  * *Invalid Role Value (400):* Displays the notice *"Please select a valid role from the list."*
  * *Client-Side Validation:* Displays a warning message when a required field is empty, or the password does not meet the minimum 8-character security requirement
  * *Success Banner:* Displays a green toast notification in the top-right corner, e.g., *"User created successfully"* or *"Password reset successfully"*

---

## 4. Screen Modes Summary Matrix
A summary of the operating modes for each screen, per the system's Screen Modes requirements:

| Screen Name | Supported Modes | Mode Description & Key Controls |
| :--- | :--- | :--- |
| **Login (`/login`)** | View / Input | An email and password entry form, with validation and busy-state detection |
| **Change Password (`/change-password`)** | Mandatory Input | A mandatory password-change form with a checklist and page-exit blocking |
| **Requester My Tickets (`/tickets`)** | List View / Empty | A table of tickets the user owns, with a create-ticket button |
| **Requester Ticket Detail (`/tickets/:id`)** | View / Action | View ticket data (read-only), post a public comment, and click Resolve Indication |
| **Staff Ticket Queue (`/staff/queue`)** | Table / Filter / Empty / Error | The work queue table, search/filter functionality, loading skeleton display, no-results, and error alerts |
| **Staff Ticket Detail (`/staff/tickets/:id`)** | Operational Edit / Read-Only | Adjust status, priority, assign owner, post comments/notes (Admin is read-only) |
| **Admin User Management (`/admin/users`)** | List View / Create Modal / Edit Modal | A table of all users, a modal to add a new user, a modal to edit user data and reset passwords |

---

## 5. Responsive Layout Breakpoints & Rules

```
+-------------------------------------------------------------------------+
| Breakpoint       | Screen Width   | Layout Adjustments                  |
+-------------------------------------------------------------------------+
| Desktop (lg/xl)  | >= 1024px      | - Navigation links displayed in row |
|                  |                | - Data tables full-width (all cols) |
|                  |                | - Side-by-side drawer / forms       |
+-------------------------------------------------------------------------+
| Tablet (md)      | 768px - 1023px | - Condensed padding (16px)          |
|                  |                | - Hide less critical table columns  |
|                  |                |   (e.g., Requested Priority)        |
|                  |                | - Modals take 80% screen width      |
+-------------------------------------------------------------------------+
| Mobile (sm)      | < 768px        | - Collapsible hamburger menu        |
|                  |                | - Tables convert into Stacked Cards |
|                  |                | - Forms & modals full-width (100%)  |
|                  |                | - Sticky floating primary buttons   |
+-------------------------------------------------------------------------+
```

### 5.1. Mobile Card Transformation (Ticket Queue & User List)
When the screen is narrower than 768px, tables automatically transform their display into a Vertical Card Stack:
* Each card has a light gray, rounded border with 12px spacing between cards
* Top of the card: displays the Ticket Number or User Name in bold, with the status badge aligned to the top-right
* Middle of the card: displays Summary, Category, and Priority as compact text rows
* Bottom of the card: displays the owner's name and creation time

---

## 6. Visual Consistency & Accessibility Checklist
To comply with the Part 9 evaluation criteria of the Lab 3 worksheet:
* [x] **Focus Indicators:** Elements that receive focus (buttons, forms) must display a clearly visible light green outline (`#1B4D3E` or ring `#A7F3D0`) — not the browser's default blue outline
* [x] **Text Contrast:** The contrast ratio of all text colors (including badges) must meet the WCAG AA minimum of 4.5:1
* [x] **No Horizontal Overflow:** There must be no unwanted horizontal scrollbar at the page/body level, across every viewport size from 360px and up
* [x] **Safe Clippings & Layout Wraps:** Exceptionally long text (e.g., ticket titles, emails) must be truncated appropriately (`truncate` or `break-words`) without overflowing the card box or breaking the table layout