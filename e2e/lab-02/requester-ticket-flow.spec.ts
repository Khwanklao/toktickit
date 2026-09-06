import { test, expect } from "@playwright/test";

test.describe("Requester Ticket Flow E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/select-requester");
    await page.waitForSelector('[data-testid="requester-select"]');
    await page.selectOption('[data-testid="requester-select"]', "1");
    await page.click('[data-testid="continue-button"]');
    await page.waitForURL("**/tickets");
  });

  test("E2E-01: End-to-end ticket creation to My Tickets verification (AC-01, FR-04)", async ({ page }) => {
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="my-tickets-screen"]');

    await page.click('a[href="/tickets/new"]');
    await page.waitForURL("**/tickets/new");
    await page.waitForSelector('[data-testid="create-ticket-form"]');

    // Fill form
    await page.selectOption('[data-testid="category-select"]', "2"); // Hardware
    await page.selectOption('[data-testid="related-system-select"]', "7"); // Corporate Laptop
    await page.selectOption('[data-testid="requested-priority-select"]', "MEDIUM");

    const summaryText = `E2E Test Summary ${Date.now()}`;
    await page.fill('[data-testid="summary-input"]', summaryText);
    await page.fill(
      '[data-testid="description-input"]',
      "Detailed description for end-to-end test ticket creation."
    );

    // Submit form
    await page.click('[data-testid="submit-ticket-button"]');

    // In-place success panel appears with ticket number
    await page.waitForSelector('[data-testid="success-panel"]');
    const ticketNumber = (await page.textContent('[data-testid="ticket-number-display"]'))?.trim();
    expect(ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);

    // Click "View Ticket" button
    await page.click('[data-testid="view-ticket-button"]');
    await expect(page.locator('[data-testid="detail-ticket-number"]')).toHaveText(ticketNumber!);

    // Go back to My Tickets and verify ticket is listed
    await page.click('[data-testid="back-to-tickets-btn"]');
    await page.waitForURL("**/tickets");
    await expect(page.locator(`text=${summaryText}`).first()).toBeVisible();
  });

  test("E2E-02: Multi-requester ownership isolation (AC-03, AC-14)", async ({ page }) => {
    // 1. Create a ticket as Requester 1 (Jennifer Anderson)
    await page.goto("/tickets/new");
    await page.waitForSelector('[data-testid="create-ticket-form"]');

    await page.selectOption('[data-testid="category-select"]', "1");
    await page.selectOption('[data-testid="related-system-select"]', "1");
    const privateSummary = `Private Ticket Req1 ${Date.now()}`;
    await page.fill('[data-testid="summary-input"]', privateSummary);
    await page.fill('[data-testid="description-input"]', "Strictly private description for Requester 1.");
    await page.click('[data-testid="submit-ticket-button"]');

    await page.waitForSelector('[data-testid="success-panel"]');
    await page.click('[data-testid="view-ticket-button"]');

    const url = page.url();
    const ticketId = url.split("/tickets/")[1];

    // 2. Switch active requester context to Requester 2 (Michael Brown) in localStorage
    await page.evaluate(() => {
      localStorage.setItem("toktickit_requester_id", "2");
    });
    await page.goto("/tickets");
    await page.waitForSelector('[data-testid="my-tickets-screen"]');

    // 3. Confirm Requester 2 does NOT see Requester 1's ticket in My Tickets list
    await expect(page.locator(`text=${privateSummary}`).first()).not.toBeVisible();

    // 4. Directly navigate to Requester 1's ticket ID as Requester 2 -> expect Ticket Not Found safe state
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.locator('[data-testid="not-found-card"]')).toBeVisible();
    await expect(page.locator("text=Ticket Not Found")).toBeVisible();
  });

  test("E2E-03: Attachment upload, detail inspection, and soft removal lifecycle (AC-05, AC-13)", async ({ page }) => {
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    page.on("requestfailed", (req) => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));
    // 1. Create a ticket
    await page.goto("/tickets/new");
    await page.waitForSelector('[data-testid="create-ticket-form"]');

    await page.selectOption('[data-testid="category-select"]', "2");
    await page.selectOption('[data-testid="related-system-select"]', "7");
    const attSummary = `Attachment Lifecycle Test ${Date.now()}`;
    await page.fill('[data-testid="summary-input"]', attSummary);
    await page.fill('[data-testid="description-input"]', "Testing full attachment lifecycle end to end.");

    await page.click('[data-testid="submit-ticket-button"]');
    await page.waitForSelector('[data-testid="success-panel"]');
    await page.click('[data-testid="view-ticket-button"]');

    // 2. Upload an attachment on Ticket Detail page
    const fileInput = page.locator('[data-testid="add-attachment-file-input"]');
    await fileInput.setInputFiles({
      name: "e2e_log_file.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 E2E Test PDF Content"),
    });

    // Wait for attachment to appear in active list
    await expect(page.locator("text=e2e_log_file.pdf")).toBeVisible();

    // 3. Soft-remove the attachment with a valid reason
    const removeBtn = page.locator('button:has-text("Remove")').first();
    await removeBtn.click();

    await expect(page.locator('[data-testid="removal-modal"]')).toBeVisible();
    await page.fill('[data-testid="removal-reason-input"]', "Obsolescence - replaced by newer version");
    const [deleteResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/attachments/") && res.request().method() === "DELETE"),
      page.click('[data-testid="confirm-remove-btn"]'),
    ]);
    expect(deleteResponse.status()).toBe(200);

    // Wait for removal modal to detach
    await page.waitForSelector('[data-testid="removal-modal"]', { state: "detached" });

    // 4. Confirm soft-removed state: strikethrough filename, gray Removed badge, download disabled
    await expect(page.locator('[data-testid^="removed-badge-"]').first()).toBeVisible();
    await expect(page.locator('[data-testid^="removal-reason-text-"]').first()).toBeVisible();

    const downloadBtn = page.locator('button:has-text("Download")').first();
    await expect(downloadBtn).toBeDisabled();
  });
});
