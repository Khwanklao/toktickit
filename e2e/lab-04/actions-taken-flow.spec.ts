import { test, expect } from "@playwright/test";
import {
  createTicketFixture,
  loginViaUI,
  assertTestDatabaseGuard,
  createAuthenticatedContext,
  getValidActionDateTimeLocal,
} from "./helpers.js";

test.describe("E2E-01: Actions Taken Lifecycle Flow (AC-01, AC-04)", () => {
  test.setTimeout(90000);

  test.beforeAll(() => {
    assertTestDatabaseGuard();
  });

  test("Staff creates Action Taken on ticket, verifies timeline, and Requester accesses actions read-only", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // 1. Create a dedicated per-test ticket fixture in OPEN status via pure HTTP API
    const ticket = await createTicketFixture({
      summaryPrefix: "E2E-01 Actions Flow",
      targetStatus: "OPEN",
      ownerEmail: "staff.alex@toktickit.local",
      requesterEmail: "req.active1@toktickit.local",
    });

    // 2. Log in as IT Staff in browser
    await loginViaUI(page, "staff.alex@toktickit.local", "Password123!");
    await page.waitForURL("**/staff/**");

    // Navigate directly to the dedicated fixture ticket
    await page.goto(`/staff/tickets/${ticket.id}`);
    await page.waitForURL(`**/staff/tickets/${ticket.id}`);
    await page.waitForSelector('[data-testid="tab-actions-taken"]', { timeout: 15000 });

    // 3. Switch to Actions Taken tab
    const actionsTab = page.locator('[data-testid="tab-actions-taken"]');
    await actionsTab.click();
    await page.waitForSelector('[data-testid="actions-taken-panel"]');

    // Screenshot of Actions tab overview
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/actions-tab-overview.png" });

    // 4. Open Record Action Modal
    const recordBtn = page.locator('[data-testid="record-action-btn"]');
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    await page.waitForSelector('[data-testid="action-description-input"]');
    // Screenshot of Record Action Modal
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/record-action-modal.png" });

    // 5. Fill Action Taken details
    const actionRunId = Date.now();
    const actionDesc = `Diagnosed gateway packet drop and reconfigured network QoS policy [${actionRunId}].`;
    const actionResult = "Packet loss dropped to 0% and verified connectivity across VLAN 20.";

    await page.fill('[data-testid="action-description-input"]', actionDesc);
    await page.fill('[data-testid="action-result-input"]', actionResult);
    await page.fill('[data-testid="action-datetime-input"]', getValidActionDateTimeLocal(ticket.createdAt));

    // Save action
    const saveBtn = page.locator('[data-testid="action-save-btn"]');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Verify modal closes and new action appears in timeline
    await expect(page.locator('[data-testid="action-description-input"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${actionDesc}`).first()).toBeVisible();

    // Screenshot of updated timeline
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/action-timeline-saved.png" });

    // 6. Verify Requester Read-Only Access via API on this exact ticket
    const reqContext = await createAuthenticatedContext("req.active1@toktickit.local", "Password123!");

    // Fetch actions on owned ticket -> returns 200 OK with action list
    const getRes = await reqContext.get(`/api/tickets/${ticket.id}/actions`);
    expect(getRes.status()).toBe(200);
    const body = await getRes.json();
    const actionList = body.actions || body.data;
    expect(Array.isArray(actionList)).toBe(true);
    expect(actionList.length).toBeGreaterThanOrEqual(1);
    expect(actionList.some((a: any) => a.description === actionDesc)).toBe(true);

    // Requester attempting to write an action must receive 403 Forbidden
    const postRes = await reqContext.post(`/api/tickets/${ticket.id}/actions`, {
      data: {
        description: "Unauthorized action attempt by requester",
        result: "Should fail with 403",
        actionDateTime: new Date().toISOString(),
      },
    });
    expect(postRes.status()).toBe(403);

    await reqContext.dispose();
  });
});
