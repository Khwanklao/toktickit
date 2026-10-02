import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserManagement } from "../../src/components/UserManagement.js";
import { apiClient } from "../../src/lib/apiClient.js";
import * as AuthContext from "../../src/context/AuthContext.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockAdminUser: AuthContext.User = {
  id: "admin-1",
  name: "Main Admin",
  email: "admin.main@toktickit.local",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
};

const mockUsersList = [
  {
    id: "admin-1",
    name: "Main Admin",
    email: "admin.main@toktickit.local",
    role: "ADMINISTRATOR" as const,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "staff-1",
    name: "Alex Staff",
    email: "staff.alex@toktickit.local",
    role: "IT_STAFF" as const,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-08-02T00:00:00.000Z",
  },
];

describe("RESP-02: Responsive Layout of Admin User Management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: mockAdminUser,
      loading: false,
      setUser: vi.fn(),
      fetchUser: vi.fn(),
      logout: vi.fn(),
    });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/admin/users")) {
        return Promise.resolve({ users: mockUsersList });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  it("renders both desktop table container and mobile card list container for CSS responsive adaptation", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    const desktopTable = await screen.findByTestId("desktop-users-table");
    expect(desktopTable).toBeInTheDocument();

    const mobileList = screen.getByTestId("mobile-user-list");
    expect(mobileList).toBeInTheDocument();

    const mobileCards = screen.getAllByTestId("mobile-user-card");
    expect(mobileCards.length).toBeGreaterThan(0);
  });
});
