import { test, expect } from "@playwright/test";

test.describe("Feedback Item 5: Staff Views Responsive Layout Verification & Screenshot Capture", () => {
  test("Capture responsive screenshots for Staff Ticket Queue and Staff Ticket Detail across Desktop, Tablet, and Mobile viewports", async ({ page }) => {
    // 1. Ensure at least one ticket exists in DB by posting a ticket via requester API
    await page.request.post("http://localhost:3000/api/auth/login", {
      data: { email: "req.active1@toktickit.local", password: "Password123!" },
    });
    const createTicketRes = await page.request.post("http://localhost:3000/api/tickets", {
      headers: { "x-requester-id": "1" },
      data: {
        title: "Responsive Verification Ticket",
        summary: "Responsive Layout Verification",
        description: "Checking responsiveness across Desktop (1024px), Tablet (768px), and Mobile (375px & 390px).",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "MEDIUM",
      },
    });
    const ticketData = await createTicketRes.json();
    const ticketId = ticketData.ticket?.id || ticketData.id || 1;

    // 2. Authenticate as IT Staff
    await page.request.post("http://localhost:3000/api/auth/login", {
      data: { email: "staff.alex@toktickit.local", password: "Password123!" },
    });

    // ----------------------------------------------------
    // A. Staff Ticket Queue (/staff/queue)
    // ----------------------------------------------------
    await page.goto("/staff/queue");
    await page.waitForURL("**/staff/queue");
    await page.waitForSelector('[data-testid="search-input"]');

    // Desktop (1024px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForSelector('[data-testid="desktop-queue-table"]');
    await page.screenshot({ path: "e2e/screenshots/responsive/queue-desktop-1024.png" });

    // Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "e2e/screenshots/responsive/queue-tablet-768.png" });

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForSelector('[data-testid="mobile-ticket-list"]');
    await page.screenshot({ path: "e2e/screenshots/responsive/queue-mobile-375.png" });

    // Mobile (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "e2e/screenshots/responsive/queue-mobile-390.png" });

    // ----------------------------------------------------
    // B. Staff Ticket Detail (/staff/tickets/:id)
    // ----------------------------------------------------
    await page.goto(`/staff/tickets/${ticketId}`);
    await page.waitForURL(`**/staff/tickets/${ticketId}`);
    await page.waitForSelector('[data-testid="ticket-metadata-grid"]');

    // Desktop (1024px)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: "e2e/screenshots/responsive/detail-desktop-1024.png" });

    // Tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: "e2e/screenshots/responsive/detail-tablet-768.png" });

    // Mobile (375px)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: "e2e/screenshots/responsive/detail-mobile-375.png" });

    // Mobile (390px)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "e2e/screenshots/responsive/detail-mobile-390.png" });
  });
});
