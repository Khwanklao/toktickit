import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test.describe("Generate Lab-02 Screenshot Artifacts", () => {
  const baseDir = path.resolve(__dirname, "../../artifacts/lab-02/screenshots");

  test.beforeAll(() => {
    fs.mkdirSync(path.join(baseDir, "create-ticket"), { recursive: true });
    fs.mkdirSync(path.join(baseDir, "my-tickets"), { recursive: true });
    fs.mkdirSync(path.join(baseDir, "ticket-detail"), { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("toktickit_requester_id", "1");
    });
  });

  test("Create Ticket View Screenshots", async ({ page }) => {
    // 1. Desktop Viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/tickets/new");
    await page.waitForSelector('[data-testid="create-ticket-form"]');
    await page.screenshot({ path: path.join(baseDir, "create-ticket/desktop.png") });

    // 2. Tablet Viewport
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.screenshot({ path: path.join(baseDir, "create-ticket/tablet.png") });

    // 3. Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(baseDir, "create-ticket/mobile.png") });

    // 4. Validation Error (Desktop)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.click('[data-testid="submit-ticket-button"]');
    await page.waitForSelector("text=Summary is required");
    await page.screenshot({ path: path.join(baseDir, "create-ticket/validation-error.png") });

    // 5. Invalid Attachment
    const fileInput = page.locator('[data-testid="attachment-input"]');
    await fileInput.setInputFiles({
      name: "huge_file.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("x".repeat(1000)),
    });
    await expect(page.locator("text=Invalid file type")).toBeVisible();
    await page.screenshot({ path: path.join(baseDir, "create-ticket/invalid-attachment.png") });

    // 6. Submitting state (fill valid form and click submit)
    await page.reload();
    await page.selectOption('[data-testid="category-select"]', "2");
    await page.selectOption('[data-testid="related-system-select"]', "7");
    await page.fill('[data-testid="summary-input"]', "Screenshot Submitting Ticket Test");
    await page.fill('[data-testid="description-input"]', "Detailed description for screenshot testing.");

    // Intercept POST /api/tickets to delay response so we can capture Submitting state
    await page.route("**/api/tickets", async (route) => {
      await page.waitForTimeout(1000);
      await route.continue();
    });

    const submitBtn = page.locator('[data-testid="submit-ticket-button"]');
    await submitBtn.click();
    await expect(submitBtn).toBeDisabled();
    await page.screenshot({ path: path.join(baseDir, "create-ticket/submitting.png") });

    // 7. Success state
    await page.waitForSelector('[data-testid="success-panel"]');
    await page.screenshot({ path: path.join(baseDir, "create-ticket/success.png") });

    // 8. API Failure state
    await page.goto("/tickets/new");
    await page.selectOption('[data-testid="category-select"]', "2");
    await page.selectOption('[data-testid="related-system-select"]', "7");
    await page.fill('[data-testid="summary-input"]', "API Failure Screenshot Ticket Test");
    await page.fill('[data-testid="description-input"]', "Detailed description for screenshot testing API failure.");

    await page.unroute("**/api/tickets");
    await page.route("**/api/tickets", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ statusCode: 500, error: "Internal Server Error", message: "Database connection error" }),
      });
    });

    await page.click('[data-testid="submit-ticket-button"]');
    await page.waitForSelector("text=Database connection error");
    await page.screenshot({ path: path.join(baseDir, "create-ticket/api-failure.png") });
  });

  test("My Tickets View Screenshots", async ({ page }) => {
    // 1. Desktop table with sort applied
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="my-tickets-screen"]');
    await page.screenshot({ path: path.join(baseDir, "my-tickets/desktop-table-sorted.png") });

    // 2. Mobile cards
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: path.join(baseDir, "my-tickets/mobile-cards.png") });

    // 3. Loading state
    await page.setViewportSize({ width: 1200, height: 800 });
    let routeHandled = false;
    await page.route("**/api/tickets*", async (route) => {
      if (!routeHandled) {
        routeHandled = true;
        await page.waitForTimeout(1000);
      }
      try {
        await route.continue();
      } catch (_) {}
    });
    await page.goto("/tickets");
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(baseDir, "my-tickets/loading.png") });
    await page.unroute("**/api/tickets*");

    // 4. Empty state (Mock zero tickets returned)
    await page.route("**/api/tickets?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify([]),
      });
    });
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="empty-state"]');
    await page.screenshot({ path: path.join(baseDir, "my-tickets/empty-state.png") });

    // 5. No-results state (Mock empty list when searching)
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="empty-state"]');
    await page.fill('[data-testid="ticket-search-input"]', "NonExistentSearchTerm123");
    await page.keyboard.press("Enter");
    await page.waitForSelector('[data-testid="no-results-state"]');
    await page.screenshot({ path: path.join(baseDir, "my-tickets/no-results-state.png") });
  });

  test("Ticket Detail View Screenshots", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/tickets/101");
    await page.waitForSelector('[data-testid="ticket-detail-screen"]');

    // 1. Read-only view
    await page.screenshot({ path: path.join(baseDir, "ticket-detail/readonly-view.png") });

    // 2. Attachment list states (active, uploading, failed, soft-removed)
    // Upload a file first
    const fileInput = page.locator('[data-testid="add-attachment-file-input"]');
    await fileInput.setInputFiles({
      name: "sample_doc.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 Sample"),
    });
    await expect(page.locator("text=sample_doc.pdf").first()).toBeVisible();
    await page.screenshot({ path: path.join(baseDir, "ticket-detail/attachment-list-states.png") });

    // 3. Removal confirmation modal
    const removeBtn = page.locator('button:has-text("Remove")').first();
    await removeBtn.click();
    await page.waitForSelector('[data-testid="removal-modal"]');
    await page.screenshot({ path: path.join(baseDir, "ticket-detail/removal-confirmation-modal.png") });
  });
});
