import { test, expect } from "@playwright/test";

test.describe("Attachment Upload Failure and Retry E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("toktickit_requester_id", "1");
    });
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="my-tickets-screen"]');
  });

  test("E2E-04: Ticket created, attachment upload fails, Requester retries from UI without ticket duplication (AC-19, AC-20)", async ({ page }) => {
    await page.goto("/tickets/new");
    await page.waitForSelector('[data-testid="create-ticket-form"]');

    await page.selectOption('[data-testid="category-select"]', "2");
    await page.selectOption('[data-testid="related-system-select"]', "7");
    const retrySummary = `Retry Upload Test ${Date.now()}`;
    await page.fill('[data-testid="summary-input"]', retrySummary);
    await page.fill('[data-testid="description-input"]', "Testing attachment failure and retry on Create Ticket form.");

    // Attach a valid file
    const fileInput = page.locator('[data-testid="attachment-input"]');
    await fileInput.setInputFiles({
      name: "crash_report.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 Crash Report"),
    });

    // Intercept attachment upload to return 500 error with CORS headers on initial submit
    let failureCount = 0;
    await page.route("**/api/tickets/*/attachments", async (route) => {
      if (failureCount === 0) {
        failureCount++;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
          },
          body: JSON.stringify({
            statusCode: 500,
            error: "Internal Server Error",
            message: "Attachment upload failed. Your ticket was saved — you can retry the upload.",
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Submit form
    await page.click('[data-testid="submit-ticket-button"]');

    // Partial upload banner & failure chip appear, ticket is saved
    await expect(page.locator('[data-testid="partial-upload-banner"]')).toBeVisible();
    await expect(page.locator("text=Upload failed — Ticket was saved. Retry upload.")).toBeVisible();

    // Click Retry button on the file chip
    const retryUploadBtn = page.locator('button:has-text("Retry")').first();
    await retryUploadBtn.click();

    // Retry succeeds -> form displays success panel
    await expect(page.locator('[data-testid="success-panel"]')).toBeVisible();

    // Navigate to My Tickets and verify exactly ONE ticket was created for this summary
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="ticket-search-input"]');
    await page.fill('[data-testid="ticket-search-input"]', retrySummary);
    await page.keyboard.press("Enter");

    await expect(page.locator(`td:has-text("${retrySummary}")`)).toHaveCount(1);
  });
});
