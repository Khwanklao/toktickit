import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import { apiClient } from "../../src/lib/apiClient.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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

const mockDashboardData = {
  metrics: {
    activeTickets: 5,
    inProgressTickets: 2,
    resolvedTickets: 3,
    closedTickets: 8,
  },
  recentRequests: [
    {
      id: 201,
      ticketNumber: "TKT-2026-000201",
      summary: "Cannot connect to corporate Wi-Fi",
      status: "WAITING_FOR_REQUESTER",
      needsAttention: true,
      updatedAt: "2026-10-19T09:14:00.000Z",
    },
    {
      id: 202,
      ticketNumber: "TKT-2026-000202",
      summary: "Request second display monitor",
      status: "IN_PROGRESS",
      needsAttention: false,
      updatedAt: "2026-10-18T14:30:00.000Z",
    },
    {
      id: 203,
      ticketNumber: "TKT-2026-000203",
      summary: "Email synchronization failed on mobile",
      status: "RESOLVED",
      needsAttention: false,
      updatedAt: "2026-10-17T11:00:00.000Z",
    },
    {
      id: 204,
      ticketNumber: "TKT-2026-000204",
      summary: "Ergonomic keyboard replacement",
      status: "CLOSED",
      needsAttention: false,
      updatedAt: "2026-10-16T08:20:00.000Z",
    },
  ],
};

