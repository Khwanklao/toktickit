import { test, expect } from "@playwright/test";

test.describe("Authentication & Mandatory Password Change E2E Tests (E2E-01 to E2E-04)", () => {

  test("E2E-01: Successful login flow and role-based redirect for all roles", async ({ page }) => {
    // 1. Requester login
    await page.goto("/login");
    await page.fill("#email", "req.active1@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/tickets");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Active Requester 1");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Requester");

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL("**/login");

    // 2. IT Staff login
    await page.fill("#email", "staff.alex@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/staff/queue");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Alex Staff");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("IT Staff");

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL("**/login");

    // 3. Administrator login
    await page.fill("#email", "admin.main@toktickit.local");
    await page.fill("#password", "Password123!");
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/admin/users");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Main Admin");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Administrator");

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL("**/login");
  });

  test("E2E-02, E2E-03, E2E-04: Mandatory password change, complexity validation, sign out, and re-login", async ({ page }) => {
    // Target user: req.active4@toktickit.local (seeded with mustChangePassword = true, password = Password123!)
    const targetEmail = "req.active4@toktickit.local";
    const initialPass = "Password123!";
    const newPass = "NewSecur3#Pass";

    // --- E2E-02: Initial login forces redirect to /change-password ---
    await page.goto("/login");
    await page.fill("#email", targetEmail);
    await page.fill("#password", initialPass);
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/change-password");
    await expect(page.locator('h1')).toContainText("You must change your password to continue");

    // Verify navigating to protected route is blocked
    await page.goto("/tickets");
    await page.waitForURL("**/change-password");

    // --- E2E-03: Password complexity checklist and change password submission ---
    await expect(page.locator('[data-testid="password-checklist"]')).toBeVisible();

    const submitBtn = page.locator('[data-testid="change-password-submit-button"]');
    await expect(submitBtn).toBeDisabled();

    await page.fill("#currentPassword", initialPass);
    await page.fill("#newPassword", newPass);
    await page.fill("#confirmPassword", newPass);

    // Verify checklist rules turn green
    await expect(page.locator('[data-testid="rule-min-length"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-uppercase"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-lowercase"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-number"]')).toContainText("✓");
    await expect(page.locator('[data-testid="rule-special"]')).toContainText("✓");

    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // After success, redirected to landing page (/tickets)
    await page.waitForURL("**/tickets");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Active Requester 4");

    // --- E2E-04: Sign out and login with new credentials ---
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL("**/login");

    // 1. Attempt login with OLD password -> fails
    await page.fill("#email", targetEmail);
    await page.fill("#password", initialPass);
    await page.click('[data-testid="login-submit-button"]');

    await expect(page.locator('[data-testid="login-error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error-alert"]')).toContainText("Invalid email or password. Please try again.");

    // 2. Login with NEW password -> succeeds directly
    await page.fill("#email", targetEmail);
    await page.fill("#password", newPass);
    await page.click('[data-testid="login-submit-button"]');

    await page.waitForURL("**/tickets");
    await expect(page.locator('[data-testid="user-identity-pill"]')).toContainText("Active Requester 4");
  });
});
