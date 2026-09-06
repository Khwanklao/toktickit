# Lab 2 — Peer Review Record

**Author:** Khwanklao Naknan — <student id> — GitHub: @Khwanklao
**Peer reviewer:** Teekhathat — <partner student id> — GitHub: @TeekhathatTT

---

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|:---|:---|:---|
| #11 | feature/issue-1-sprint-spec | Approved |
| #12 | feature/issue-2-data-models | Changes Requested (then Approved) |
| #15 | feature/issue-3-development-requester | Changes Requested (then Approved) |
| #18 | feature/issue-4-ticket-creation | Approved |
| #20 | feature/issue-5-attachments | Approved |
| #22 | feature/issue-6-client-shell | Changes Requested (then Approved) |
| #25 | feature/issue-7-my-tickets-view | Approved |
| #27 | feature/issue-8-ticket-create-detail-final | Approved |
| #28 | lab2-staging (Release to main) | Approved |

---

### Detailed Reviewer Comments & Responses (I Authored)

#### PR #11 (Issue 1: Sprint Engineering Specification & Test Plan)
* **Reviewer comment:** "Everything in this task is done. Good job!"
* **How I responded:** วางโครงสร้างและร่างเอกสาร `specification.md`, `tests.md`, `ui-spec.md` และ `api-spec.md` ครบถ้วนตาม Spec-DD/Test-DD ก่อนเริ่มพัฒนาระบบฐานข้อมูลใน Issue 2

#### PR #12 (Issue 2: Data Models, Migrations & Seeding)
* **Reviewer comment (Changes Requested):**
  1. ความสัมพันธ์ `Attachment -> Ticket` ยังใช้ `ON DELETE RESTRICT` ต้องเปลี่ยนเป็น `ON DELETE CASCADE`
  2. `docs/lab-02/tests.md` ยังมีสถานะ `TBD` แต่ระบุว่ารันเทสแล้ว ให้แก้ผลการทดสอบให้ตรงกับความเป็นจริง
  3. พบ `prisma/schema.prisma` ที่ root ซ้ำกับ `server/prisma/schema.prisma` โดยมี version ไม่ตรงกัน และ migration ไม่ sync กัน ให้ลบ `prisma/` ที่ root ทิ้ง
* **How I responded:**
  1. อัปเดต Foreign Key Constraint เป็น `ON DELETE CASCADE` และบันทึกผลการทดสอบจริงลงใน `tests.md` (Commit: `2a5216a`)
  2. ลบโฟลเดอร์ `prisma/` ที่ root ออก แล้วรวมศูนย์ไว้ที่ `server/prisma/` เพื่อเป็น Single Source of Truth ป้องกัน Version Conflict (Commit: `0772e31`)
  3. Reviewer ตรวจสอบแล้วอนุมัติ: "ดีมาก" และ Merge เข้าสู่ `lab2-staging` (Commit: `1fcbae6`)

#### PR #15 (Issue 3: Ticket Creation Service & POST /api/tickets)
* **Reviewer comment (Changes Requested):**
  1. ลบ fallback ที่ไม่ atomic: ลบ block catch ที่นับ count ออก หาก `nextval('"Ticket_id_seq"')` ล้มเหลวให้ throw error ต่อไปทันที ห้าม fallback ด้วย count
  2. เลิกผูก `id` กับเลขตั๋ว: ลบบรรทัด `id: sequenceNum` ออกจาก `tx.ticket.create()` ปล่อยให้ `id` รัน autoincrement ตาม schema และใช้ `sequenceNum` ไปสร้าง `ticketNumber` เท่านั้น
* **How I responded:** ปรับปรุง `server/src/routes/tickets.ts` ตามคำแนะนำ ลบ fallback count เพื่อรักษาความเป็น atomic sequence และแยก primary key `id` ออกจากการจัดฟอร์แมต `ticketNumber` (Commit: `2907c73`)

#### PR #20 (Issue 5: Attachment Upload, Download & Soft-Delete APIs)
* **Reviewer comment:** "สรุป: ที่ทำมาตรงกับ task description และ spec แล้ว แนะนำเพิ่มเติมด้าน security ให้ sniff MIME จริง และตรวจ auth ก่อนรับไฟล์ จากนั้นเพิ่มเทสต์จำลอง DB failure ให้ตรงกับ API-14 ที่เขียนไว้"
* **How I responded:** ตรวจสอบความถูกต้องของ API endpoints ครบถ้วน พร้อมเพิ่ม test case จำลองข้อผิดพลาดของ Database เพื่อให้ครอบคลุมเงื่อนไข API-14 และ Merge เข้าสู่ `lab2-staging` (Commit: `04a85bd`)

