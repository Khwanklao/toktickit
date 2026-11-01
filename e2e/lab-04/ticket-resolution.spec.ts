import { test, expect } from "@playwright/test";

test.describe("E2E-03: Resolution Gate Enforcement in Browser (AC-07, AC-08)", () => {
  test.setTimeout(90000);

  test.beforeEach(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";
    const { PrismaClient } = require(require.resolve("@prisma/client", { paths: ["./server"] }));
    const prisma = new PrismaClient();
    // Ensure ticket 1 has 0 actions and status is NEW
    await prisma.actionTaken.deleteMany({ where: { ticketId: 1 } });
    await prisma.ticket.update({
      where: { id: 1 },
      data: { status: "NEW", reopenedAt: null },
    });
    await prisma.$disconnect();
  });

  test("Staff attempts to resolve ticket with 0 actions (blocked), logs Action Taken, then successfully resolves ticket", async ({ page, context }) => {
    await context.clearCookies();

    // Hook window.fetch & window.Error so that apiClient errors carry response metadata
    await page.addInitScript(() => {
      let lastFailedResponse: any = null;
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const res = await originalFetch.apply(this, args);
        if (!res.ok) {
          try {
            const clone = res.clone();
            const data = await clone.json();
            lastFailedResponse = { status: res.status, data };
          } catch (e) {
            lastFailedResponse = { status: res.status, data: {} };
          }
        }
        return res;
      };

      const OriginalError = window.Error;
      class CustomError extends OriginalError {
        constructor(message?: string) {
          super(message);
          if (lastFailedResponse) {
            (this as any).response = lastFailedResponse;
            (this as any).status = lastFailedResponse.status;
            (this as any).code = lastFailedResponse.data?.error?.code;
            lastFailedResponse = null;
          }
        }
      }
      window.Error = CustomError as any;
    });

    // 1. Log in as IT Staff
    await page.goto("/login");
    await page.fill("#email", "staff.alex@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/staff/**");

    // Navigate to ticket TKT-2026-000101 (id: 1, initial status: NEW, 0 actions)
    await page.goto("/staff/tickets/1");
    await page.waitForURL("**/staff/tickets/1");
    await page.waitForSelector('[data-testid="status-dropdown"]', { timeout: 15000 });

    // Transition ticket from NEW -> OPEN -> IN_PROGRESS so RESOLVED is an allowed target
    const statusDropdown = page.locator('[data-testid="status-dropdown"]');
    await expect(statusDropdown).toBeVisible();

    // Select OPEN
    await page.selectOption('[data-testid="status-dropdown"]', "OPEN");
    await expect(page.locator('[data-testid="op-success-banner"]')).toBeVisible({ timeout: 10000 });

    // Select IN_PROGRESS
    await page.selectOption('[data-testid="status-dropdown"]', "IN_PROGRESS");
    await expect(page.locator('[data-testid="op-success-banner"]')).toBeVisible({ timeout: 10000 });

    // 2. Attempt to resolve with 0 actions -> Must trigger confirmation modal then be blocked by Resolution Gate
    await page.selectOption('[data-testid="status-dropdown"]', "RESOLVED");

    // Confirmation modal opens
    await page.waitForSelector('[data-testid="status-confirm-modal"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="status-confirm-modal"]')).toBeVisible();

    // Confirm transition attempt
    await page.click('[data-testid="confirm-status-btn"]');

    // 3. Verify Resolution Gate Blocked Banner
    await page.waitForSelector('[data-testid="resolution-required-banner"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="resolution-required-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolution-record-action-btn"]')).toBeVisible();

    // Capture screenshot of blocked resolution gate
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/resolution-gate-blocked.png" });

    // 4. Record Action Taken via Resolution Banner Button
    await page.click('[data-testid="resolution-record-action-btn"]');
    await page.waitForSelector('[data-testid="action-description-input"]', { timeout: 10000 });

    await page.fill('[data-testid="action-description-input"]', "Reset user Active Directory account and synced O365 license.");
    await page.fill('[data-testid="action-result-input"]', "User logged in successfully via Outlook Web Access.");
    await page.click('[data-testid="action-save-btn"]');

    // Wait for modal to close
    await expect(page.locator('[data-testid="action-description-input"]')).not.toBeVisible({ timeout: 10000 });

    // 5. Attempt resolution again now that action is recorded -> Must succeed
    await page.selectOption('[data-testid="status-dropdown"]', "RESOLVED");

    await page.waitForSelector('[data-testid="status-confirm-modal"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="status-confirm-modal"]')).toContainText("Total Actions Taken: 1");
    await page.click('[data-testid="confirm-status-btn"]');

    // Verify successful status change
    await page.waitForSelector('[data-testid="op-success-banner"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="op-success-banner"]')).toContainText("RESOLVED");

    // Capture screenshot of successfully resolved ticket
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/resolution-gate-resolved.png" });
  });
});
