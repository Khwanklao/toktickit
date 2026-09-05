import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider, useRequester } from "../../src/context/RequesterContext.js";
import { RequesterSelector } from "../../src/components/RequesterSelector.js";
import { REQUESTER_STORAGE_KEY } from "../../src/lib/apiClient.js";

const mockRequesters = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", department: "Engineering" },
  { id: 2, name: "Michael Brown", email: "michael.brown@example.com", department: "Finance" },
];

function renderWithProviders(initialRoute = "/select-requester") {
  return render(
    <RequesterProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/select-requester" element={<RequesterSelector />} />
          <Route path="/tickets" element={<div data-testid="tickets-page">My Tickets Page</div>} />
        </Routes>
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("RequesterSelector Component Tests (UI-01, UI-02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("UI-01: Loading and Success states (FR-01, AC-02)", () => {
    it("renders loading skeleton initially while fetching requesters", async () => {
      // Delay response to capture loading state
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify(mockRequesters))), 200))
      );

      renderWithProviders();

      expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
      expect(screen.getByText(/Loading active development requesters/i)).toBeInTheDocument();
    });

    it("renders populated dropdown and enables Continue button upon successful fetch", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockRequesters), { status: 200 })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("requester-select")).toBeInTheDocument();
      });

      const select = screen.getByTestId("requester-select") as HTMLSelectElement;
      expect(select.children.length).toBe(2);
      expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
      expect(screen.getByText(/Michael Brown/i)).toBeInTheDocument();

      const continueBtn = screen.getByTestId("continue-button");
      expect(continueBtn).not.toBeDisabled();
    });

    it("persists selected requester to localStorage and redirects to /tickets on submit", async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockRequesters), { status: 200 })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("requester-select")).toBeInTheDocument();
      });

      const select = screen.getByTestId("requester-select");
      await user.selectOptions(select, "2"); // Select Michael Brown

      const continueBtn = screen.getByTestId("continue-button");
      await user.click(continueBtn);

      expect(localStorage.getItem(REQUESTER_STORAGE_KEY)).toBe("2");
      expect(await screen.findByTestId("tickets-page")).toBeInTheDocument();
    });
  });

  describe("UI-02: Empty state (BR-19, AC-18)", () => {
    it("shows dedicated empty message and keeps Continue button disabled when API returns []", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify([]), { status: 200 })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      });

      expect(screen.getByText("No active development requesters are available.")).toBeInTheDocument();
      const continueBtn = screen.getByTestId("continue-button");
      expect(continueBtn).toBeDisabled();
    });
  });

  describe("UI-02: Error state and Retry (BR-18, AC-17)", () => {
    it("shows dismissible error banner and Retry button when API call fails, and re-triggers fetch on Retry", async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("Network connection error"))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockRequesters), { status: 200 }));

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      });

      expect(screen.getByText(/Failed to load requesters/i)).toBeInTheDocument();
      const continueBtn = screen.getByTestId("continue-button");
      expect(continueBtn).toBeDisabled();

      // Click Retry button
      const retryBtn = screen.getByTestId("retry-button");
      await user.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId("requester-select")).toBeInTheDocument();
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
      expect(screen.getByTestId("continue-button")).not.toBeDisabled();
    });
  });
});