#### PR #22 (Issue 6: Client Setup, Requester Context & Selection UI)
* **Reviewer comment (Changes Requested):**
  - `AppShell.tsx` มีการเรียกใช้ class `max-width-1200` แต่ยังไม่ได้ประกาศใน `client/src/index.css` ส่งผลให้หน้าจอขยายเต็ม layout แทนที่จะถูกจำกัดความกว้างไว้ที่ 1200px
* **How I responded:** เพิ่ม CSS rule `.max-width-1200` และปรับ alignment ของ Header/Breadcrumb ให้เชื่อมต่อกับ Fluid layout อย่างถูกต้อง (Commit: `3ac1719`)

#### PR #25 (Issue 7: My Tickets List View, Search & Filtering)
* **Reviewer comment:** "ตรงกับใน spec"
* **How I responded:** พัฒนาหน้ารายการตั๋วรองรับ Data Table (Desktop) และ Vertical Stacked Cards (Mobile), ระบบค้นหา, คัดกรอง, จัดเรียง และ Pagination พร้อมจัดการแยกระหว่าง Empty State และ No-Results State อย่างถูกต้อง (Merge commit: `835031a`)

#### PR #27 (Issue 8: Ticket Creation, Attachments, Detail View & E2E Tests)
* **Reviewer comment:** ตรวจสอบและประเมินผลผ่านเกณฑ์ครบทุกหัวข้อ (Checklist ผ่านสมบูรณ์):
  - Backend Ticket Creation & Validation (`POST /api/tickets`, Ticket number format, Initial status `NEW`, Header validation 400/403)
  - Ticket Detail ownership isolation & 404 security handling
  - Attachment upload validation (5MB / 5 active files / MIME), Soft-remove lifecycle และปิดกั้นการดาวน์โหลดไฟล์ที่ถูกลบ
  - Create Ticket UI (`/tickets/new`): 5-row layout, live character counter, inline validation, double-submit protection, form preservation upon API failure, sequential attachment upload และ retry without ticket duplication, Confirmation panel (no auto-redirect)
  - Ticket Detail (`/tickets/:id`): Read-only summary, disabled tabs ตาม Scope Exclusions, loading/error/retry states
  - E2E Suites: ครอบคลุม E2E-01 ถึง E2E-04, Responsive Layout Tests (Desktop, Tablet, Mobile)
  - Automated Tests: ผ่านครบถ้วน **107/107 tests** ตรงตามที่บันทึกใน `tests.md`
* **How I responded:** ปรับแก้ Timing assertion ของ Soft-removed badge ใน E2E suite ให้เสถียรจนผ่านครบ 19/19 tests ก่อนส่งมอบงานและ Merge เข้าสู่ `lab2-staging` (Merge commit: `fb7ac9f`)

#### PR #28 (Release: Lab 2 TokTickIT Requester Ticketing MVP to main)
* **Reviewer verdict:** Approved
* **Reviewer comment:** อนุมัติการรวมโค้ดเวอร์ชันสมบูรณ์เข้าสู่ branch `main` หลังผ่านการทดสอบแบบ Full Regression ทั้งระบบ
* **How I responded:** Merge commit `84c3fb5` เข้าสู่ branch `main` และดึงโค้ดล่าสุดลงสู่เครื่อง Local พร้อมปิดสถานะทุก Issue บน Kanban Board เข้าสู่ "Done"

---

## Pull Requests I reviewed for my partner

| PR | Partner Branch | My verdict |
|:---|:---|:---|
| #23 | feature/lab2-ticket | Changes Requested (then Approved) |
| #25 | feature/lab2-frontend | Changes Requested (then Approved) |

---

### Detailed Reviewer Comments & Partner Responses (I Reviewed)

#### PR #23 (Feature/3 lab2-ticket: add ticket and attachment management)
* **My verdict:** Changes Requested (then Approved & Merged)
* **My comments:**
  > ตรวจสอบส่วนอื่น ๆ แล้ว ทั้ง implementation, database, tests และ requirements ต่าง ๆ ถูกต้องครบถ้วน เหลือเพียง API บางจุดที่ต้องแก้ให้ตรงตาม API Contract ใน docs/lab-02/api-spec.md:
  > 1. **GET /api/categories Response:** ปรับให้มี data wrapper `{ data: categories }` ตาม contract
  > 2. **Error Response ของ GET /api/categories:** ปรับให้อยู่ใน Envelope `{ error: { code, message } }`
  > 3. **Partial Success ของ Attachment (BR-16):** ยืนยันว่าหากมีไฟล์แนบไม่ผ่าน validation ตั๋วหลักยังต้องถูกสร้างสำเร็จ (HTTP 201) พร้อมระบุไฟล์ที่ fail ด้วย `uploadFailed: true`
