import { test, expect } from "@playwright/test";

test.describe("Responsive Layout Visual and Functional Tests (RESP-01)", () => {
  const viewports = [
    { name: "Desktop", width: 1200, height: 800 },
    { name: "Tablet", width: 800, height: 1024 },
    { name: "Mobile", width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    test.describe(`${vp.name} Viewport (${vp.width}x${vp.height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.addInitScript(() => {
          localStorage.setItem("toktickit_requester_id", "1");
        });
      });

      test(`Requester Selector responsive layout at ${vp.name}`, async ({ page }) => {
        await page.goto("/select-requester");
        await page.waitForSelector('[data-testid="requester-select"]');

        const isOverflowing = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(isOverflowing).toBe(false);

        const continueBtn = page.locator('[data-testid="continue-button"]');
        await expect(continueBtn).toBeVisible();
      });

      test(`My Tickets responsive layout at ${vp.name}`, async ({ page }) => {
        await page.goto("/tickets");
        await page.waitForSelector('[data-testid="my-tickets-screen"]');

        const isOverflowing = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(isOverflowing).toBe(false);

        if (vp.width >= 992) {
          await expect(page.locator('[data-testid="desktop-ticket-table"]')).toBeVisible();
        } else {
          await expect(page.locator('[data-testid="mobile-ticket-cards"]')).toBeVisible();
        }
      });

      test(`Create Ticket form responsive layout at ${vp.name}`, async ({ page }) => {
        await page.goto("/tickets/new");
        await page.waitForSelector('[data-testid="create-ticket-form"]');

        const isOverflowing = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(isOverflowing).toBe(false);

        await expect(page.locator('[data-testid="summary-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="description-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="submit-ticket-button"]')).toBeVisible();
      });

      test(`Ticket Detail view responsive layout at ${vp.name}`, async ({ page }) => {
        await page.goto("/tickets/101");
        await page.waitForSelector('[data-testid="ticket-detail-screen"]');

        const isOverflowing = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(isOverflowing).toBe(false);

        await expect(page.locator('[data-testid="tab-attachments"]')).toBeVisible();
      });
    });
  }
});