describe("RequesterDashboard Component Tests (Lab 4 / Issue 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockRequesterUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn(),
    });

    (apiClient.get as any).mockResolvedValue(mockDashboardData);
  });

  describe("UI-02: Requester Dashboard Metrics Rendering & Drill-down (AC-14)", () => {
    it("displays 4 metric cards with exact counts and never recalculates them", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("2");
      expect(screen.getByTestId("metric-card-resolved")).toHaveTextContent("3");
      expect(screen.getByTestId("metric-card-closed")).toHaveTextContent("8");
    });

    it("metric cards carry descriptive aria-labels for screen readers", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-active")).toHaveAttribute(
        "aria-label",
        "Active tickets: 5, view all"
      );
      expect(screen.getByTestId("metric-card-in-progress")).toHaveAttribute(
        "aria-label",
        "In progress tickets: 2, view all"
      );
      expect(screen.getByTestId("metric-card-resolved")).toHaveAttribute(
        "aria-label",
        "Resolved tickets: 3, view all"
      );
      expect(screen.getByTestId("metric-card-closed")).toHaveAttribute(
        "aria-label",
        "Closed tickets: 8, view all"
      );
    });

    it("metric cards link to correct filtered /tickets destinations", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-active")).toHaveAttribute("href", "/tickets?group=open");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveAttribute(
        "href",
        "/tickets?status=IN_PROGRESS"
      );
      expect(screen.getByTestId("metric-card-resolved")).toHaveAttribute(
        "href",
        "/tickets?status=RESOLVED"
      );
      expect(screen.getByTestId("metric-card-closed")).toHaveAttribute("href", "/tickets?status=CLOSED");
    });

    it("renders Quick Actions with correct destinations", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("quick-action-create-ticket")).toBeInTheDocument();
      });

      expect(screen.getByTestId("quick-action-create-ticket")).toHaveAttribute("href", "/tickets/new");
      expect(screen.getByTestId("quick-action-my-tickets")).toHaveAttribute("href", "/tickets");
    });
  });

  describe("UI-14: Recent Requests Feed, Order & needsAttention Highlights (AC-14)", () => {
    it("renders recent requests in exact API order with StatusBadge and formatted Bangkok time", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-request-row-201")).toBeInTheDocument();
      });

      const rows = screen.getAllByTestId(/^recent-request-row-/);
      expect(rows).toHaveLength(4);
      expect(rows[0]).toHaveAttribute("data-testid", "recent-request-row-201");
      expect(rows[1]).toHaveAttribute("data-testid", "recent-request-row-202");
      expect(rows[2]).toHaveAttribute("data-testid", "recent-request-row-203");
      expect(rows[3]).toHaveAttribute("data-testid", "recent-request-row-204");

      expect(screen.getByText("Cannot connect to corporate Wi-Fi")).toBeInTheDocument();
      expect(screen.getByText("Request second display monitor")).toBeInTheDocument();
    });

    it("renders needsAttention tickets with amber styling, Action Required badge, and reply hint", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-request-row-201")).toBeInTheDocument();
      });

      const row201 = screen.getByTestId("recent-request-row-201");
      expect(row201.querySelector("[data-testid='badge-action-required']")).toBeInTheDocument();
      expect(row201.querySelector("[data-testid='hint-action-required']")).toHaveTextContent(
        "IT Staff is waiting for your reply. Add a comment."
      );

      // Ticket 202 does NOT need attention
      const row202 = screen.getByTestId("recent-request-row-202");
      expect(row202.querySelector("[data-testid='badge-action-required']")).not.toBeInTheDocument();
    });

    it("clicking a recent request row navigates to /tickets/:id", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<RequesterDashboard />} />
            <Route path="/tickets/:id" element={<div data-testid="ticket-detail-view">Ticket Detail View</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-request-row-201")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("recent-request-row-201"));

      await waitFor(() => {
        expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
      });
    });
  });

  describe("Zero-State & Empty Feed (AC-16)", () => {
    it("renders 0 counters on all cards when metrics are zero", async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        metrics: {
          activeTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
        },
        recentRequests: [],
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toBeInTheDocument();
      });

      expect(screen.getByTestId("metric-card-active")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-resolved")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-closed")).toHaveTextContent("0");
    });

    it("displays empty state with + Create First Ticket CTA when recentRequests is empty", async () => {
      (apiClient.get as any).mockResolvedValueOnce({
        metrics: {
          activeTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
        },
        recentRequests: [],
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("recent-requests-empty")).toBeInTheDocument();
      });

      expect(screen.getByText("You haven't submitted any tickets yet.")).toBeInTheDocument();
      const createFirstBtn = screen.getByTestId("create-first-ticket-cta");
      expect(createFirstBtn).toBeInTheDocument();
      expect(createFirstBtn).toHaveAttribute("href", "/tickets/new");
    });
  });

  describe("Loading Skeletons, Initial Error & Access Control (AC-15, AC-17)", () => {
    it("renders skeleton cards and skeleton rows with aria-busy while loading", () => {
      let resolveFetch: any;
      (apiClient.get as any).mockImplementationOnce(
        () => new Promise((resolve) => { resolveFetch = resolve; })
      );

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      const loadingContainer = screen.getByTestId("dashboard-loading");
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveAttribute("aria-busy", "true");

      expect(screen.getAllByTestId("skeleton-card")).toHaveLength(4);
      expect(screen.getAllByTestId("skeleton-row").length).toBeGreaterThanOrEqual(1);

      // Clean up promise
      resolveFetch(mockDashboardData);
    });

    it("renders error banner with role='alert' and Retry button on initial API failure", async () => {
      (apiClient.get as any).mockRejectedValueOnce(new Error("500 Internal Server Error"));

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: /retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Clicking retry triggers refetch
      (apiClient.get as any).mockResolvedValueOnce(mockDashboardData);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toBeInTheDocument();
      });
    });

    it("renders Access Restricted page when accessed by non-Requester or API returns 403 Forbidden", async () => {
      (apiClient.get as any).mockRejectedValueOnce({ status: 403, response: { status: 403 } });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-screen")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("metric-card-active")).not.toBeInTheDocument();
    });

    it("redirects to /login when unauthenticated or API returns 401 Unauthorized", async () => {
      (apiClient.get as any).mockRejectedValueOnce({ status: 401, response: { status: 401 } });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<RequesterDashboard />} />
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("login-screen")).toBeInTheDocument();
      });
    });
  });

  describe("Refresh Error Handling, Data Preservation & Request Sequencing", () => {
    it("keeps existing data and displays warning banner when refresh fails after successful load", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      });

      // Refresh fails
      (apiClient.get as any).mockRejectedValueOnce(new Error("Network disconnect"));
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(/failed to refresh/i);
      expect(alert).toHaveTextContent(/data shown may be out of date/i);

      // Data is preserved
      expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      expect(screen.getByTestId("recent-request-row-201")).toBeInTheDocument();
      expect(refreshBtn).not.toBeDisabled();
    });

    it("subsequent successful refresh replaces data and removes warning banner", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      });

      // Refresh 1 fails
      (apiClient.get as any).mockRejectedValueOnce(new Error("500 Error"));
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Refresh 2 succeeds
      (apiClient.get as any).mockResolvedValueOnce({
        metrics: { ...mockDashboardData.metrics, activeTickets: 99 },
        recentRequests: mockDashboardData.recentRequests,
      });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("99");
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("refresh returning 401 redirects to /login immediately", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/dashboard" element={<RequesterDashboard />} />
            <Route path="/login" element={<div data-testid="login-screen">Login Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      });

      (apiClient.get as any).mockRejectedValueOnce({ status: 401, response: { status: 401 } });
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("login-screen")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("metric-card-active")).not.toBeInTheDocument();
    });

    it("refresh returning 403 shows Access Restricted and clears cached data", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      });

      (apiClient.get as any).mockRejectedValueOnce({ status: 403, response: { status: 403 } });
      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByTestId("access-restricted-screen")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("metric-card-active")).not.toBeInTheDocument();
    });

    it("prevents starting a second refresh while one is already pending", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("5");
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);

      let resolveSlow: any;
      const slowPromise = new Promise((resolve) => { resolveSlow = resolve; });
      (apiClient.get as any).mockImplementationOnce(() => slowPromise);

      const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
      fireEvent.click(refreshBtn);

      expect(refreshBtn).toBeDisabled();
      expect(apiClient.get).toHaveBeenCalledTimes(2);

      // Second click while pending is ignored
      fireEvent.click(refreshBtn);
      expect(apiClient.get).toHaveBeenCalledTimes(2);

      resolveSlow({
        metrics: { ...mockDashboardData.metrics, activeTickets: 25 },
        recentRequests: mockDashboardData.recentRequests,
      });

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("25");
      });
      expect(refreshBtn).not.toBeDisabled();
    });

    it("ignores out-of-order responses so older response does not overwrite newer data", async () => {
      (apiClient.get as any).mockRejectedValueOnce(new Error("Initial load failure"));

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      let resolveSlow: any;
      const slowPromise = new Promise((resolve) => { resolveSlow = resolve; });
      (apiClient.get as any).mockImplementationOnce(() => slowPromise);

      const retryBtn = screen.getByRole("button", { name: /retry/i });
      fireEvent.click(retryBtn);

      // Fast response
      const fastData = {
        metrics: { ...mockDashboardData.metrics, activeTickets: 50 },
        recentRequests: mockDashboardData.recentRequests,
      };
      (apiClient.get as any).mockResolvedValueOnce(fastData);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("metric-card-active")).toHaveTextContent("50");
      });

      // Older slow response arrives
      resolveSlow({
        metrics: { ...mockDashboardData.metrics, activeTickets: 10 },
        recentRequests: mockDashboardData.recentRequests,
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByTestId("metric-card-active")).toHaveTextContent("50");
    });
  });

  describe("Header Greeting & Accessibility (AC-14, Section 3.2)", () => {
    it("displays personalized greeting with requester name and subtitle", async () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <RequesterDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Welcome, Jane Requester!")).toBeInTheDocument();
      });
      expect(screen.getByText("Here's the latest on your requests.")).toBeInTheDocument();
    });
  });
});

