import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "../../src/components/AppShell.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { apiClient } from "../../src/lib/apiClient.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("AppShell Component Tests (Session Cleanup, Identity & Logout)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders authenticated user identity pill and RoleBadge without legacy selector", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          id: "staff-1",
          name: "Alex Staff",
          email: "staff.alex@toktickit.local",
          role: "IT_STAFF",
          mustChangePassword: false,
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    render(
      <AuthProvider>
        <MemoryRouter>
          <AppShell>
            <div>Dashboard Content</div>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-identity-pill")).toBeInTheDocument();
    });

    expect(screen.getByText("Alex Staff")).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();

    // Verify legacy controls are removed
    expect(screen.queryByText("Change Requester")).not.toBeInTheDocument();
    expect(screen.queryByText("No User Selected")).not.toBeInTheDocument();
  });

  it("calls logout API and redirects on clicking Sign Out", async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          id: "admin-1",
          name: "Main Admin",
          email: "admin.main@toktickit.local",
          role: "ADMINISTRATOR",
          mustChangePassword: false,
        });
      }
      return Promise.reject(new Error("Not found"));
    });
    (apiClient.post as any).mockResolvedValueOnce({});

    render(
      <AuthProvider>
        <MemoryRouter>
          <AppShell>
            <div>Admin Dashboard</div>
          </AppShell>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("logout-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/auth/logout", {});
    });
  });
});
