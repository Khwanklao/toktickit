import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import App, { AppRoutes } from "../../src/App.js";
import { AppShell } from "../../src/components/AppShell.js";
import { Login } from "../../src/components/Login.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";
import { apiClient } from "../../src/lib/apiClient.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    fetch: vi.fn(),
  },
}));

const mockRequesterUser = {
  id: "req-1",
  name: "Jane Requester",
  email: "jane.requester@toktickit.local",
  role: "REQUESTER" as const,
  isActive: true,
  mustChangePassword: false,
};

const mockStaffUser = {
  id: "staff-1",
  name: "Sarah Staff",
  email: "sarah.staff@toktickit.local",
  role: "IT_STAFF" as const,
  isActive: true,
  mustChangePassword: false,
};

const mockAdminUser = {
  id: "admin-1",
  name: "Adam Admin",
  email: "adam.admin@toktickit.local",
  role: "ADMINISTRATOR" as const,
  isActive: true,
  mustChangePassword: false,
};

describe("Requester Navigation & Routing (Lab 4 / Issue 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/requester/dashboard") {
        return Promise.resolve({
          metrics: { activeTickets: 0, inProgressTickets: 0, resolvedTickets: 0, closedTickets: 0 },
          recentRequests: [],
        });
      }
      if (url === "/api/staff/dashboard") {
        return Promise.resolve({
          metrics: { openTickets: 0, unassignedTickets: 0, criticalPending: 0, resolvedToday: 0 },
          activityFeed: [],
        });
      }
      if (url === "/api/categories") return Promise.resolve([]);
      return Promise.resolve({});
    });
  });

  describe("Routing & Access Control for /dashboard", () => {
    it("renders RequesterDashboard for authenticated REQUESTER role", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockRequesterUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
      });
      expect(screen.getByText("Welcome, Jane Requester!")).toBeInTheDocument();
    });

    it("explicitly redirects IT_STAFF to /staff/dashboard when visiting /dashboard", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockStaffUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Welcome back, Sarah Staff!")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("requester-dashboard")).not.toBeInTheDocument();
    });

    it("explicitly redirects ADMINISTRATOR to /staff/dashboard when visiting /dashboard", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockAdminUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Welcome back, Adam Admin!")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("requester-dashboard")).not.toBeInTheDocument();
    });

    it("redirects unauthenticated user visiting /dashboard to /login with state.from", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
      });
      expect(screen.getByText("Sign in to TokTickIT")).toBeInTheDocument();
    });

    it("extends Login getRedirectPath so Requester returning from /dashboard is navigated to /dashboard", async () => {
      const mockLogin = vi.fn().mockResolvedValue(mockRequesterUser);
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: null,
        loading: false,
        login: mockLogin,
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      let testLocation: any;
      const LocationSpy = () => {
        testLocation = useLocation();
        return null;
      };

      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/login",
              state: { from: { pathname: "/dashboard" } },
            },
          ]}
        >
          <Routes>
            <Route
              path="/login"
              element={
                <>
                  <Login />
                  <LocationSpy />
                </>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-target">Dashboard Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: "jane.requester@toktickit.local" },
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-target")).toBeInTheDocument();
      });
    });
  });

  describe("AppShell Requester Navigation Links", () => {
    it("renders Dashboard, My Tickets, and + Create Ticket for REQUESTER", () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockRequesterUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>
      );

      const dashNav = screen.getByTestId("nav-dashboard");
      const myTicketsNav = screen.getByTestId("nav-my-tickets");
      const createNav = screen.getByTestId("nav-create-ticket");

      expect(dashNav).toBeInTheDocument();
      expect(dashNav).toHaveAttribute("href", "/dashboard");
      expect(dashNav).toHaveAttribute("aria-current", "page");

      expect(myTicketsNav).toBeInTheDocument();
      expect(myTicketsNav).toHaveAttribute("href", "/tickets");
      expect(myTicketsNav).not.toHaveAttribute("aria-current");

      expect(createNav).toBeInTheDocument();
      expect(createNav).toHaveAttribute("href", "/tickets/new");
      expect(createNav).not.toHaveAttribute("aria-current");

      expect(screen.queryByTestId("nav-ticket-queue")).not.toBeInTheDocument();
      expect(screen.queryByTestId("nav-user-management")).not.toBeInTheDocument();
    });

    it("marks My Tickets as active aria-current when on /tickets for REQUESTER", () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockRequesterUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/tickets"]}>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>
      );

      const dashNav = screen.getByTestId("nav-dashboard");
      const myTicketsNav = screen.getByTestId("nav-my-tickets");

      expect(myTicketsNav).toHaveAttribute("aria-current", "page");
      expect(dashNav).not.toHaveAttribute("aria-current");
    });

    it("leaves IT_STAFF and ADMINISTRATOR navigation links intact", () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockStaffUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>
      );

      expect(screen.getByTestId("nav-dashboard")).toHaveAttribute("href", "/staff/dashboard");
      expect(screen.getByTestId("nav-ticket-queue")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();

      unmount();

      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockAdminUser,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        checkSession: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={["/admin/users"]}>
          <AppShell>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>
      );

      expect(screen.getByTestId("nav-dashboard")).toHaveAttribute("href", "/staff/dashboard");
      expect(screen.getByTestId("nav-ticket-queue")).toBeInTheDocument();
      expect(screen.getByTestId("nav-user-management")).toBeInTheDocument();
      expect(screen.queryByTestId("nav-my-tickets")).not.toBeInTheDocument();
    });
  });
});

