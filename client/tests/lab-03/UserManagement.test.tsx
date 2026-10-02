import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const mockStaffUser: AuthContext.User = {
  id: "staff-1",
  name: "Alex Staff",
  email: "staff.alex@toktickit.local",
  role: "IT_STAFF",
  mustChangePassword: false,
};

const mockRequesterUser: AuthContext.User = {
  id: "req-1",
  name: "Alex Requester",
  email: "req.active1@toktickit.local",
  role: "REQUESTER",
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
  {
    id: "req-1",
    name: "Alex Requester",
    email: "req.active1@toktickit.local",
    role: "REQUESTER" as const,
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-08-03T00:00:00.000Z",
  },
];

describe("UI-06, UI-07, UI-08: Administrator User Management Component Tests", () => {
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

  it("renders 403 Forbidden screen when accessed by REQUESTER or IT_STAFF", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: mockRequesterUser,
      loading: false,
      setUser: vi.fn(),
      fetchUser: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    const forbiddenScreen = screen.getByTestId("forbidden-screen");
    expect(forbiddenScreen).toBeInTheDocument();
    expect(forbiddenScreen).toHaveTextContent("Access Denied");
    expect(forbiddenScreen).toHaveTextContent("You do not have permission to view this page");
  });

  it("renders 403 Forbidden screen when user is unauthenticated", () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue({
      user: null,
      loading: false,
      setUser: vi.fn(),
      fetchUser: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    expect(screen.getByTestId("forbidden-screen")).toBeInTheDocument();
  });

  it("UI-06: renders User Management table and controls for Administrator", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("desktop-users-table")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("role-filter")).toBeInTheDocument();
    expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();

    expect(screen.getAllByText("Main Admin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Staff").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Requester").length).toBeGreaterThan(0);
  });

  it("UI-06: opens Create User drawer, validates inputs, and creates user successfully", async () => {
    (apiClient.post as any).mockResolvedValue({
      user: {
        id: "new-user-id",
        name: "Jane Doe",
        email: "jane.doe@toktickit.com",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      },
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-user-btn"));

    const drawerTitle = screen.getByTestId("drawer-title");
    expect(drawerTitle).toHaveTextContent("Create New User");

    fireEvent.change(screen.getByTestId("input-name"), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByTestId("input-email"), { target: { value: "jane.doe@toktickit.com" } });
    fireEvent.change(screen.getByTestId("select-role"), { target: { value: "IT_STAFF" } });
    fireEvent.change(screen.getByTestId("input-password"), { target: { value: "InitialPassword123!" } });

    fireEvent.click(screen.getByTestId("btn-save-user"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/users", {
        name: "Jane Doe",
        email: "jane.doe@toktickit.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialPassword123!",
      });
    });

    expect(screen.getByTestId("toast-success")).toHaveTextContent("User created successfully");
  });

  it("UI-07: displays duplicate email 409 conflict error", async () => {
    (apiClient.post as any).mockRejectedValue(new Error("This email is already in use by another account."));

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-user-btn"));

    fireEvent.change(screen.getByTestId("input-name"), { target: { value: "Duplicate User" } });
    fireEvent.change(screen.getByTestId("input-email"), { target: { value: "admin.main@toktickit.local" } });
    fireEvent.change(screen.getByTestId("input-password"), { target: { value: "InitialPassword123!" } });

    fireEvent.click(screen.getByTestId("btn-save-user"));

    await waitFor(() => {
      const emailError = screen.getByTestId("email-error");
      expect(emailError).toBeInTheDocument();
      expect(emailError).toHaveTextContent("This email is already in use by another account.");
    });
  });

  it("UI-07: displays invalid role 400 error message", async () => {
    (apiClient.post as any).mockRejectedValue(new Error("Please select a valid role from the list."));

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-user-btn"));

    fireEvent.change(screen.getByTestId("input-name"), { target: { value: "Role Error User" } });
    fireEvent.change(screen.getByTestId("input-email"), { target: { value: "role.error@toktickit.com" } });
    fireEvent.change(screen.getByTestId("input-password"), { target: { value: "InitialPassword123!" } });

    fireEvent.click(screen.getByTestId("btn-save-user"));

    await waitFor(() => {
      const roleError = screen.getByTestId("role-error");
      expect(roleError).toBeInTheDocument();
      expect(roleError).toHaveTextContent("Please select a valid role from the list.");
    });
  });

  it("UI-08: disables active toggle and shows warning when editing self or last active administrator", async () => {
    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-admin-1")).toBeInTheDocument();
    });

    // Admin-1 is logged-in user and only active admin in mockUsersList
    fireEvent.click(screen.getByTestId("edit-user-admin-1"));

    expect(screen.getByTestId("drawer-title")).toHaveTextContent("Edit User");

    const toggle = screen.getByTestId("toggle-active") as HTMLInputElement;
    expect(toggle.disabled).toBe(true);

    const warning = screen.getByTestId("deactivate-warning");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent("Cannot deactivate your own account or the last active administrator.");
  });

  it("API-25 / AC-18: resets initial password in Edit mode and displays success toast", async () => {
    (apiClient.post as any).mockResolvedValue({
      message: "Initial password reset successfully.",
      userId: "staff-1",
      mustChangePassword: true,
    });

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-staff-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-user-staff-1"));

    fireEvent.click(screen.getByTestId("btn-reset-password"));

    const resetInput = screen.getByTestId("input-reset-password");
    expect(resetInput).toBeInTheDocument();

    fireEvent.change(resetInput, { target: { value: "NewResetPass123!" } });

    fireEvent.click(screen.getByTestId("btn-confirm-reset-password"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/admin/users/staff-1/reset-password", {
        newInitialPassword: "NewResetPass123!",
      });
    });

    expect(screen.getByTestId("toast-success")).toHaveTextContent("Password reset successfully");
  });
});
