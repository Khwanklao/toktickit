import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { apiClient } from "../../src/lib/apiClient.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("ChangePassword Component Tests (UI-03, UI-03b)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          id: "1",
          name: "Test User",
          email: "test@toktickit.local",
          role: "REQUESTER",
          mustChangePassword: true,
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("UI-03: Real-time password checklist updates checkmarks as password criteria are met", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChangePassword />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("password-checklist")).toBeInTheDocument();
    });

    const newPassInput = screen.getByLabelText(/^New Password/i);
    const submitBtn = screen.getByTestId("change-password-submit-button");

    expect(submitBtn).toBeDisabled();

    // Type 8 chars with upper, lower, number, special: "Password123!"
    fireEvent.change(newPassInput, { target: { value: "Password123!" } });

    expect(screen.getByTestId("rule-min-length")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-uppercase")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-lowercase")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-number")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-special")).toHaveTextContent("✓");
  });

  it("UI-03: Submit button enables only when all rules match, confirm matches, and current password entered", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <ChangePassword />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    const currentPassInput = screen.getByLabelText(/Current Password/i);
    const newPassInput = screen.getByLabelText(/^New Password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm New Password/i);
    const submitBtn = screen.getByTestId("change-password-submit-button");

    expect(submitBtn).toBeDisabled();

    fireEvent.change(currentPassInput, { target: { value: "OldPassword123!" } });
    fireEvent.change(newPassInput, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmPassInput, { target: { value: "NewPassword123!" } });

    expect(submitBtn).not.toBeDisabled();
  });

  it("UI-03b: Displays error alert when current password is entered incorrectly", async () => {
    (apiClient.post as any).mockRejectedValueOnce({
      code: "INVALID_CURRENT_PASSWORD",
      message: "Current password is incorrect. Please try again.",
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <ChangePassword />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Current Password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Current Password/i), {
      target: { value: "WrongCurrentPassword!" },
    });
    fireEvent.change(screen.getByLabelText(/^New Password/i), {
      target: { value: "NewPassword123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm New Password/i), {
      target: { value: "NewPassword123!" },
    });

    fireEvent.click(screen.getByTestId("change-password-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("change-password-error-alert")).toBeInTheDocument();
    });

    expect(screen.getByTestId("change-password-error-alert")).toHaveTextContent(
      "Current password is incorrect. Please try again."
    );
  });
});
