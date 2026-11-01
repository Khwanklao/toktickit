import { test, expect } from "@playwright/test";

test.describe("E2E-01: Actions Taken Lifecycle Flow (AC-01, AC-04)", () => {
  test.setTimeout(90000);

  test.beforeEach(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ||
      "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";
    const { PrismaClient } = require(require.resolve("@prisma/client", { paths: ["./server"] }));
    const prisma = new PrismaClient();
    await prisma.actionTaken.deleteMany({
      where: {
        ticketId: 3,
        id: { not: "b0000001-0000-0000-0000-000000000001" },
      },
    });
    await prisma.ticket.update({
      where: { id: 3 },
      data: { status: "OPEN" },
    });
    await prisma.$disconnect();
  });

  test("Staff creates Action Taken on ticket, verifies timeline, and Requester accesses actions read-only", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Log in as IT Staff in browser
    await page.goto("/login");
    await page.fill("#email", "staff.alex@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/staff/**");

    // Navigate to ticket TKT-2026-000103 (id: 3, owned by req.active1)
    await page.goto("/staff/tickets/3");
    await page.waitForURL("**/staff/tickets/3");
    await page.waitForSelector('[data-testid="tab-actions-taken"]', { timeout: 15000 });

    // 2. Switch to Actions Taken tab
    const actionsTab = page.locator('[data-testid="tab-actions-taken"]');
    await actionsTab.click();
    await page.waitForSelector('[data-testid="actions-taken-panel"]');

    // Screenshot of Actions tab
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/actions-tab-overview.png" });

    // 3. Open Record Action Modal
    const recordBtn = page.locator('[data-testid="record-action-btn"]');
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    await page.waitForSelector('[data-testid="action-description-input"]');
    // Screenshot of Record Action Modal
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/record-action-modal.png" });

    // 4. Fill Action Taken details
    const actionDesc = "Diagnosed gateway packet drop and reconfigured network QoS policy.";
    const actionResult = "Packet loss dropped to 0% and verified connectivity across VLAN 20.";

    await page.fill('[data-testid="action-description-input"]', actionDesc);
    await page.fill('[data-testid="action-result-input"]', actionResult);

    // Save action
    const saveBtn = page.locator('[data-testid="action-save-btn"]');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Verify modal closes and new action appears in timeline
    await expect(page.locator('[data-testid="action-description-input"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${actionDesc}`).first()).toBeVisible();

    // Screenshot of updated timeline
    await page.screenshot({ path: "artifacts/lab-04/screenshots/actions-taken/action-timeline-saved.png" });

    // 5. Verify Requester Read-Only Access via API
    await context.clearCookies();

    // Login as owning Requester (req.active1 owns TKT-2026-000103)
    const loginRes = await page.request.post("http://localhost:3000/api/auth/login", {
      data: { email: "req.active1@toktickit.local", password: "Password123!" },
    });
    expect(loginRes.status()).toBe(200);

    // Fetch actions on owned ticket -> should return 200 OK with action list
    const getRes = await page.request.get("http://localhost:3000/api/tickets/3/actions");
    expect(getRes.status()).toBe(200);
    const body = await getRes.json();
    const actionList = body.actions || body.data;
    expect(Array.isArray(actionList)).toBe(true);
    expect(actionList.length).toBeGreaterThanOrEqual(1);

    // Requester attempting to write an action must receive 403 Forbidden
    const postRes = await page.request.post("http://localhost:3000/api/tickets/3/actions", {
      data: {
        description: "Unauthorized action attempt by requester",
        result: "Should fail with 403",
        actionDateTime: new Date().toISOString(),
      },
    });
    expect(postRes.status()).toBe(403);
  });
});
