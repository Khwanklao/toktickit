import { test, expect } from "@playwright/test";

test.describe("E2E-05: Staff Ticket Management Flow", () => {
  test("IT Staff logs in, navigates queue, claims ticket, changes priority, updates status, and posts internal note", async ({ page }) => {
    // 0. Ensure a ticket exists in DB by seeding via requester API
    await page.request.post("http://localhost:3000/api/auth/login", {
      data: { email: "req.active1@toktickit.local", password: "Password123!" },
    });
    await page.request.post("http://localhost:3000/api/tickets", {
      headers: { "x-requester-id": "1" },
      data: {
        title: "VPN Access Issue E2E",
        summary: "VPN Access Issue E2E",
        description: "Cannot connect to campus VPN server from home.",
        categoryId: 1,
        relatedSystemId: 3,
        requestedPriority: "MEDIUM",
      },
    });

    // 1. Login as IT Staff using page.request so session cookie is attached to page context
    await page.request.post("http://localhost:3000/api/auth/login", {
      data: { email: "staff.alex@toktickit.local", password: "Password123!" },
    });

    await page.goto("/staff/queue");
    await page.waitForURL("**/staff/queue");
    await page.waitForSelector('[data-testid="desktop-queue-table"]', { timeout: 10000 });

    // 2. Open first ticket in queue
    const firstRow = page.locator('[data-testid^="queue-row-"]').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Should navigate to ticket detail page
    await page.waitForURL("**/staff/tickets/*");
    await page.waitForSelector('[data-testid="ticket-metadata-grid"]');

    // 3. Claim Ticket if unassigned or available
    const claimBtn = page.locator('[data-testid="claim-ticket-btn"]');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator('[data-testid="op-success-banner"]')).toBeVisible();
    }

    // 4. Update IT Priority
    await page.selectOption('[data-testid="it-priority-dropdown"]', "URGENT");
    await expect(page.locator('[data-testid="op-success-banner"]')).toBeVisible();

    // 5. Update Status
    const statusDropdown = page.locator('[data-testid="status-dropdown"]');
    const currentStatus = await statusDropdown.inputValue();
    if (currentStatus === "NEW") {
      await statusDropdown.selectOption("OPEN");
    } else if (currentStatus === "OPEN") {
      await statusDropdown.selectOption("IN_PROGRESS");
    }
    await expect(page.locator('[data-testid="op-success-banner"]')).toBeVisible();

    // 6. Post Internal Note
    await page.click('[data-testid="tab-internal-notes"]');
    await page.waitForSelector('[data-testid="internal-notes-panel"]');

    const noteText = `E2E Internal Note ${Date.now()}`;
    await page.fill('[data-testid="internal-note-textarea"]', noteText);
    await page.click('[data-testid="save-note-btn"]');

    await expect(page.locator(`text=${noteText}`)).toBeVisible();
  });
});
