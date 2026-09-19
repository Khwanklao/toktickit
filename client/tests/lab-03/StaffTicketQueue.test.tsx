import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    user: { id: "staff-1", name: "Sarah Staff", role: "IT_STAFF" },
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

describe("UI-04: Staff Ticket Queue Component Tests", () => {
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
              createdAt: "2026-09-10T08:00:00.000Z",
            },
          ],
          pagination: { page: 1, limit: 10, totalRecords: 1, totalPages: 1 },
        });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });
  });

  it("renders queue table with headers, data row, and badges", async () => {
    render(
      <MemoryRouter>
        <StaffTicketQueue />
      </MemoryRouter>
    );

    const elements = await screen.findAllByText("TKT-2026-000101");
    expect(elements.length).toBeGreaterThan(0);
    expect(screen.getByTestId("desktop-queue-table")).toBeInTheDocument();
    expect(screen.getByTestId("result-counter")).toHaveTextContent("Showing 1 to 1 of 1 tickets");
  });

  it("handles search input typing", async () => {
    render(
      <MemoryRouter>
        <StaffTicketQueue />
      </MemoryRouter>
    );

    const elements = await screen.findAllByText("TKT-2026-000101");
    expect(elements.length).toBeGreaterThan(0);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "VPN" } });
    expect(searchInput).toHaveValue("VPN");
  });
});
