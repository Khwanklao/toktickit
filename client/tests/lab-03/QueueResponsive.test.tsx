import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("RESP-01: Responsive Layout of IT Staff Queue", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve([{ id: 1, name: "Network" }]);
      }
      if (url.includes("/api/staff/queue")) {
        return Promise.resolve({
          data: [
            {
              id: 101,
              ticketNumber: "TKT-2026-000101",
              title: "Cannot access VPN",
              summary: "Cannot access VPN",
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
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders both desktop table container and mobile card list container for CSS responsiveness", async () => {
    render(
      <MemoryRouter>
        <StaffTicketQueue />
      </MemoryRouter>
    );

    const desktopTable = await screen.findByTestId("desktop-queue-table");
    expect(desktopTable).toBeInTheDocument();
    expect(screen.getByTestId("mobile-ticket-list")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-ticket-card")).toBeInTheDocument();
  });
});
