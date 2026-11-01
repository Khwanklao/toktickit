import { test, expect } from "@playwright/test";

test.describe("E2E-02: Dashboards and Drill-Down Navigation (AC-14, AC-15)", () => {
  test.setTimeout(90000);

  test("IT Staff Dashboard metrics, feed, responsive layout, and queue drill-down", async ({ page, context }) => {
    await context.clearCookies();

    // 1. Log in as IT Staff
    await page.goto("/login");
    await page.fill("#email", "staff.alex@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    // Wait for redirect to /staff/dashboard or /staff/queue
    await page.waitForURL("**/staff/**");
    await page.goto("/staff/dashboard");
    await page.waitForURL("**/staff/dashboard");

    // Wait for metric cards to load
    await page.waitForSelector('[data-testid="metric-card-open"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="metric-card-new"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-open"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-waiting-requester"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-my-assigned"]')).toBeVisible();

    // 2. Capture responsive screenshots
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

    // 3. Drill-down: Click Open tickets metric card -> navigates to /staff/queue?group=open
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
    await page.goto("/login");
    await page.fill("#email", "req.active1@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    // Wait for redirect to /tickets or /dashboard
    await page.waitForURL("**/tickets**");

    // Navigate to Requester Dashboard
    await page.goto("/dashboard");
    await page.waitForURL("**/dashboard");
    await page.waitForSelector('[data-testid="requester-dashboard"]', { timeout: 15000 });

    // Verify greeting and 4 metric cards
    await expect(page.locator('[data-testid="requester-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-active"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-resolved"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-closed"]')).toBeVisible();

    // 2. Capture responsive screenshots
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

    // 3. Drill-down: Click Active Tickets card -> navigates to /tickets?group=open
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
});

