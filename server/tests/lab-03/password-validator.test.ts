import { describe, it, expect } from "vitest";
import { validatePassword } from "../../src/utils/password-validator.js";

describe("UNIT-01: Password Validator Logic (BR-07)", () => {
  it("passes for valid compliant password", () => {
    const result = validatePassword("Password123!");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails when password length is less than 8 characters", () => {
    const result = validatePassword("Pass1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long.");
  });

  it("fails when missing uppercase character", () => {
    const result = validatePassword("password123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one uppercase letter.");
  });

  it("fails when missing lowercase character", () => {
    const result = validatePassword("PASSWORD123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one lowercase letter.");
  });

  it("fails when missing numeric digit", () => {
    const result = validatePassword("Password!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one numeric digit.");
  });

  it("fails when missing special character", () => {
    const result = validatePassword("Password123");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must contain at least one special character.");
  });

  it("fails when new password matches current password", () => {
    const result = validatePassword("Password123!", "Password123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("New password cannot be the same as current password.");
  });
});
