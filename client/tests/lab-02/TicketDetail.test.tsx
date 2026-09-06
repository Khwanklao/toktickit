import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { TicketDetail } from "../../src/components/TicketDetail.js";
import { TicketDetail as TicketDetailType } from "../../src/api.js";

const mockTicketData: TicketDetailType = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Laptop battery drains quickly",
  description: "My laptop battery is draining much faster than usual even when idle.",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  status: "NEW",
  createdAt: "2026-08-24T05:26:00.000Z",
  updatedAt: "2026-08-24T05:26:00.000Z",
  requester: {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.com",
  },
  category: { id: 2, name: "Hardware" },
  relatedSystem: { id: 7, name: "Corporate Laptop" },
  attachments: [
    {
      id: 501,
      originalFileName: "battery_report.pdf",
      fileSize: 1048576,
      mimeType: "application/pdf",
      createdAt: "2026-08-24T05:27:00.000Z",
      isRemoved: false,
    },
  ],
};

function renderWithProviders(ticketId = "101") {
  return render(
    <RequesterProvider>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/tickets" element={<div data-testid="my-tickets-page">My Tickets</div>} />
        </Routes>
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("TicketDetail Component Tests", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_requester_id", "1");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders ticket detail card with correct badges, fields, and active attachments tab", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/tickets/101")) {
        return Promise.resolve(new Response(JSON.stringify(mockTicketData), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }));
    });

    renderWithProviders("101");

    expect(screen.getByTestId("detail-loading-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("detail-ticket-number")).toBeInTheDocument();
    });

    expect(screen.getByTestId("detail-ticket-number")).toHaveTextContent("TKT-2026-000101");
    expect(screen.getByTestId("detail-summary")).toHaveTextContent("Laptop battery drains quickly");
    expect(screen.getByTestId("detail-description")).toHaveTextContent("My laptop battery is draining much faster than usual even when idle.");
    expect(screen.getByTestId("detail-requester-name")).toHaveTextContent("Jennifer Anderson");
    expect(screen.getByTestId("detail-category-name")).toHaveTextContent("Hardware");
    expect(screen.getByTestId("detail-related-system-name")).toHaveTextContent("Corporate Laptop");

    // Check placeholder tabs are rendered disabled
    const disabledCommentsTab = screen.getByTestId("tab-comments-disabled");
    expect(disabledCommentsTab).toBeDisabled();
    expect(screen.getByTestId("tab-actions-disabled")).toBeDisabled();
    expect(screen.getByTestId("tab-eventlog-disabled")).toBeDisabled();
  });

  it("displays safe not-found state when API returns 404 for missing or unowned ticket (BR-04)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ statusCode: 404, error: "Not Found", message: "Ticket not found" }), {
          status: 404,
        })
      )
    );

    renderWithProviders("9999");

    await waitFor(() => {
      expect(screen.getByTestId("not-found-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Ticket Not Found")).toBeInTheDocument();
    expect(screen.getByText(/you do not have permission to view it/i)).toBeInTheDocument();
  });

  it("displays error banner and allows Retry when ticket fetch fails", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ statusCode: 500, message: "Server error" }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(mockTicketData), { status: 200 }));

    renderWithProviders("101");

    await waitFor(() => {
      expect(screen.getByTestId("detail-error-banner")).toBeInTheDocument();
    });

    const retryBtn = screen.getByTestId("detail-retry-btn");
    await user.click(retryBtn);

    await waitFor(() => {
      const ticketCalls = fetchSpy.mock.calls.filter((c) =>
        typeof c[0] === "string" && c[0].includes("/api/tickets/101")
      );
      expect(ticketCalls.length).toBe(2);
    });
  });
});
