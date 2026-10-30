import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import { apiClient } from "../../src/lib/apiClient.js";

let mockUser = { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com", role: "IT_STAFF" };

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe("Staff Ticket Detail Workflow & Actions Taken Tests (UI-07, UI-08, UI-09, UI-10, UI-12)", () => {
  const baseTicket = {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Server connectivity outage",
    description: "Database server unreachable from app subnet",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    status: "IN_PROGRESS",
    isRequesterResolved: false,
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T09:00:00.000Z",
    reopenedAt: null,
    category: { id: 1, name: "Infrastructure" },
    relatedSystem: { id: 1, name: "Database" },
    requester: { id: "req-1", name: "Alex Requester", email: "alex@example.com" },
    owner: { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com" },
    attachments: [],
  };

  const sampleAction = {
    id: "act-1",
    ticketId: 101,
    actionDateTime: "2026-10-19T08:30:00.000Z",
    performedById: "staff-1",
    performedBy: { id: "staff-1", name: "Sarah Staff", role: "IT_STAFF" },
    description: "Rebooted router and flushed DNS cache",
    result: "Connection restored to primary replica",
    followUpRequired: true,
    followUpNote: "Monitor packet loss for next 2 hours",
    attachmentNotes: "See router_logs.txt",
    createdAt: "2026-10-19T08:35:00.000Z",
    updatedAt: "2026-10-19T08:45:00.000Z", // updatedAt > createdAt -> Edited
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockUser = { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com", role: "IT_STAFF" };

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/tickets/101") {
        return Promise.resolve(baseTicket);
      }
      if (url === "/api/tickets/101/actions") {
        return Promise.resolve({ actions: [sampleAction] });
      }
      if (url.endsWith("/comments")) {
        return Promise.resolve({ comments: [] });
      }
      if (url.endsWith("/internal-notes")) {
        return Promise.resolve({ notes: [] });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={["/staff/tickets/101"]}>
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

  // UI-10: Actions Taken Tab & Timeline
  describe("UI-10: Actions Taken Tab & Timeline Rendering", () => {
    it("renders Actions Taken tab with count badge and accessibility attributes", async () => {
      renderComponent();

      const tab = await screen.findByRole("tab", { name: /Actions Taken \(1\)/i });
      expect(tab).toBeInTheDocument();
      expect(tab).toHaveAttribute("aria-controls", "actions-panel");

      fireEvent.click(tab);

      const panel = await screen.findByRole("tabpanel");
      expect(panel).toHaveAttribute("id", "actions-panel");
      expect(screen.getByText("Rebooted router and flushed DNS cache")).toBeInTheDocument();
      expect(screen.getByText("Connection restored to primary replica")).toBeInTheDocument();
      expect(screen.getByText("Follow-Up Required")).toBeInTheDocument();
      expect(screen.getByText("Monitor packet loss for next 2 hours")).toBeInTheDocument();
      expect(screen.getByText(/See router_logs\.txt/i)).toBeInTheDocument();
      // Edited tag because updatedAt > createdAt
      expect(screen.getByText(/Edited/i)).toBeInTheDocument();
      // Performer name and role badge
      expect(within(panel).getByText("Sarah Staff")).toBeInTheDocument();
      // Formatted date/time (Asia/Bangkok: Oct 19, 2026, 3:30 PM for 08:30:00 UTC)
      expect(screen.getByText(/Oct 19, 2026/i)).toBeInTheDocument();
    });

    it("renders empty state message when ticket has 0 actions", async () => {
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === "/api/tickets/101") return Promise.resolve(baseTicket);
        if (url === "/api/tickets/101/actions") return Promise.resolve({ actions: [] });
        if (url.endsWith("/comments")) return Promise.resolve({ comments: [] });
        if (url.endsWith("/internal-notes")) return Promise.resolve({ notes: [] });
        return Promise.reject(new Error(`Not found: ${url}`));
      });

      renderComponent();

      const tab = await screen.findByRole("tab", { name: /Actions Taken \(0\)/i });
      fireEvent.click(tab);

      expect(
        await screen.findByText("No actions recorded yet. IT Staff will log diagnostic and repair steps here.")
      ).toBeInTheDocument();
    });
  });

  // UI-07: Terminal Write Lock
  describe("UI-07: Terminal Write Lock (CLOSED / CANCELLED)", () => {
    it("hides record/edit action buttons and shows terminal banner on CLOSED ticket", async () => {
      const closedTicket = { ...baseTicket, status: "CLOSED" };
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === "/api/tickets/101") return Promise.resolve(closedTicket);
        if (url === "/api/tickets/101/actions") return Promise.resolve({ actions: [sampleAction] });
        if (url.endsWith("/comments")) return Promise.resolve({ comments: [] });
        if (url.endsWith("/internal-notes")) return Promise.resolve({ notes: [] });
        return Promise.reject(new Error(`Not found: ${url}`));
      });

      renderComponent();

      const tab = await screen.findByRole("tab", { name: /Actions Taken/i });
      fireEvent.click(tab);

      // Terminal banner
      expect(
        await screen.findByText("This ticket is closed; Actions Taken can no longer be changed.")
      ).toBeInTheDocument();
      // Record Action button should NOT exist
      expect(screen.queryByTestId("record-action-btn")).not.toBeInTheDocument();
      // Edit button on action card should NOT exist
      expect(screen.queryByTestId("edit-action-btn-act-1")).not.toBeInTheDocument();

      // Status dropdown should be disabled with Final status
      const statusSelect = screen.getByTestId("status-dropdown");
      expect(statusSelect).toBeDisabled();
      expect(statusSelect).toHaveTextContent(/Final status/i);
    });

    it("hides record/edit action buttons on CANCELLED ticket", async () => {
      const cancelledTicket = { ...baseTicket, status: "CANCELLED" };
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === "/api/tickets/101") return Promise.resolve(cancelledTicket);
        if (url === "/api/tickets/101/actions") return Promise.resolve({ actions: [sampleAction] });
        if (url.endsWith("/comments")) return Promise.resolve({ comments: [] });
        if (url.endsWith("/internal-notes")) return Promise.resolve({ notes: [] });
        return Promise.reject(new Error(`Not found: ${url}`));
      });

      renderComponent();

      const tab = await screen.findByRole("tab", { name: /Actions Taken/i });
      fireEvent.click(tab);

      expect(
        await screen.findByText("This ticket is closed; Actions Taken can no longer be changed.")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("record-action-btn")).not.toBeInTheDocument();
    });
  });

  // UI-08: Resolution Gate Feedback
  describe("UI-08: Resolution Gate Feedback (BR-12)", () => {
    it("displays hint 'Record an Action Taken first' when ticket has no actions", async () => {
      (apiClient.get as any).mockImplementation((url: string) => {
        if (url === "/api/tickets/101") return Promise.resolve(baseTicket);
        if (url === "/api/tickets/101/actions") return Promise.resolve({ actions: [] });
        if (url.endsWith("/comments")) return Promise.resolve({ comments: [] });
        if (url.endsWith("/internal-notes")) return Promise.resolve({ notes: [] });
        return Promise.reject(new Error(`Not found: ${url}`));
      });

      renderComponent();

      await screen.findByText("Server connectivity outage");
      const statusSelect = screen.getByTestId("status-dropdown");
      // RESOLVED option should still be selectable, but show hint
      const resolvedOption = screen.getByRole("option", { name: /Resolved/i });
      expect(resolvedOption).toHaveTextContent(/Record an Action Taken first/i);
      expect(resolvedOption).not.toBeDisabled();
    });

    it("shows inline banner with 'Record Action Taken' button on 400 RESOLUTION_ACTION_REQUIRED", async () => {
      (apiClient.patch as any).mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: {
              code: "RESOLUTION_ACTION_REQUIRED",
              message: "Record at least one Action Taken (after the reopen, if reopened) before resolving.",
            },
          },
        },
      });

      renderComponent();

      await screen.findByText("Server connectivity outage");
      const statusSelect = screen.getByTestId("status-dropdown");

      // Select RESOLVED
      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: "RESOLVED" } });
      });

      // Confirmation modal appears for RESOLVED
      const confirmBtn = await screen.findByTestId("confirm-status-btn");
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Inline banner should appear
      const errorBanner = await screen.findByTestId("resolution-required-banner");
      expect(errorBanner).toHaveTextContent(
        "Record at least one Action Taken (after the reopen, if reopened) before resolving."
      );

      // Record Action Taken button inside banner opens modal
      const recordBtn = screen.getByTestId("resolution-record-action-btn");
      expect(recordBtn).toBeInTheDocument();
      fireEvent.click(recordBtn);

      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Record Action Taken" })).toBeInTheDocument();
    });
  });

  // UI-09: Admin Boundary
  describe("UI-09: Administrator Operational Boundary (BR-09)", () => {
    it("disables status, priority, and owner controls for Administrator with tooltip", async () => {
      mockUser = { id: "admin-1", name: "Adam Admin", email: "admin@example.com", role: "ADMINISTRATOR" };

      renderComponent();

      await screen.findByText("Server connectivity outage");

      const statusSelect = screen.getByTestId("status-dropdown");
      expect(statusSelect).toBeDisabled();

      const prioritySelect = screen.getByTestId("it-priority-dropdown");
      expect(prioritySelect).toBeDisabled();

      // Tooltip wrapper
      const statusContainer = screen.getByTestId("status-control-container");
      expect(statusContainer).toHaveAttribute("title", "Only IT Staff can change status, owner, or priority.");

      // Administrator can still view and record Actions Taken
      const tab = screen.getByRole("tab", { name: /Actions Taken/i });
      fireEvent.click(tab);

      expect(await screen.findByTestId("record-action-btn")).toBeInTheDocument();
      expect(screen.getByTestId("edit-action-btn-act-1")).toBeInTheDocument();
    });
  });

  // UI-12: Workflow Transitions and Status Confirmation Modal
  describe("UI-12: Workflow Transitions & Status Confirmation Modal (BR-10, BR-16)", () => {
    it("filters status dropdown to only permitted transitions from current status", async () => {
      // baseTicket status is IN_PROGRESS
      // Permitted from IN_PROGRESS: WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
      renderComponent();

      await screen.findByText("Server connectivity outage");
      const options = screen.getAllByRole("option").map((o) => (o as HTMLOptionElement).value);

      expect(options).toContain("IN_PROGRESS"); // Current status
      expect(options).toContain("WAITING_FOR_REQUESTER");
      expect(options).toContain("RESOLVED");
      expect(options).toContain("CANCELLED");
      expect(options).not.toContain("NEW");
      expect(options).not.toContain("OPEN");
      expect(options).not.toContain("CLOSED");
      expect(options).not.toContain("REOPENED");
    });

    it("displays confirmation modal before transitioning to RESOLVED, CLOSED, or CANCELLED with action count & summary", async () => {
      renderComponent();

      await screen.findByText("Server connectivity outage");
      const statusSelect = screen.getByTestId("status-dropdown");

      // Select CANCELLED
      fireEvent.change(statusSelect, { target: { value: "CANCELLED" } });

      const modal = await screen.findByTestId("status-confirm-modal");
      expect(modal).toBeInTheDocument();
      expect(screen.getByText(/Total Actions Taken: 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Rebooted router and flushed DNS cache/i)).toBeInTheDocument();

      // Cancel button closes modal and reverts dropdown
      const cancelBtn = screen.getByTestId("cancel-status-btn");
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("status-confirm-modal")).not.toBeInTheDocument();
      });
      expect(statusSelect).toHaveValue("IN_PROGRESS");
    });

    it("sends expectedUpdatedAt when confirming status change and displays 409 STALE_UPDATE banner with Reload Latest", async () => {
      (apiClient.patch as any).mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            error: {
              code: "STALE_UPDATE",
              message: "Record was modified by another user.",
            },
          },
        },
      });

      renderComponent();

      await screen.findByText("Server connectivity outage");
      const statusSelect = screen.getByTestId("status-dropdown");

      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: "WAITING_FOR_REQUESTER" } });
      });

      // WAITING_FOR_REQUESTER does not require confirmation dialog (only RESOLVED, CLOSED, CANCELLED)
      // Expect apiClient.patch called with expectedUpdatedAt: baseTicket.updatedAt
      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          "/api/staff/tickets/101/status",
          expect.objectContaining({
            status: "WAITING_FOR_REQUESTER",
            expectedUpdatedAt: "2026-10-19T09:00:00.000Z",
          })
        );
      });

      // 409 banner appears
      const staleBanner = await screen.findByTestId("stale-update-banner");
      expect(staleBanner).toHaveTextContent(
        "This record was updated by another user. Reload to see the latest version before saving."
      );

      // Click Reload Latest
      const reloadBtn = screen.getByTestId("reload-latest-btn");
      await act(async () => {
        fireEvent.click(reloadBtn);
      });

      expect(apiClient.get).toHaveBeenCalledWith("/api/tickets/101");
    });
  });
});
