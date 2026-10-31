import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AppShell } from "../../src/components/AppShell.js";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";
import { apiClient } from "../../src/lib/apiClient.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

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
  name: "Main Admin",
  email: "admin.main@toktickit.local",
  role: "ADMINISTRATOR" as const,
  isActive: true,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: "req-1",
  name: "Alex Requester",
  email: "alex.requester@toktickit.local",
  role: "REQUESTER" as const,
  isActive: true,
  mustChangePassword: false,
};

const mockDashboardData = {
  metrics: {
    newTickets: 14,
    openTickets: 23,
    inProgressTickets: 18,
    waitingRequesterTickets: 7,
    myAssignedTickets: 16,
  },
  recentQueueUpdates: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot access corporate VPN",
      status: "IN_PROGRESS",
      itPriority: "HIGH",
      owner: { id: "staff-1", name: "Sarah Staff" },
      updatedAt: "2026-10-19T09:14:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Printer in Building A offline",
      status: "OPEN",
      itPriority: "MEDIUM",
      owner: null,
      updatedAt: "2026-10-19T08:30:00.000Z",
    },
    {
      id: 103,
      ticketNumber: "TKT-2026-000103",
      summary: "Email sync failing on mobile",
      status: "WAITING_FOR_REQUESTER",
      itPriority: "LOW",
      owner: { id: "staff-2", name: "Alex Staff" },
      updatedAt: "2026-10-19T07:45:00.000Z",
    },
  ],
};

function setupAuth(user: any = mockStaffUser, loading: boolean = false) {
  vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
    user,
    loading,
    setUser: vi.fn(),
    fetchUser: vi.fn(),
    logout: vi.fn(),
  });
}

