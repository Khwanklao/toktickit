import { test } from "@playwright/test";

test.describe("Lab 3 Responsive Layout Verification & Screenshot Capture", () => {
  test.setTimeout(90000);

  test("Capture responsive screenshots across Authentication, Staff Queue, Staff Detail, and User Management", async ({ page, context }) => {
    // ----------------------------------------------------
    // 1. Authentication Screens (/login)
    // ----------------------------------------------------
    await context.clearCookies();
    await page.goto("/login");
    await page.waitForSelector("#email");

    // Login Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login-desktop.png" });

    // Login Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login-tablet.png" });

    // Login Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/login-mobile.png" });

    // Change Password View
    await page.fill("#email", "req.active4@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    // รอจนกว่าจะไปถึง change-password หรือหน้า landing
    try {
      await page.waitForURL("**/change-password", { timeout: 7000 });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/change-password-desktop.png" });
    } catch {
      // หาก user ไม่ติด change-password ให้เปิดเข้าไปตรงๆ
      await page.goto("/change-password");
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.screenshot({ path: "artifacts/lab-03/screenshots/authentication/change-password-desktop.png" });
    }

    // ----------------------------------------------------
    // 2. Staff Ticket Queue (/staff/queue)
    // ----------------------------------------------------
    await context.clearCookies();
    await page.goto("/login");
    await page.fill("#email", "staff.alex@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL("**/staff/queue");
    await page.waitForSelector('[data-testid="search-input"]');

    // Queue Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-queue/desktop.png" });

    // Queue Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-queue/tablet.png" });

    // Queue Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-queue/mobile.png" });

    // ----------------------------------------------------
    // 3. Staff Ticket Detail (/staff/tickets/:id)
    // ----------------------------------------------------
    await page.goto("/staff/tickets/1");
    await page.waitForURL("**/staff/tickets/1");
    await page.waitForSelector('[data-testid="ticket-metadata-grid"]');

    // Detail Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/desktop.png" });

    // Detail Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/tablet.png" });

    // Detail Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/staff-ticket-detail/mobile.png" });

    // ----------------------------------------------------
    // 4. Admin User Management (/admin/users)
    // ----------------------------------------------------
    await context.clearCookies();
    await page.goto("/login");
    await page.fill("#email", "admin.main@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');
    await page.waitForURL("**/admin/users");

    // Admin Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/user-management/desktop.png" });

    // Admin Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/user-management/tablet.png" });

    // Admin Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-03/screenshots/user-management/mobile.png" });
  });
});