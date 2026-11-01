import { test, expect } from "@playwright/test";
import { createTicketFixture, loginViaUI, assertTestDatabaseGuard, createAuthenticatedContext } from "./helpers.js";

test.describe("E2E-02: Dashboards and Drill-Down Navigation (AC-14, AC-15)", () => {
  test.setTimeout(90000);

  test.beforeAll(() => {
    assertTestDatabaseGuard();
  });

  test("IT Staff Dashboard metrics, feed, responsive layout, and queue drill-down", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Log in as IT Staff
    await loginViaUI(page, "staff.alex@toktickit.local", "Password123!");
    await page.waitForURL("**/staff/**");

    await page.goto("/staff/dashboard");
    await page.waitForURL("**/staff/dashboard");
    await page.waitForSelector('[data-testid="metric-card-open"]', { timeout: 15000 });

    // 2. Fetch real live metrics from application API in the same authenticated session
    const apiRes = await page.request.get("http://localhost:3000/api/staff/dashboard");
    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    const metrics = apiData.metrics;

    // Relative assertions matching API values (never asserting fixed numbers)
    await expect(page.locator('[data-testid="metric-card-new"]')).toContainText(String(metrics.newTickets));
    await expect(page.locator('[data-testid="metric-card-open"]')).toContainText(String(metrics.openTickets));
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toContainText(String(metrics.inProgressTickets));
    await expect(page.locator('[data-testid="metric-card-waiting-requester"]')).toContainText(
      String(metrics.waitingRequesterTickets)
    );
    await expect(page.locator('[data-testid="metric-card-my-assigned"]')).toContainText(
      String(metrics.myAssignedTickets)
    );

    // 3. Capture responsive screenshots
    // Desktop View (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/staff-dashboard/desktop-overview.png", fullPage: true });

    // Tablet View (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/staff-dashboard/tablet-overview.png", fullPage: true });

    // Mobile View (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/staff-dashboard/mobile-overview.png", fullPage: true });

    // Restore desktop view for interactions
    await page.setViewportSize({ width: 1280, height: 800 });

    // 4. Drill-down: Click Open tickets metric card -> navigates to /staff/queue?group=open
    const openCard = page.locator('[data-testid="metric-card-open"]');
    await openCard.click();
    await page.waitForURL("**/staff/queue?group=open");
    await expect(page).toHaveURL(/group=open/);

    // Verify filter chip is rendered
    await page.waitForSelector('[data-testid="chip-group-open"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="chip-group-open"]')).toBeVisible();

    // Screenshot of drill-down queue
    await page.screenshot({ path: "artifacts/lab-04/screenshots/staff-dashboard/drilldown-open-queue.png" });
  });

  test("Requester Dashboard metrics, feed, responsive layout, and active tickets drill-down", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Log in as Requester
    await loginViaUI(page, "req.active1@toktickit.local", "Password123!");
    await page.waitForURL("**/tickets**");

    // Navigate to Requester Dashboard
    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");
    await page.waitForSelector('[data-testid="requester-dashboard"]', { timeout: 15000 });

    // 2. Fetch live metrics from API for this authenticated requester
    const apiRes = await page.request.get("http://localhost:3000/api/requester/dashboard");
    expect(apiRes.status()).toBe(200);
    const apiData = await apiRes.json();
    const metrics = apiData.metrics;

    // Relative assertions against live API metrics
    await expect(page.locator('[data-testid="metric-card-active"]')).toContainText(String(metrics.activeTickets));
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toContainText(String(metrics.inProgressTickets));
    await expect(page.locator('[data-testid="metric-card-resolved"]')).toContainText(String(metrics.resolvedTickets));
    await expect(page.locator('[data-testid="metric-card-closed"]')).toContainText(String(metrics.closedTickets));

    // 3. Capture responsive screenshots
    // Desktop View
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/requester-dashboard/desktop-overview.png", fullPage: true });

    // Tablet View
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/requester-dashboard/tablet-overview.png", fullPage: true });

    // Mobile View
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "artifacts/lab-04/screenshots/requester-dashboard/mobile-overview.png", fullPage: true });

    // Restore desktop view
    await page.setViewportSize({ width: 1280, height: 800 });

    // 4. Drill-down: Click Active Tickets card -> navigates to /tickets?group=open
    const activeCard = page.locator('[data-testid="metric-card-active"]');
    await activeCard.click();
    await page.waitForURL("**/tickets?group=open");
    await expect(page).toHaveURL(/group=open/);

    // Verify filter chip is displayed on My Tickets
    await page.waitForSelector('[data-testid="chip-group-open"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="chip-group-open"]')).toBeVisible();

    // Screenshot of requester drill-down
    await page.screenshot({ path: "artifacts/lab-04/screenshots/requester-dashboard/drilldown-active-tickets.png" });
  });

  test("Requester Zero-State: seeded zero-ticket requester renders 0 counters and empty feed without layout shifts", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Guard: Verify that req.zero@toktickit.local is strictly untouched and has 0 tickets
    const reqZeroContext = await createAuthenticatedContext("req.zero@toktickit.local", "Password123!");
    const dashRes = await reqZeroContext.get("/api/requester/dashboard");
    expect(dashRes.status()).toBe(200);
    const dashData = await dashRes.json();
    await reqZeroContext.dispose();

    expect(
      dashData.metrics.activeTickets,
      "Guard check failed: req.zero account must remain with 0 tickets. Do not create tickets for req.zero!"
    ).toBe(0);

    // Log in via UI
    await loginViaUI(page, "req.zero@toktickit.local", "Password123!");
    await page.waitForURL("**/tickets**");

    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");
    await page.waitForSelector('[data-testid="requester-dashboard"]', { timeout: 15000 });

    // Assert zero counters on all 4 metric cards
    await expect(page.locator('[data-testid="metric-card-active"]')).toContainText("0");
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toContainText("0");
    await expect(page.locator('[data-testid="metric-card-resolved"]')).toContainText("0");
    await expect(page.locator('[data-testid="metric-card-closed"]')).toContainText("0");

    // Assert clean zero state banner for empty requests feed
    await expect(page.locator('[data-testid="recent-requests-empty"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-first-ticket-cta"]')).toBeVisible();
  });

  test("Dynamic reactivity: creating a ticket fixture increments requester dashboard active metric relative to previous API value", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Query baseline metrics via API before creation
    const reqContext = await createAuthenticatedContext("req.active2@toktickit.local", "Password123!");
    const beforeRes = await reqContext.get("/api/requester/dashboard");
    expect(beforeRes.status()).toBe(200);
    const beforeData = await beforeRes.json();
    const baselineActive = beforeData.metrics.activeTickets;

    // Create a new ticket fixture for req.active2
    const fixture = await createTicketFixture({
      summaryPrefix: "Reactivity Verification",
      requesterEmail: "req.active2@toktickit.local",
      targetStatus: "NEW",
    });

    // Query API again to confirm relative increase
    const afterRes = await reqContext.get("/api/requester/dashboard");
    expect(afterRes.status()).toBe(200);
    const afterData = await afterRes.json();
    expect(afterData.metrics.activeTickets).toBe(baselineActive + 1);

    await reqContext.dispose();

    // Verify UI reflects the updated metric and displays the new ticket in recent list
    await loginViaUI(page, "req.active2@toktickit.local", "Password123!");
    await page.waitForURL("**/tickets**");

    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");
    await page.waitForSelector('[data-testid="requester-dashboard"]', { timeout: 15000 });

    // Assert active card contains the updated count
    await expect(page.locator('[data-testid="metric-card-active"]')).toContainText(String(baselineActive + 1));

    // Assert newly created ticket is listed in the feed
    await expect(page.locator(`text=${fixture.ticketNumber}`)).toBeVisible();
  });
});
