import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { MyTickets } from "../../src/components/MyTickets.js";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import { apiClient } from "../../src/lib/apiClient.js";
import * as AuthContextModule from "../../src/context/AuthContext.js";

vi.mock("../../src/lib/apiClient.js", () => ({
  apiClient: {
    get: vi.fn(),
    fetch: vi.fn(),
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

const mockCategories = [
  { id: 1, name: "Hardware" },
  { id: 2, name: "Software" },
  { id: 3, name: "Network" },
];

const mockTicketsData = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot connect to VPN",
      category: { id: 3, name: "Network" },
      relatedSystem: { id: 1, name: "Corporate Network" },
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      status: "IN_PROGRESS",
      createdAt: "2026-10-18T10:00:00.000Z",
      updatedAt: "2026-10-18T11:00:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000102",
      summary: "Mouse cursor flickering",
      category: { id: 1, name: "Hardware" },
      relatedSystem: { id: 2, name: "Workstation" },
      requestedPriority: "LOW",
      itPriority: null,
      status: "NEW",
      createdAt: "2026-10-17T09:00:00.000Z",
      updatedAt: "2026-10-17T09:30:00.000Z",
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
  },
};

const mockDashboardData = {
  metrics: {
    activeTickets: 2,
    inProgressTickets: 1,
    resolvedTickets: 0,
    closedTickets: 0,
  },
  recentRequests: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000101",
      summary: "Cannot connect to VPN",
      status: "IN_PROGRESS",
      needsAttention: false,
      updatedAt: "2026-10-18T11:00:00.000Z",
    },
  ],
};

describe("MyTickets URL Filters & Chips (Lab 4 / Issue 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockRequesterUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkSession: vi.fn(),
    });

    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === "/api/categories") return Promise.resolve(mockCategories);
      if (url === "/api/requester/dashboard") return Promise.resolve(mockDashboardData);
      return Promise.resolve({});
    });

    (apiClient.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockTicketsData,
    });
  });

  it("reads group=open from URL, appends group=open to API request, and displays 'Open tickets' chip", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets?group=open"]}>
        <MyTickets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.fetch).toHaveBeenCalled();
    });

    const lastCallUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(lastCallUrl).toContain("group=open");
    expect(lastCallUrl).not.toContain("status=");

    const chip = await screen.findByTestId("chip-group-open");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("Open tickets");
  });

  it("removes group=open chip when clicking remove, updating URL and refetching without group", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets?group=open"]}>
        <MyTickets />
      </MemoryRouter>
    );

    const chip = await screen.findByTestId("chip-group-open");
    expect(chip).toBeInTheDocument();

    const removeBtn = chip.querySelector("button") || screen.getByLabelText(/remove filter: open tickets/i);
    expect(removeBtn).toBeInTheDocument();

    (apiClient.fetch as any).mockClear();
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
    });

    expect(apiClient.fetch).toHaveBeenCalled();
    const refetchUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(refetchUrl).not.toContain("group=open");
  });

  it("reads status=RESOLVED from URL, sends status=RESOLVED to API, and displays Resolved chip", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets?status=RESOLVED"]}>
        <MyTickets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.fetch).toHaveBeenCalled();
    });

    const callUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(callUrl).toContain("status=RESOLVED");
    expect(callUrl).not.toContain("group=");

    const chip = await screen.findByTestId("chip-status-RESOLVED");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("Resolved");

    const removeBtn = chip.querySelector("button") || screen.getByLabelText(/remove filter: resolved/i);
    (apiClient.fetch as any).mockClear();
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-status-RESOLVED")).not.toBeInTheDocument();
    });

    expect(apiClient.fetch).toHaveBeenCalled();
    const refetchUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(refetchUrl).not.toContain("status=RESOLVED");
  });

  it("clears group when selecting a status in the toolbar so both are never sent together", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets?group=open"]}>
        <MyTickets />
      </MemoryRouter>
    );

    await screen.findByTestId("chip-group-open");

    const statusSelect = screen.getByLabelText(/status/i);
    (apiClient.fetch as any).mockClear();

    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    await waitFor(() => {
      expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
    });

    expect(apiClient.fetch).toHaveBeenCalled();
    const callUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(callUrl).toContain("status=IN_PROGRESS");
    expect(callUrl).not.toContain("group=");
  });

  it("clears URL params and chips when Clear Filters is clicked", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets?group=open"]}>
        <MyTickets />
      </MemoryRouter>
    );

    await screen.findByTestId("chip-group-open");

    const clearBtn = screen.getByRole("button", { name: /clear filters/i });
    (apiClient.fetch as any).mockClear();
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
    });

    expect(apiClient.fetch).toHaveBeenCalled();
    const callUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(callUrl).not.toContain("group=");
  });

  it("with no URL parameters, behaves exactly as before without sending group or showing chips", async () => {
    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <MyTickets />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.fetch).toHaveBeenCalled();
    });

    const callUrl = (apiClient.fetch as any).mock.calls[0][0];
    expect(callUrl).not.toContain("group=");
    expect(callUrl).not.toContain("status=");
    expect(screen.queryByTestId("filter-chips-container")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chip-group-open")).not.toBeInTheDocument();
  });

  it("integrates cross-component: clicking Active Tickets card navigates to /tickets?group=open with chip", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<RequesterDashboard />} />
          <Route path="/tickets" element={<MyTickets />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByTestId("metric-card-active");

    fireEvent.click(screen.getByTestId("metric-card-active"));

    await waitFor(() => {
      expect(screen.getByTestId("my-tickets-screen")).toBeInTheDocument();
    });

    const chip = await screen.findByTestId("chip-group-open");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("Open tickets");
  });
});

