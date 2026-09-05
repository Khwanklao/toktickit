import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import { AppShell } from "../../src/components/AppShell.js";
import { MyTickets } from "../../src/components/MyTickets.js";
import { REQUESTER_STORAGE_KEY } from "../../src/lib/apiClient.js";

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Engineering" },
  { id: 2, name: "Michael Brown", email: "michael.brown@example.com", department: "Finance" },
];

const mockTicketReq1 = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Laptop battery drains quickly",
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  requestedPriority: "MEDIUM",
  itPriority: null,
  status: "NEW",
  createdAt: "2026-08-24T05:26:00.000Z",
  updatedAt: "2026-08-24T05:26:00.000Z",
};

const mockTicketReq2 = {
  id: 202,
  ticketNumber: "TKT-2026-000202",
  summary: "VPN connection drops frequently",
  category: { id: 1, name: "Account and Access" },
  relatedSystem: { id: 3, name: "VPN" },
  requestedPriority: "HIGH",
  itPriority: null,
  status: "IN_PROGRESS",
  createdAt: "2026-08-25T10:15:00.000Z",
  updatedAt: "2026-08-25T10:15:00.000Z",
};

function TestAppWrapper() {
  const { currentRequester, switchRequester } = useRequester();

  return (
    <AppShell>
      <div key={currentRequester?.id}>
        <div data-testid="active-requester-id">{currentRequester?.id ?? "none"}</div>
        <button
          data-testid="switch-requester-btn"
          onClick={() => switchRequester(currentRequester?.id === 1 ? 2 : 1)}
        >
          Switch User
        </button>
        <Routes>
          <Route path="/tickets" element={<MyTickets />} />
        </Routes>
      </div>
    </AppShell>
  );
}

function renderMyTicketsApp(initialRequesterId = "1") {
  localStorage.setItem(REQUESTER_STORAGE_KEY, initialRequesterId);

  return render(
    <RequesterProvider>
      <MemoryRouter initialEntries={["/tickets"]}>
        <TestAppWrapper />
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("MyTickets Component Tests (UI-05, UI-06, UI-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders list of tickets with Desktop table and Mobile cards with correct badges", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/dev/requesters")) {
        return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
      }
      if (urlStr.includes("/api/categories")) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
      }
      if (urlStr.includes("/api/tickets")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [mockTicketReq1],
              pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.reject(new Error("Unknown route"));
    });

    renderMyTicketsApp("1");

    await waitFor(() => {
      expect(screen.getByTestId("desktop-ticket-table")).toBeInTheDocument();
    });

    expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Laptop battery drains quickly").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NEW").length).toBeGreaterThan(0);
  });

  describe("UI-05: Initial empty state (zero tickets, no params sent) (BR-12, AC-08)", () => {
    it("shows 'No tickets found' empty state and 'Create Ticket' CTA when zero tickets exist and no search/filter params sent", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/api/dev/requesters")) {
          return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
        }
        if (urlStr.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (urlStr.includes("/api/tickets")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: [],
                pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
              }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Unknown route"));
      });

      renderMyTicketsApp("1");

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No tickets found")).toBeInTheDocument();
      expect(screen.getByText("No tickets found. Create your first support ticket to get started.")).toBeInTheDocument();
      expect(screen.getByTestId("create-ticket-cta")).toBeInTheDocument();
      expect(screen.queryByTestId("no-results-state")).not.toBeInTheDocument();
    });
  });

  describe("UI-06: No-results filter state (tickets exist, filter matches none) (BR-12, AC-09)", () => {
    it("shows distinct 'No results found' state and 'Clear Filters' CTA when filter/search yields zero matches", async () => {
      const user = userEvent.setup();
      let fetchCallCount = 0;

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/api/dev/requesters")) {
          return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
        }
        if (urlStr.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (urlStr.includes("/api/tickets")) {
          fetchCallCount++;
          if (urlStr.includes("search=nonexistent")) {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  data: [],
                  pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
                }),
                { status: 200 }
              )
            );
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: [mockTicketReq1],
                pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
              }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Unknown route"));
      });

      renderMyTicketsApp("1");

      await waitFor(() => {
        expect(screen.getByTestId("desktop-ticket-table")).toBeInTheDocument();
      });

      // Type search query matching nothing
      const searchInput = screen.getByTestId("ticket-search-input");
      await user.type(searchInput, "nonexistent");

      await waitFor(() => {
        expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No results found")).toBeInTheDocument();
      expect(screen.getByText("No tickets match your search or filter criteria.")).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();

      // Click Clear Filters button
      const clearBtn = screen.getByTestId("no-results-clear-filters-cta");
      await user.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByTestId("desktop-ticket-table")).toBeInTheDocument();
      });

      expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
    });
  });

  describe("UI-07: Switch requester updates ticket list (BR-14, AC-11)", () => {
    it("clears old requester tickets/filters/pagination and loads new requester data when requester is switched", async () => {
      const user = userEvent.setup();

      vi.spyOn(globalThis, "fetch").mockImplementation((url, options) => {
        const urlStr = url.toString();
        const headers = (options?.headers || {}) as Record<string, string>;
        const requesterIdHeader = headers["x-requester-id"] || localStorage.getItem(REQUESTER_STORAGE_KEY);

        if (urlStr.includes("/api/dev/requesters")) {
          return Promise.resolve(new Response(JSON.stringify(mockRequesters), { status: 200 }));
        }
        if (urlStr.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (urlStr.includes("/api/tickets")) {
          if (requesterIdHeader === "2") {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  data: [mockTicketReq2],
                  pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
                }),
                { status: 200 }
              )
            );
          }
          return Promise.resolve(
            new Response(
              JSON.stringify({
                data: [mockTicketReq1],
                pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
              }),
              { status: 200 }
            )
          );
        }
        return Promise.reject(new Error("Unknown route"));
      });

      renderMyTicketsApp("1");

      await waitFor(() => {
        expect(screen.getAllByText("TKT-2026-000101").length).toBeGreaterThan(0);
      });

      expect(screen.queryByText("TKT-2026-000202")).not.toBeInTheDocument();

      // Switch requester to 2
      const switchBtn = screen.getByTestId("switch-requester-btn");
      await user.click(switchBtn);

      await waitFor(() => {
        expect(screen.getAllByText("TKT-2026-000202").length).toBeGreaterThan(0);
      });

      expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
      expect(screen.getAllByText("VPN connection drops frequently").length).toBeGreaterThan(0);
    });
  });
});
