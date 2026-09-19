import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
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

describe("UI-05: Staff Ticket Detail Component Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url.endsWith("/comments")) {
        return Promise.resolve({ comments: [] });
      }
      if (url.endsWith("/internal-notes")) {
        return Promise.resolve({ notes: [] });
      }
      if (url.includes("/api/tickets/101")) {
        return Promise.resolve({
          id: 101,
          ticketNumber: "TKT-2026-000101",
          summary: "Resolved Signal Ticket",
          description: "Testing resolution banner display",
          requestedPriority: "LOW",
          itPriority: "LOW",
          status: "OPEN",
          isRequesterResolved: true,
          createdAt: "2026-09-10T08:00:00.000Z",
          updatedAt: "2026-09-10T08:00:00.000Z",
          category: { id: 1, name: "Network" },
          relatedSystem: { id: 1, name: "VPN" },
          requester: { id: "req-1", name: "Alex Requester", email: "alex@example.com" },
          owner: { id: "staff-1", name: "Sarah Staff", email: "sarah@example.com" },
          attachments: [],
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("renders Requester Resolution Banner when isRequesterResolved is true", async () => {
    render(
      <MemoryRouter initialEntries={["/staff/tickets/101"]}>
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const banner = await screen.findByTestId("requester-resolution-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(
      "The requester indicated that this issue appears resolved. Please verify and formally update status."
    );
  });
});
