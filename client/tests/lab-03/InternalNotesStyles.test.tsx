import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("STYLE-02: Color distinction between Public Comments and Internal Notes", () => {
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
          summary: "Test Ticket for Style Distinctions",
          description: "Testing notes style",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          status: "OPEN",
          isRequesterResolved: false,
          createdAt: "2026-09-10T08:00:00.000Z",
          updatedAt: "2026-09-10T08:00:00.000Z",
          category: { id: 1, name: "Network" },
          relatedSystem: { id: 1, name: "VPN" },
          requester: { id: "req-1", name: "Alex Requester", email: "req@example.com" },
          owner: { id: "staff-1", name: "Sarah Staff", email: "staff@example.com" },
          attachments: [],
        });
      }
      return Promise.reject(new Error("Not found"));
    });
  });

  it("displays Internal Notes tab with distinct pale yellow warning background and warning text", async () => {
    render(
      <MemoryRouter initialEntries={["/staff/tickets/101"]}>
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>
    );

    const grid = await screen.findByTestId("ticket-metadata-grid");
    expect(grid).toBeInTheDocument();

    // Click Internal Notes tab
    const notesTab = screen.getByTestId("tab-internal-notes");
    fireEvent.click(notesTab);

    // Verify warning banner and panel styling
    const warningText = screen.getByTestId("internal-notes-warning");
    expect(warningText).toHaveTextContent("Internal notes are strictly confidential and only visible to IT Staff and Administrators.");

    const notesPanel = screen.getByTestId("internal-notes-panel");
    expect(notesPanel).toHaveClass("bg-[#FFFBEB]");
  });
});
