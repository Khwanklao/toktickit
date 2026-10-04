# Lab 3 Reviewer

## Reviewer Identity

- Name: Teekhathat (TeekhathatTT)
- Student ID / Team: 67070501019
- Review date: September 12 – October 2, 2026
- Role: Peer Reviewer / Collaborator

## Pull Requests

| Pull Request | Branch | Scope | Review date | Status |
|---|---|---|---|---|
| [#30](https://github.com/Khwanklao/toktickit/pull/30) | `feature/issue-1-sprint3-spec` | Complete engineering specifications suite (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`) | Sep 12–15, 2026 | Merged |
| Issue 2 PR | `feature/issue-2-auth-foundation` | Authentication foundation, DB migration, password hashing, session cookies, and RBAC security | Sep 17–19, 2026 | Merged |
| [#34](https://github.com/Khwanklao/toktickit/pull/34) | `feature/issue-3-staff-operations` | IT Staff Ticket Queue, Ticket Operations, State Machine (BR-14), Priority Decoupling, Public Comments, and Confidential Internal Notes | Sep 22–24, 2026 | Merged |
| [#36](https://github.com/Khwanklao/toktickit/pull/36) | `feature/issue-4-admin-users-backend` | Administrator User Management screen, User listing/search/filter, Account creation, Self-deactivation guard (BR-23), Last Admin guard (BR-24), Reset initial password (BR-25) | Sep 25–28, 2026 | Merged |
| [#38](https://github.com/Khwanklao/toktickit/pull/38) | `feature/issue-5-auth-ui` | Authentication UI, Mandatory First-login Password Change, Route Guards, IT Staff UI Polish & Responsive views | Sep 30 – Oct 2, 2026 | Merged |

## Review Comments

| Comment ID | File / Section | Comment | Severity | Status |
|---|---|---|---|---|
| RC-01 | File naming | ชื่อไฟล์ผิด `ai_use.md` ต้องเป็น `ai-use.md` และ `test.md` ต้องเป็น `tests.md` | Minor | Resolved |
| RC-02 | `tests.md` (Client Path) | Path เทสต์ client ผิด `tests.md` ใช้ `client/src/__tests__/lab-03/...` แต่ `vite.config.ts` รับแค่ `client/tests/**/*.test.tsx` ต้องแก้เป็น `client/tests/lab-03/...` ไม่งั้นเทสต์จะไม่ถูกรัน | Major | Resolved |
| RC-03 | `specification.md` / `api-spec.md` | Priority enum ชนกับของเดิม schema จริงใช้ `URGENT` แต่เอกสาร Lab 3 ใช้ `CRITICAL` แทนทั้งหมดโดยไม่มีคำอธิบาย ต้องเลือกว่าจะเปลี่ยนไปใช้ค่าไหน | Major | Resolved |
| RC-04 | `specification.md` (BR-14) | State machine (BR-14) ทำอะไรต่อไม่ได้ `REOPENED` ไม่มี transition ออกไปไหนต่อเลย ต้องเพิ่ม เช่น `REOPENED -> IN_PROGRESS, CANCELLED` | Major | Resolved |
| RC-05 | `server/src/utils/auth.ts` / Middleware | ตรวจสอบว่า Server-side Authorization Middleware ครอบคลุมทุก Role และทุก protected endpoint ไม่ใช่แค่ Password Barrier | Major | Resolved |
| RC-06 | Server Controller / Route Handlers | ตรวจสอบว่า `requesterId` จาก client ไม่สามารถเปลี่ยนตัวตนผู้ Requester ได้ตาม BR-03 | Major | Resolved |
| RC-07 | `prisma/schema.prisma` | ตรวจสอบว่า Internal Note ถูกจำกัดเฉพาะ IT Staff/Admin และไม่รั่วข้อมูล ต้องแยกตารางจัดเก็บให้ชัดเจน | Major | Resolved |
| RC-08 | Docs Specification | ตรวจสอบ `docs/lab-03/specification.md`, `api-spec.md`, `tests.md` ว่าตรงกับ implementation และมี transition matrix ครบทั้ง 8 สถานะ | Minor | Resolved |
| RC-09 | `server/src/utils/auth.ts` / Security Vulnerability | พบช่องโหว่ความปลอดภัย: มี fallback `x-requester-id` ที่ปลอมเป็น user คนไหนก็ได้รวมถึง admin โดยไม่ต้องใช้รหัสผ่าน ไม่มี env gate ป้องกัน ทำให้ `requireRole()` ไร้ค่า ต้องลบออกและบังคับ auth ผ่าน session cookie ทางเดียว | Critical | Resolved |
| RC-10 | `client/tests/lab-01/App.test.tsx` | อัปเดต `tests/lab-01/App.test.tsx` ให้ mock AuthProvider/`/api/auth/me` หรือปรับให้ทำงานร่วมกับ auth ได้ เพื่อไม่ให้เกิด regression | Major | Resolved |
| RC-11 | Testing Verification Command | เปลี่ยนคำสั่งตรวจสอบให้รันเทสต์ทั้งระบบ (`npm run test:client` ไม่จำกัด path) ก่อนสรุปว่า "Zero Regression" ทุกครั้ง | Minor | Resolved |
| RC-12 | `.gitignore` / Build Artifacts | มีไฟล์ build artifact (`vite.config.ts.timestamp-*.mjs`) หลุดติด commit ให้ลบออกและเพิ่มกฎลงใน `.gitignore` | Minor | Resolved |
| RC-13 | `server/src/routes/admin.ts` / Security | `reset-password` โดย Admin ไม่ลบ session เดิมของ user (ต่างจาก self-service change-password) ควรเพิ่มเพื่อความปลอดภัยหาก session เดิมถูกขโมย | Major | Resolved |
| RC-14 | `docs/lab-03/tests.md` (Test status) | อัปเดต `docs/lab-03/tests.md` จากสถานะ Planned ให้เป็นผลการทดสอบจริง (Passed) พร้อมใส่ผลการทดสอบให้ครบถ้วน | Minor | Resolved |
| RC-15 | Password Logic & Complexity | ตรวจสอบและปรับแก้กฎของรหัสผ่านให้ตรงกันทั้ง Frontend และ Backend ตามสเปก พร้อมระบบ Real-time Checklist และการห้ามใช้รหัสเดิมซ้ำ | Major | Resolved |
| RC-16 | Auth UI & Route Guards | ตรวจสอบและแก้ไขการทำงานของ Login, Change Password, Route Guard, Role Redirection และ Logout ให้ตรงตามสเปก | Major | Resolved |
| RC-17 | Staff Queue & Detail UI | ตรวจสอบและแก้ Staff Queue / Staff Detail ให้ตรงตาม UI spec และรองรับ Responsive Layout ครบทุก Breakpoint (Desktop, Tablet, Mobile) | Major | Resolved |
| RC-18 | E2E Mapping & Verification | ในตาราง mapping ต้องแก้ E2E-02 เป็นการบังคับเปลี่ยนรหัสผ่าน ไม่ใช่ Failed Login และระบุ Failed Login ให้ตรงกับ test E2E-01..06 พร้อมรัน E2E ยืนยันผลแบบ full regression | Major | Resolved |

## Responses

| Comment ID | Response / Change | Evidence | Resolved date |
|---|---|---|---|
| RC-01 | แก้ไขชื่อไฟล์เอกสารให้ถูกต้องตามโครงสร้าง Lab 3 (`ai-use.md` และ `tests.md`) | Commit `42e0546` | Sep 14, 2026 |
| RC-02 | อัปเดต Path ของ Client test suites ใน `tests.md` ทั้งหมดให้ชี้ไปที่ `client/tests/lab-03/...` ให้ตรงตาม `vite.config.ts` | Commit `42e0546` | Sep 14, 2026 |
| RC-03 | ปรับแก้ Priority Enum ในเอกสารสเปกและ API Contract ให้ตรงกับ Database Schema (`URGENT`) | Commit `42e0546` | Sep 14, 2026 |
| RC-04 | อัปเดต State Transition Matrix ใน BR-14 เพิ่มเส้นทางจาก `REOPENED` ไปยัง `IN_PROGRESS` และ `CANCELLED` | Commit `42e0546` | Sep 14, 2026 |
| RC-05 | เพิ่ม middleware `requireRole(...)` ใน `server/src/utils/auth.ts` พร้อมตรวจสอบสิทธิ์ `Role.REQUESTER` ที่ตั๋ว ตอบกลับ 403 Forbidden ชัดเจน | Commit `e8e29e3` | Sep 18, 2026 |
| RC-06 | บังคับให้ route ดึงตัวตนจาก `req.user.id` ใน session ฝั่ง server เท่านั้น เพิกเฉยต่อ `requesterId` ใดๆ ที่ client ส่งมา | Commit `e8e29e3` | Sep 18, 2026 |
| RC-07 | ยืนยันโครงสร้าง Schema แยกโมเดล `InternalNote` ออกจาก `PublicComment` เด็ดขาด พร้อมมี `authorId` สำหรับจำกัดสิทธิ์เฉพาะ IT Staff/Admin | Commit `e8e29e3` | Sep 18, 2026 |
| RC-08 | ปรับปรุงเอกสารทั้ง 3 ไฟล์ให้สอดคล้องกับโค้ดจริง มี Transition Matrix ครบ 8 สถานะ และ Error/Status Codes ถูกต้อง | Commit `e8e29e3` | Sep 18, 2026 |
| RC-09 | ลบ fallback `x-requester-id` ใน `server/src/utils/auth.ts` ออกทั้งหมด บังคับยืนยันตัวตนผ่าน session cookie ทางเดียว และ refactor ชุดเทสต์ Lab 2 เดิม | Commit `26e5eb0` | Sep 19, 2026 |
| RC-10 | แก้ไข `App.test.tsx` ครอบ mock Auth Provider ให้ทำงานร่วมกับระบบ Auth ของ Lab 3 ได้สมบูรณ์ ปราศจาก Regression | Commit `cd24cdc` | Sep 24, 2026 |
| RC-11 | ปรับปรุงขั้นตอนการตรวจโดยรัน `npm run test:client` เต็มระบบทั้งโปรเจกต์ ยืนยันผ่าน 100% ครบทุกชุดก่อนส่งรีวิว | Commit `cd24cdc` | Sep 24, 2026 |
| RC-12 | ลบไฟล์ build artifact ออกจาก repository และอัปเดตไฟล์ `.gitignore` เพื่อป้องกันไฟล์ชั่วคราวจาก Vite | Commit `c5c70db` | Sep 28, 2026 |
| RC-13 | ปรับปรุง Admin reset-password ให้ทำการ Revoke / ลบเซสชันทั้งหมดของ target user ออกจากฐานข้อมูลทันที | Commit `c5c70db` | Sep 28, 2026 |
| RC-14 | อัปเดต `docs/lab-03/tests.md` เปลี่ยนสถานะจาก Planned เป็น Passed พร้อมลงผลการทดสอบจริง | Commit `c7ad369` | Oct 1, 2026 |
| RC-15 | ปรับปรุงกฎความซับซ้อนของรหัสผ่านฝั่ง Server และ Checklist ฝั่ง Client ให้ตรงกัน รวมถึงตรวจสอบการห้ามใช้รหัสเดิมซ้ำ | Commit `c7ad369` | Oct 1, 2026 |
| RC-16 | ตรวจสอบและปรับแต่ง Route Guards, Role Redirection และถอด RequesterSelector ออกจาก AppShell | Commit `c7ad369` | Oct 1, 2026 |
| RC-17 | ปรับแต่ง UI คิวงานและรายละเอียดงาน IT Staff พร้อมเก็บภาพสกรีนช็อต Responsive บน Desktop, Tablet และ Mobile ครบทุก Breakpoint | Commit `3c50494` | Oct 1, 2026 |
| RC-18 | แก้ไข Mapping ใน `tests.md` ให้ E2E-02 เป็นการเปลี่ยนรหัสผ่านครั้งแรก และปรับรายละเอียดเทสต์ให้ตรงกับ E2E-01..06 พร้อมรันเทสต์ผ่าน 100% ทั้งระบบ | Commit `3c50494` | Oct 1, 2026 |

## Approval

- Reviewer decision: Approved
- Reviewer name: TeekhathatTT
- Approval date: October 2, 2026
- Approval evidence / link: Pull Request #38 (Merged into `lab3-staging` and finalized into `main`)




## Review Comments Given

| Comment ID | Target PR | File / Section | Review Comment | Severity | Status |
|---|---|---|---|---|---|
| RC-P1-01 | PR #38 | `specification.md` (L66) | สเปก Password Hashing: ระบุค่า cost factor ของ `scryptSync` ให้ชัดเจน (N, r, p, key length) และระบุรูปแบบการ encode กับวิธีจัดเก็บ salt กับ hash ลง DB | Major | Resolved |
| RC-P1-02 | PR #38 | `api-spec.md` | รายละเอียดราย Endpoint: ใส่ Related FR/BR และ Error response/status codes กำกับไว้ใต้แต่ละ endpoint โดยตรง ไม่กองไว้ท้ายเล่ม และแยกรายละเอียด API ฝั่ง Lab 2 ออกมาเป็นราย endpoint | Major | Resolved |
| RC-P1-03 | PR #38 | `specification.md` | ตาราง Traceability: เพิ่มตาราง Mapping คู่ FR → AC เพื่อให้ตรวจสอบได้ตามเกณฑ์ Self-Check (Every FR maps to at least one AC) | Major | Resolved |
| RC-P1-04 | PR #38 | `spec` / `api-spec` | สิทธิ์ Ticket Owner ของ Administrator: ปรับความสอดคล้องระหว่าง BR-11, BR-16 และ `api-spec.md` ให้ชัดเจนว่า Administrator สามารถถูก Assign/Reassign ได้หรือไม่ กำหนดบทบาทให้ตรงกันทุกจุด | Major | Resolved |
| RC-P1-05 | PR #38 | `specification.md` (L115) | สถานะ `PENDING` ใน `TicketStatus`: ให้ระบุให้ชัดเจนระหว่าง Legacy-only หรือใส่แผน Migration เพื่อ map `PENDING` → `WAITING_FOR_REQUESTER` เพื่อให้ Enum มี 8 สถานะตามโจทย์อย่างเคร่งครัด | Major | Resolved |
| RC-P4-01 | Issue 4 | `server/src/admin-users.ts` | Blocker 1 (Race Condition): ระบบนับ `count()` แล้วตามด้วย `update()` ในการป้องกัน Last Active Admin เสี่ยงต่อ Race Condition เมื่อมี concurrent requests ต้องใช้ Serializable Transaction พร้อม Retry Logic หรือ Database Row/Advisory Lock และเพิ่ม Concurrency Integration Test | Critical | Resolved |
| RC-P4-02 | Issue 4 | `client/e2e/user-administration.spec.ts` | Blocker 2 (E2E Test Flow): หน้าจอกรอง Role เป็น `ADMINISTRATOR` ค้างไว้ แต่ฟอร์มสร้าง User มีค่าดีฟอลต์เป็น `REQUESTER` เมื่อบันทึกแล้ว search หาจึงไม่เจอปุ่ม Edit ต้องรีเซ็ต Role Filter (`selectOption("")`) หลังสร้างเสร็จ หรือเลือก Role ให้ตรงกับ Filter ตั้งแต่แรก และระวัง Duplicate Locator | Major | Resolved |
| RC-P4-03 | Issue 4 | `UserManagementPage.tsx` | Error Handling บน UI ไม่แยกสถานะ 401 กับ 403 ยุบรวมเป็น `sessionExpired` เหมือนกัน ควรแยกชัดเจนระหว่าง "Session หมดอายุ/ไม่ได้ล็อกอิน (401)" กับ "ล็อกอินแล้วแต่ไม่มีสิทธิ์ Admin (403)" | Major | Resolved |
| RC-P4-04 | Issue 4 | Form Submission | ข้อมูล Input ไม่ถูก Normalize ตอนกด Submit โดยหน้าบ้านเช็ค `form.name.trim()` เพื่อดูค่าว่าง แต่ตอนส่ง Payload ไป API ยังส่ง `form.name` เดิมที่มีช่องว่างหัวท้าย | Minor | Resolved |
| RC-P4-05 | Issue 4 | Dialog Component | ขาด Modal Accessibility (a11y): ต้องมี Focus Trap (ไม่ให้กด Tab หลุดออกนอก Modal), มีการคืน Focus กลับไปยังปุ่มเดิมที่กดเปิด และรองรับปุ่ม Escape ในการปิดหน้าต่าง | Minor | Resolved |
| RC-P4-06 | Issue 4 | `tests.md` / Verification | ห้ามสรุปสถานะเอกสารเป็น PASS จนกว่าจะมี Check Runs บน GitHub หรือแนบ Log ผลการรันเทสต์จริงทั้งระบบ (Build, Lint, Unit/Integration, E2E) ยืนยันครบถ้วน | Minor | Resolved |

## Responses by Author (TeekhathatTT)

| Comment ID | Author Response / Change | Evidence | Resolved date |
|---|---|---|---|
| RC-P1-01 to 05 | อัปเดตพารามิเตอร์ scrypt, กระจาย Error Code ราย Endpoint, เพิ่มตาราง FR → AC, ปรับบทบาท Admin Ticket Owner และระบุแผนจัดการสถานะ `PENDING` สู่ 8 สถานะมาตรฐาน | Commit `6bec839` | Sep 25, 2026 |
| RC-P4-01 | เพิ่ม Retry Handler จัดการข้อผิดพลาด Prisma `P2034` พร้อมเขียน Concurrency Integration Test ยืนยันการล็อกสิทธิ์ป้องกันการลบ Admin คนสุดท้าย | Commit ใน PR #41 | Sep 29, 2026 |
| RC-P4-02 | ปรับแก้ขั้นตอนใน E2E test ให้รีเซ็ตค่าตัวกรอง Role ก่อนค้นหาผู้ใช้ที่สร้างใหม่ และเจาะจง Locator ให้แม่นยำตาม Viewport | Commit ใน PR #41 | Sep 29, 2026 |
| RC-P4-03 | แยก UI State แสดงผลอย่างชัดเจนระหว่าง 401 Unauthorized (นำทางไปหน้า Login) และ 403 Forbidden (แสดงข้อความปฏิเสธสิทธิ์) | Commit ใน PR #41 | Sep 29, 2026 |
| RC-P4-04 | ปรับปรุงฟอร์มให้ทำการ Trim และ Normalize ข้อมูล Text Inputs ทั้งหมดก่อนประกอบเป็น Payload ส่งไปให้ Backend API | Commit ใน PR #41 | Sep 29, 2026 |
| RC-P4-05 | เพิ่ม Focus Trap และคืน Focus ให้กับปุ่ม Trigger เดิมเมื่อปิด Dialog เพื่อให้เป็นไปตามมาตรฐาน Accessibility (WCAG) | Commit ใน PR #41 | Sep 29, 2026 |
| RC-P4-06 | รันคำสั่งทดสอบครบทุกระดับและแนบผลการทดสอบจริงก่อนอัปเดตสถานะในเอกสาร `tests.md` เป็น PASS | - | Sep 29, 2026 |