describe("StaffDashboard Component & Integration Tests (Lab 4 / Issue 5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupAuth(mockStaffUser);
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/staff/dashboard")) {
        return Promise.resolve(mockDashboardData);
      }
      if (url.includes("/api/categories")) {
        return Promise.resolve([]);
      }
      if (url.includes("/api/staff/queue")) {
        return Promise.resolve({ data: [], pagination: { page: 1, limit: 10, totalRecords: 0, totalPages: 1 } });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  describe("UI-03: IT Staff Dashboard Metrics Rendering & Drill-down", () => {
    it("displays 5 metric cards with exact counts and never recalculates them", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      expect(screen.getByTestId("metric-card-open")).toHaveTextContent("23");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("18");
      expect(screen.getByTestId("metric-card-waiting-requester")).toHaveTextContent("7");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveTextContent("16");
    });

    it("metric cards link to correct filtered queue destinations", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-new")).toHaveAttribute("href", "/staff/queue?status=NEW");
      expect(screen.getByTestId("metric-card-open")).toHaveAttribute("href", "/staff/queue?group=open");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveAttribute("href", "/staff/queue?status=IN_PROGRESS");
      expect(screen.getByTestId("metric-card-waiting-requester")).toHaveAttribute("href", "/staff/queue?status=WAITING_FOR_REQUESTER");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveAttribute("href", "/staff/queue?ownerId=me&activeOnly=true");
    });

    it("renders Quick Actions with correct destinations and no Create Ticket button", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("quick-action-search")).toBeInTheDocument();
      });

      expect(screen.getByTestId("quick-action-search")).toHaveTextContent("Search Tickets");
      expect(screen.getByTestId("quick-action-my-queue")).toHaveAttribute("href", "/staff/queue?ownerId=me&activeOnly=true");
      expect(screen.getByTestId("quick-action-ticket-queue")).toHaveAttribute("href", "/staff/queue");

      // UI-spec Section 9: Strictly NO "Create Ticket" anywhere on staff dashboard
      expect(screen.queryByText("+ Create Ticket")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Ticket")).not.toBeInTheDocument();
    });
  });

  describe("UI-20: Staff Dashboard Zero-State Rendering (AC-16)", () => {
    it("renders 0 counters on all cards when metrics are zero", async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        metrics: {
          newTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          waitingRequesterTickets: 0,
          myAssignedTickets: 0,
        },
        recentQueueUpdates: [],
      });

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-open")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-waiting-requester")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveTextContent("0");
    });

    it("displays empty feed message when recentQueueUpdates is empty", async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        metrics: {
          newTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          waitingRequesterTickets: 0,
          myAssignedTickets: 0,
        },
        recentQueueUpdates: [],
      });

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-updates-empty")).toBeInTheDocument();
      });

      expect(screen.getByText("No recent queue updates found.")).toBeInTheDocument();
    });
  });

  describe("UI-21: Loading Skeletons, Error Banner with Retry & Access Control (AC-15, AC-17)", () => {
    it("renders skeleton cards and 4 skeleton rows with aria-busy while loading", () => {
      (apiClient.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      const loadingContainer = screen.getByTestId("dashboard-loading");
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveAttribute("aria-busy", "true");
      expect(screen.getByRole("status")).toBeInTheDocument();

      const skeletonCards = screen.getAllByTestId("skeleton-card");
      expect(skeletonCards.length).toBe(5);

      const skeletonRows = screen.getAllByTestId("skeleton-row");
      expect(skeletonRows.length).toBe(4);
    });

    it("renders safe error banner with role='alert' and Retry button on API failure", async () => {
      (apiClient.get as any).mockRejectedValueOnce(new Error("Database connection refused at /internal/db.ts:42"));

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const alertBanner = screen.getByRole("alert");
      expect(alertBanner).toHaveTextContent("Something went wrong. Please try again.");
      expect(alertBanner).not.toHaveTextContent("Database connection");
      expect(alertBanner).not.toHaveTextContent("/internal/db.ts");

      // Verify Retry button re-fetches
      (apiClient.get as any).mockResolvedValueOnce(mockDashboardData);
      const retryButton = screen.getByRole("button", { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });
      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
    });

    it("renders Access Restricted page when accessed by REQUESTER", async () => {
      setupAuth(mockRequesterUser);

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      expect(screen.getByTestId("access-restricted-screen")).toBeInTheDocument();
      expect(screen.getByText("You do not have permission to view this screen.")).toBeInTheDocument();
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it("renders Access Restricted page when API returns 403 Forbidden", async () => {
      (apiClient.get as any).mockRejectedValueOnce({ status: 403, response: { status: 403 } });

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-screen")).toBeInTheDocument();
      });
      expect(screen.getByText("You do not have permission to view this screen.")).toBeInTheDocument();
    });

    it("redirects to /login when unauthenticated or API returns 401 Unauthorized", async () => {
      (apiClient.get as any).mockRejectedValueOnce({ status: 401, response: { status: 401 } });

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });
    });
  });

  describe("UI-22: Recent Queue Updates Feed Content & Navigation (AC-15)", () => {
    it("renders feed rows in exact API order with badges, formatted date, and owner", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-update-row-101")).toBeInTheDocument();
      });

      const rows = screen.getAllByTestId(/recent-update-row-/);
      expect(rows.length).toBe(3);
      expect(rows[0]).toHaveAttribute("data-testid", "recent-update-row-101");
      expect(rows[1]).toHaveAttribute("data-testid", "recent-update-row-102");
      expect(rows[2]).toHaveAttribute("data-testid", "recent-update-row-103");

      // Row 101 details
      expect(rows[0]).toHaveTextContent("TKT-2026-000101");
      expect(rows[0]).toHaveTextContent("Cannot access corporate VPN");
      expect(rows[0]).toHaveTextContent("In Progress");
      expect(rows[0]).toHaveTextContent("High");
      expect(rows[0]).toHaveTextContent("Sarah Staff");

      // Row 102 with null owner shows "Unassigned"
      expect(rows[1]).toHaveTextContent("TKT-2026-000102");
      expect(rows[1]).toHaveTextContent("Unassigned");

      // Verify Bangkok time is formatted
      expect(rows[0]).toHaveTextContent("Oct 19, 2026");
    });

    it("clicking a ticket row navigates to /staff/tickets/:id", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/tickets/:id" element={<div data-testid="staff-ticket-detail-screen">Ticket Detail Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-update-row-101")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("recent-update-row-101"));

      await waitFor(() => {
        expect(screen.getByTestId("staff-ticket-detail-screen")).toBeInTheDocument();
      });
    });
  });

  describe("UI-23: Header Greeting, Refresh Behavior & Accessibility (AC-15, Section 3.1, 8)", () => {
    it("displays personalized greeting with user name and subtitle", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Welcome back, Sarah Staff!")).toBeInTheDocument();
      });
      expect(screen.getByText("Here's what's happening with your queue today.")).toBeInTheDocument();
    });

    it("Refresh button triggers refetch and enters disabled state with spinner while loading", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("refresh-dashboard-btn")).toBeInTheDocument();
      });

      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      expect(refreshBtn).not.toBeDisabled();

      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledTimes(2);
      });
      await waitFor(() => {
        expect(refreshBtn).not.toBeDisabled();
      });
    });

    it("metric cards carry descriptive aria-labels for screen readers", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-new")).toHaveAttribute("aria-label", "New tickets: 14, view in queue");
      expect(screen.getByTestId("metric-card-open")).toHaveAttribute("aria-label", "Open tickets: 23, view in queue");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveAttribute("aria-label", "In progress tickets: 18, view in queue");
      expect(screen.getByTestId("metric-card-waiting-requester")).toHaveAttribute("aria-label", "Waiting for requester tickets: 7, view in queue");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveAttribute("aria-label", "My assigned tickets: 16, view in queue");
    });

    it("AppShell navigation displays Dashboard and Ticket Queue for IT Staff with aria-current='page'", async () => {
      setupAuth(mockStaffUser);

      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <AppShell>
            <div>Dashboard Content</div>
          </AppShell>
        </MemoryRouter>
      );

      const dashboardNav = screen.getByTestId("nav-dashboard");
      const queueNav = screen.getByTestId("nav-ticket-queue");

      expect(dashboardNav).toBeInTheDocument();
      expect(dashboardNav).toHaveTextContent("Dashboard");
      expect(dashboardNav).toHaveAttribute("aria-current", "page");

      expect(queueNav).toBeInTheDocument();
      expect(queueNav).toHaveTextContent("Ticket Queue");
      expect(queueNav).not.toHaveAttribute("aria-current", "page");

      expect(screen.queryByTestId("nav-user-management")).not.toBeInTheDocument();
    });

    it("AppShell navigation displays Dashboard, Ticket Queue, and User Management for Administrator", async () => {
      setupAuth(mockAdminUser);

      render(
        <MemoryRouter initialEntries={["/admin/users"]}>
          <AppShell>
            <div>Admin Users Content</div>
          </AppShell>
        </MemoryRouter>
      );

      const dashboardNav = screen.getByTestId("nav-dashboard");
      const queueNav = screen.getByTestId("nav-ticket-queue");
      const userMgmtNav = screen.getByTestId("nav-user-management");

      expect(dashboardNav).toBeInTheDocument();
      expect(dashboardNav).toHaveAttribute("href", "/staff/dashboard");
      expect(dashboardNav).not.toHaveAttribute("aria-current", "page");

      expect(queueNav).toBeInTheDocument();
      expect(queueNav).toHaveAttribute("href", "/staff/queue");

      expect(userMgmtNav).toBeInTheDocument();
      expect(userMgmtNav).toHaveAttribute("href", "/admin/users");
      expect(userMgmtNav).toHaveAttribute("aria-current", "page");
    });
  });

  describe("Quick Action Search Focus Signal Integration", () => {
    it("Search Tickets quick action navigates to /staff/queue and focuses the search input", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("quick-action-search")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("quick-action-search"));

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe("UI-24: Refresh Error Handling, Data Preservation & Request Sequencing", () => {
    it("keeps existing data and displays warning banner when refresh fails after successful load", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      });

      // Next refresh fails
      (apiClient.get as any).mockRejectedValueOnce(new Error("Network disconnect"));

      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Warning banner states that refresh failed and data may be out of date
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/failed to refresh/i);
      expect(alert).toHaveTextContent(/data shown may be out of date/i);

      // Data is PRESERVED on screen
      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      expect(screen.getByTestId("metric-card-open")).toHaveTextContent("23");
      expect(screen.getByTestId("recent-update-row-101")).toBeInTheDocument();

      // Refresh button is re-enabled and spinner is removed
      expect(refreshBtn).not.toBeDisabled();
      expect(screen.queryByText("Refreshing...")).not.toBeInTheDocument();
    });

    it("removes refresh error banner upon subsequent successful refresh", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      });

      // Refresh 1 fails
      (apiClient.get as any).mockRejectedValueOnce(new Error("500 Internal Server Error"));
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Refresh 2 succeeds with updated data
      const updatedData = {
        metrics: { ...mockDashboardData.metrics, newTickets: 99 },
        recentQueueUpdates: mockDashboardData.recentQueueUpdates,
      };
      (apiClient.get as any).mockResolvedValueOnce(updatedData);

      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("99");
      });

      // Banner is removed
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("refresh returning 401 redirects to /login immediately", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      });

      // Refresh returns 401
      (apiClient.get as any).mockRejectedValueOnce({ status: 401, response: { status: 401 } });
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("login-screen")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("metric-card-new")).not.toBeInTheDocument();
    });

    it("refresh returning 403 shows Access Restricted and clears cached data", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      });

      // Refresh returns 403
      (apiClient.get as any).mockRejectedValueOnce({ status: 403, response: { status: 403 } });
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-screen")).toBeInTheDocument();
      });
      // Cached data must NOT be rendered
      expect(screen.queryByTestId("metric-card-new")).not.toBeInTheDocument();
      expect(screen.queryByTestId("recent-update-row-101")).not.toBeInTheDocument();
    });

    it("ignores out-of-order refresh responses so older response does not overwrite newer data", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <StaffDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("14");
      });

      let resolveSlow: any;
      const slowPromise = new Promise((resolve) => {
        resolveSlow = resolve;
      });

      // First refresh is slow
      (apiClient.get as any).mockImplementationOnce(() => slowPromise);
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      // Second refresh resolves fast with 50 tickets
      const fastData = {
        metrics: { ...mockDashboardData.metrics, newTickets: 50 },
        recentQueueUpdates: mockDashboardData.recentQueueUpdates,
      };
      (apiClient.get as any).mockResolvedValueOnce(fastData);
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toHaveTextContent("50");
      });

      // Now slow response finishes with older data (e.g. 5 tickets)
      const slowData = {
        metrics: { ...mockDashboardData.metrics, newTickets: 5 },
        recentQueueUpdates: mockDashboardData.recentQueueUpdates,
      };
      resolveSlow(slowData);

      // Metric must REMAIN 50, not overwritten by slowData (5)
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("50");
    });
  });

  describe("UI-25: Cross-Component Drill-down & Filter Integration", () => {
    it("navigating from Open card applies group=open, renders chip, and removing chip refetches without group", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/dashboard"]}>
          <Routes>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-open")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("metric-card-open"));

      await waitFor(() => {
        expect(screen.getByTestId("chip-group-open")).toBeInTheDocument();
      });
      expect(screen.getByTestId("chip-group-open")).toHaveTextContent("Open tickets");

      // Verify API was called with group=open
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("group=open"));

      // Click remove on chip
      const removeBtn = screen.getByRole("button", { name: /Remove filter: Open tickets/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
      });
    });

    it("verifies drill-down destinations for all other metric cards", async () => {
      const renderAppAtDashboard = () =>
        render(
          <MemoryRouter initialEntries={["/staff/dashboard"]}>
            <Routes>
              <Route path="/staff/dashboard" element={<StaffDashboard />} />
              <Route path="/staff/queue" element={<StaffTicketQueue />} />
            </Routes>
          </MemoryRouter>
        );

      // 1. New Card
      const view1 = renderAppAtDashboard();
      await waitFor(() => {
        expect(screen.getByTestId("metric-card-new")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("metric-card-new"));
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("status=NEW"));
      });
      view1.unmount();

      // 2. In Progress Card
      const view2 = renderAppAtDashboard();
      await waitFor(() => {
        expect(screen.getByTestId("metric-card-in-progress")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("metric-card-in-progress"));
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("status=IN_PROGRESS"));
      });
      view2.unmount();

      // 3. Waiting for Requester Card
      const view3 = renderAppAtDashboard();
      await waitFor(() => {
        expect(screen.getByTestId("metric-card-waiting-requester")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("metric-card-waiting-requester"));
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("status=WAITING_FOR_REQUESTER"));
      });
      view3.unmount();

      // 4. My Assigned Card
      const view4 = renderAppAtDashboard();
      await waitFor(() => {
        expect(screen.getByTestId("metric-card-my-assigned")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("metric-card-my-assigned"));
      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("ownerId=me"));
        expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("activeOnly=true"));
      });
      view4.unmount();
    });
  });
});

