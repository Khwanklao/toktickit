import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
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

const mockStaffUser = {
  id: "staff-1",
  name: "Sarah Staff",
  email: "sarah.staff@toktickit.local",
  role: "IT_STAFF" as const,
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

describe("UI-04: Dashboard Zero-State Rendering (AC-16)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Staff Dashboard Zero-State (AC-16)", () => {
    it("renders 0 counters across all 5 metric cards and displays clean empty feed banner", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockStaffUser,
        loading: false,
        setUser: vi.fn(),
        fetchUser: vi.fn(),
        logout: vi.fn(),
      } as any);

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

      // Verify all 5 metric cards show "0"
      expect(screen.getByTestId("metric-card-new")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-open")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-waiting-requester")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-my-assigned")).toHaveTextContent("0");

      // Verify empty feed banner
      expect(screen.getByTestId("recent-updates-empty")).toBeInTheDocument();
      expect(screen.getByText("No recent queue updates found.")).toBeInTheDocument();
    });
  });

  describe("Requester Dashboard Zero-State (AC-16)", () => {
    it("renders 0 counters across all 4 metric cards and displays empty state with CTA", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: mockRequesterUser,
        loading: false,
        setUser: vi.fn(),
        fetchUser: vi.fn(),
        logout: vi.fn(),
      } as any);

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
        expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
      });

      // Verify all 4 metric cards show "0"
      expect(screen.getByTestId("metric-card-active")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-in-progress")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-resolved")).toHaveTextContent("0");
      expect(screen.getByTestId("metric-card-closed")).toHaveTextContent("0");

      // Verify empty feed state and CTA
      expect(screen.getByTestId("recent-requests-empty")).toBeInTheDocument();
      expect(screen.getByText("You haven't submitted any tickets yet.")).toBeInTheDocument();
      const cta = screen.getByTestId("create-first-ticket-cta");
      expect(cta).toBeInTheDocument();
      expect(cta).toHaveAttribute("href", "/tickets/new");
    });
  });
});
