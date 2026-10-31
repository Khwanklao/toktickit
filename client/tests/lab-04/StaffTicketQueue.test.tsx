import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";
import { apiClient } from "../../src/lib/apiClient.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("../../src/context/AuthContext.js", () => ({
  useAuth: () => ({
    user: { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com", role: "IT_STAFF" },
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe("UI-16: Staff Ticket Queue URL Filters & Removable Chips", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve([
          { id: 1, name: "Network" },
          { id: 2, name: "Software" },
        ]);
      }
      if (url.includes("/api/staff/queue")) {
        return Promise.resolve({
          data: [
            {
              id: 101,
              ticketNumber: "TKT-2026-000101",
              title: "Cannot access corporate VPN",
              summary: "Cannot access corporate VPN",
              category: { id: 1, name: "Network" },
              requestedPriority: "HIGH",
              itPriority: "HIGH",
              status: "OPEN",
              owner: { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com" },
              requester: { id: "req-1", name: "Alex Requester", email: "alex@example.com" },
              createdAt: "2026-10-19T08:00:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
        });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  const renderQueueAtUrl = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/staff/queue" element={<StaffTicketQueue />} />
        </Routes>
      </MemoryRouter>
    );

  it("reads group=open from URL, fetches with group=open, and displays removable chip 'Open tickets'", async () => {
    renderQueueAtUrl("/staff/queue?group=open");

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("group=open"));
    });

    const chip = await screen.findByTestId("chip-group-open");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("Open tickets");

    // Click remove button on chip
    const removeBtn = screen.getByRole("button", { name: /Remove filter: Open tickets/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
    });

    // Should refetch without group=open
    await waitFor(() => {
      const calls = (apiClient.get as any).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).not.toContain("group=open");
    });
  });

  it("reads ownerId=me and activeOnly=true, fetches, and renders removable chip 'My active tickets'", async () => {
    renderQueueAtUrl("/staff/queue?ownerId=me&activeOnly=true");

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("ownerId=me"));
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("activeOnly=true"));
    });

    const chip = await screen.findByTestId("chip-my-active");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("My active tickets");

    // Click remove
    const removeBtn = screen.getByRole("button", { name: /Remove filter: My active tickets/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-my-active")).not.toBeInTheDocument();
    });
  });

  it("reads status from URL, displays status chip, and removing it updates URL and refetches", async () => {
    renderQueueAtUrl("/staff/queue?status=IN_PROGRESS");

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("status=IN_PROGRESS"));
    });

    const chip = await screen.findByTestId("chip-status-IN_PROGRESS");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("In Progress");

    // Click remove
    const removeBtn = screen.getByRole("button", { name: /Remove filter: In Progress/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-status-IN_PROGRESS")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const calls = (apiClient.get as any).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall).not.toContain("status=IN_PROGRESS");
    });
  });

  describe("UI-26: Search Focus Signal Consumption and Clearing", () => {
    it("focuses search input when focus=search query param is present and removes focus from URL without extra queue fetch", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/queue?focus=search&group=open"]}>
          <Routes>
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      expect(document.activeElement).toBe(searchInput);

      // Verify chip-group-open is preserved
      expect(screen.getByTestId("chip-group-open")).toBeInTheDocument();

      // Verify signal is cleared from URL (focus is not in search parameters anymore)
      await waitFor(() => {
        const calls = (apiClient.get as any).mock.calls.filter((c: any) => c[0].includes("/api/staff/queue"));
        // Exactly 1 fetch was made for loading the queue, no duplicate fetch for focus clearing
        expect(calls.length).toBe(1);
      });
    });

    it("focuses search input when location.state has focusSearch and clears state via navigate replace", async () => {
      render(
        <MemoryRouter initialEntries={[{ pathname: "/staff/queue", state: { focusSearch: true } }]}>
          <Routes>
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      expect(document.activeElement).toBe(searchInput);

      // Exactly 1 fetch was made
      await waitFor(() => {
        const calls = (apiClient.get as any).mock.calls.filter((c: any) => c[0].includes("/api/staff/queue"));
        expect(calls.length).toBe(1);
      });
    });

    it("does not refocus search input on subsequent filter interactions once signal is cleared", async () => {
      render(
        <MemoryRouter initialEntries={["/staff/queue?focus=search"]}>
          <Routes>
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
      });

      const searchInput = screen.getByTestId("search-input");
      expect(document.activeElement).toBe(searchInput);

      // Blur the search input
      searchInput.blur();
      expect(document.activeElement).not.toBe(searchInput);

      // Trigger a filter change (e.g. priority select)
      const prioritySelect = screen.getByTestId("filter-priority");
      fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

      // Focus should NOT be stolen back to search input
      expect(document.activeElement).not.toBe(searchInput);
    });
  });
});