* **Partner's response:** ดำเนินการแก้ไข Response Envelope และปรับปรุงลอจิก Partial Success ของ Attachment ครบถ้วน ได้ทำการ Approve และ Merge เข้าสู่ `lab2-staging`

#### PR #25 (Feature/4 Implement the Lab 2 frontend)
* **My verdict:** Changes Requested (then Approved & Merged)
* **My comments:**
  > จัดกลุ่มสิ่งที่ต้องแก้ไขตามระดับความสำคัญ 4 ด้าน (A, B, C, D) เพื่อให้ตรงตามข้อกำหนดใน specification.md, api-spec.md และ ui-spec.md:
  >
  > **A. Critical — API / Security / Contract:**
  > - **A1. Fix `x-requester-id` authentication header:** ต้องส่งผ่าน HTTP Header เสมอ ไม่ส่งผ่าน query string และรวมศูนย์การเรียก API ไว้ที่ `client/src/api.ts` (หลีกเลี่ยง hard-coded `http://localhost:3000`)
  > - **A2. Fix `GET /api/tickets` integration:** ส่ง query parameters ให้ครบ (search, category, requestedPriority, status, sort, order, page, pageSize), ใช้ metadata ควบคุม pagination และแยกแยะระหว่าง Empty State กับ No-Results State
  > - **A3. Fix partial attachment upload handling:** ตั๋วต้องสร้างสำเร็จแม้มีไฟล์แนบล้มเหลว พร้อมแสดงแจ้งเตือนไฟล์ที่ไม่ผ่านและรองรับ Retry
  >
  > **B. UI / UX — Follow `ui-spec.md`:**
  > - **B1. AttachmentPicker:** ปรับ Dropzone เป็น white surface หลังเลือกไฟล์, แสดงไอคอน/ขนาดไฟล์, แจ้ง warning เมื่อครบ 5/5 ไฟล์ และแสดง inline error ชัดเจน
  > - **B2. Form Styling:** แสดง asterisk สีแดงกำกับ required fields, กำหนด `cursor: not-allowed` และไม่แสดง focus ring บน read-only inputs
  > - **B3. Accessibility:** แสดง Visible focus ring บนคีย์บอร์ดนำทางทุก interactive controls
  > - **B4. AppShell:** เพิ่มปุ่ม Change Requester, รองรับ breadcrumbs และ mobile hamburger menu
  > - **B5. My Tickets UI:** รองรับ Sort บน Table Header, ฟิลเตอร์ Category/Priority, ปุ่ม Clear Filters, Badges และ Mobile Card View
  > - **B6. Ticket Detail & Soft-removal:** เพิ่ม Confirmation modal พร้อมบังคับกรอกเหตุผล 5–200 ตัวอักษร, แสดงป้าย Removed สีเทาและปิดการดาวน์โหลดไฟล์ที่ถูกลบ
  >
  > **C. Consistency & Quality:** รวมศูนย์ API calls ใน `api.ts`, จัดโครงสร้าง Response Handling ให้เป็นรูปแบบเดียว และขยาย Unit/Component test coverage ให้ครอบคลุมทุก Edge Case
  >
  > **D. Minor / Polish:** ตัดทอนชื่อไฟล์ยาวด้วย Ellipsis (...), รองรับ Touch Target ขนาดไม่ต่ำกว่า 44×44px บน Mobile และใช้ข้อความกำกับคู่กับสีบน Status/Priority Badges
* **Partner's response:**
  - ตอบกลับ: "แก้แล้วจั๊ฟ" พร้อมส่ง Commit อัปเดต `Complete Lab 2 frontend ticket workflows` (Commit: `e7a05c6`)
  - แก้ไขปรับปรุงสถาปัตยกรรม API Client, การแสดงผล Form/Attachment States, การเข้าถึงผ่านคีย์บอร์ด และ Responsive layout ครบถ้วนตามรายการ
  - ทำการตรวจสอบความถูกต้องรอบสุดท้าย กด Approve และ Merge เข้าสู่ `lab2-staging` สำเร็จ