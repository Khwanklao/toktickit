import { test, expect } from "@playwright/test";

test.describe("E2E-06: Administrator User Management Flow", () => {
  test("Administrator logs in, navigates to user management, creates a new user, resets password, and deactivates account", async ({ page }) => {
    const timestamp = Date.now();
    const newUserEmail = `e2e.user.${timestamp}@toktickit.local`;
    const newUserName = `E2E User ${timestamp}`;

    // 1. Login as Administrator via page.request to attach session cookie
    await page.request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "admin.main@toktickit.local",
        password: "Password123!",
      },
    });

    // 2. Navigate to /admin/users
    await page.goto("/admin/users");
    await page.waitForURL("**/admin/users");
    await page.waitForSelector('[data-testid="desktop-users-table"]', { timeout: 10000 });

    // Verify page header
    await expect(page.locator('h1:has-text("Users")')).toBeVisible();

    // 3. Open Create User drawer
    await page.click('[data-testid="create-user-btn"]');
    await page.waitForSelector('[data-testid="drawer-title"]');
    await expect(page.locator('[data-testid="drawer-title"]')).toHaveText("Create New User");

    // Fill form
    await page.fill('[data-testid="input-name"]', newUserName);
    await page.fill('[data-testid="input-email"]', newUserEmail);
    await page.selectOption('[data-testid="select-role"]', "IT_STAFF");
    await page.fill('[data-testid="input-password"]', "InitialPassword123!");

    // Submit
    await page.click('[data-testid="btn-save-user"]');

    // Verify success toast and table row
    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("User created successfully");

    // Verify created user in desktop table
    await expect(page.locator(`td:has-text("${newUserName}")`)).toBeVisible();

    // 4. Reset initial password for the created user
    const userRow = page.locator(`tr:has-text("${newUserEmail}")`);
    const editBtn = userRow.locator('[data-testid^="edit-user-"]');
    await editBtn.click();

    await page.waitForSelector('[data-testid="drawer-title"]');
    await expect(page.locator('[data-testid="drawer-title"]')).toHaveText("Edit User");

    await page.click('[data-testid="btn-reset-password"]');
    await page.waitForSelector('[data-testid="input-reset-password"]');

    await page.fill('[data-testid="input-reset-password"]', "ResetPassword123!");
    await page.click('[data-testid="btn-confirm-reset-password"]');

    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Password reset successfully");

    // 5. Deactivate account
    const activeToggle = page.locator('[data-testid="toggle-active"]');
    if (await activeToggle.isChecked()) {
      await activeToggle.uncheck();
    }
    await page.click('[data-testid="btn-save-user"]');

    await expect(toast).toBeVisible();
    await expect(toast).toContainText("User updated successfully");

    // Verify Inactive status badge in the list
    const updatedUserRow = page.locator(`tr:has-text("${newUserEmail}")`);
    await expect(updatedUserRow.locator('[data-testid^="user-status-badge-"]')).toHaveText("Inactive");
  });
});
