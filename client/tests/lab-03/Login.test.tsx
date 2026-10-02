import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Login } from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { apiClient } from "../../src/lib/apiClient.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("Login Component Tests (UI-01, UI-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.reject(new Error("Unauthenticated"));
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("UI-01: Renders email, password inputs and Sign In button", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toHaveTextContent("Sign in");
  });

  it("UI-01: Toggles password visibility on clicking eye toggle button", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByRole("button", { name: /Show password/i });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");

    const hideButton = screen.getByRole("button", { name: /Hide password/i });
    fireEvent.click(hideButton);

    expect(passwordInput.type).toBe("password");
  });

  it("UI-01: Displays inline validation errors when submitting empty fields", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("login-submit-button"));

    expect(screen.getByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("UI-02: Displays generic failure alert banner on 401 Unauthorized login failure", async () => {
    (apiClient.post as any).mockRejectedValueOnce(new Error("Invalid email or password"));

    render(
      <AuthProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "invalid@toktickit.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "WrongPassword" },
    });

    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error-alert")).toBeInTheDocument();
    });

    expect(screen.getByTestId("login-error-alert")).toHaveTextContent(
      "Invalid email or password. Please try again."
    );
    expect(screen.getByTestId("login-submit-button")).not.toBeDisabled();
  });
});
