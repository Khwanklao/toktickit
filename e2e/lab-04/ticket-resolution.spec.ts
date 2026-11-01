import { test, expect } from "@playwright/test";
import { createTicketFixture, loginViaUI, assertTestDatabaseGuard, getValidActionDateTimeLocal } from "./helpers.js";

test.describe("E2E-03: Resolution Gate Enforcement in Browser (AC-07, AC-08)", () => {
  test.setTimeout(90000);

  test.beforeAll(() => {
    assertTestDatabaseGuard();
  });

  test("Staff attempts to resolve ticket with 0 actions (blocked), logs Action Taken, then successfully resolves ticket", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // 1. Create a dedicated per-test ticket fixture in IN_PROGRESS status with 0 actions
    const ticket = await createTicketFixture({
      summaryPrefix: "E2E-03 Resolution Gate",
      targetStatus: "IN_PROGRESS",
      actionsCount: 0,
      ownerEmail: "staff.alex@toktickit.local",
    });

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

    // 2. Log in as IT Staff in browser
    await loginViaUI(page, "staff.alex@toktickit.local", "Password123!");
    await page.waitForURL("**/staff/**");

    // Navigate to dedicated fixture ticket (already in IN_PROGRESS with 0 actions)
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.waitForURL(`**/staff/tickets/${ticket.id}`);
    await page.waitForSelector('[data-testid="status-dropdown"]', { timeout: 15000 });

    const statusDropdown = page.locator('[data-testid="status-dropdown"]');
    await expect(statusDropdown).toBeVisible();

    // 3. Attempt to resolve with 0 actions -> Must trigger confirmation modal then be blocked by Resolution Gate
    await page.selectOption('[data-testid="status-dropdown"]', "RESOLVED");

    // Confirmation modal opens
    await page.waitForSelector('[data-testid="status-confirm-modal"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="status-confirm-modal"]')).toBeVisible();

    // Confirm transition attempt
    await page.click('[data-testid="confirm-status-btn"]');

    // 4. Verify Resolution Gate Blocked Banner
    await page.waitForSelector('[data-testid="resolution-required-banner"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="resolution-required-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="resolution-record-action-btn"]')).toBeVisible();

    // Capture screenshot of blocked resolution gate
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/resolution-gate-blocked.png" });

    // 5. Record Action Taken via Resolution Banner Button
    await page.click('[data-testid="resolution-record-action-btn"]');
    await page.waitForSelector('[data-testid="action-description-input"]', { timeout: 10000 });

    const runTimestamp = Date.now();
    await page.fill(
      '[data-testid="action-description-input"]',
      `Reset user Active Directory account and synced O365 license [${runTimestamp}].`
    );
    await page.fill('[data-testid="action-result-input"]', "User logged in successfully via Outlook Web Access.");
    await page.fill('[data-testid="action-datetime-input"]', getValidActionDateTimeLocal(ticket.createdAt));
    await page.click('[data-testid="action-save-btn"]');

    // Wait for modal to close
    await expect(page.locator('[data-testid="action-description-input"]')).not.toBeVisible({ timeout: 10000 });

    // 6. Attempt resolution again now that action is recorded -> Must succeed
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
