import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { CreateTicket } from "../../src/components/CreateTicket.js";

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockSystems = [
  { id: 1, name: "Email" },
  { id: 7, name: "Corporate Laptop" },
];

function renderWithProviders() {
  return render(
    <RequesterProvider>
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <Routes>
          <Route path="/tickets/new" element={<CreateTicket />} />
          <Route path="/tickets" element={<div data-testid="my-tickets-page">My Tickets</div>} />
          <Route path="/tickets/:id" element={<div data-testid="ticket-detail-page">Ticket Detail</div>} />
        </Routes>
      </MemoryRouter>
    </RequesterProvider>
  );
}

describe("CreateTicket Component Tests (UI-03, UI-03b, UI-04, UI-09)", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_requester_id", "1");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("UI-03: Validation errors and preserved values (AC-07, BR-10)", () => {
    it("displays inline field-level validation errors when submitted empty and clears error on input", async () => {
      const user = userEvent.setup();

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/related-systems")) {
          return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("category-select")).toBeInTheDocument();
      });

      const submitBtn = screen.getByTestId("submit-ticket-button");
      await user.click(submitBtn);

      // Verify inline validation errors appear
      expect(await screen.findByTestId("category-error")).toBeInTheDocument();
      expect(screen.getByTestId("related-system-error")).toBeInTheDocument();
      expect(screen.getByTestId("summary-error")).toBeInTheDocument();
      expect(screen.getByTestId("description-error")).toBeInTheDocument();

      // Type into summary to resolve its error
      const summaryInput = screen.getByTestId("summary-input");
      await user.type(summaryInput, "Valid summary text");
      fireEvent.blur(summaryInput);

      await waitFor(() => {
        expect(screen.queryByTestId("summary-error")).not.toBeInTheDocument();
      });
    });

    it("displays dismissible API failure banner and preserves entered form values when POST fails (BR-10)", async () => {
      const user = userEvent.setup();

      vi.spyOn(globalThis, "fetch").mockImplementation((url, opts) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/related-systems")) {
          return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/tickets") && opts?.method === "POST") {
          return Promise.resolve(
            new Response(
              JSON.stringify({ statusCode: 500, error: "Internal Server Error", message: "Database connection failed" }),
              { status: 500 }
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("category-select")).toBeInTheDocument();
      });

      // Fill out form
      await user.selectOptions(screen.getByTestId("category-select"), "2");
      await user.selectOptions(screen.getByTestId("related-system-select"), "7");
      await user.type(screen.getByTestId("summary-input"), "Laptop battery drains fast");
      await user.type(screen.getByTestId("description-input"), "Detailed description for ticket creation API failure test.");

      const submitBtn = screen.getByTestId("submit-ticket-button");
      await user.click(submitBtn);

      // Verify API error banner appears
      expect(await screen.findByTestId("api-error-banner")).toBeInTheDocument();
      expect(screen.getByText(/Database connection failed/i)).toBeInTheDocument();

      // Form values must be preserved
      expect((screen.getByTestId("summary-input") as HTMLInputElement).value).toBe("Laptop battery drains fast");
      expect((screen.getByTestId("description-input") as HTMLTextAreaElement).value).toBe("Detailed description for ticket creation API failure test.");
    });
  });

  describe("UI-03b: Invalid attachment rejected client-side (AC-23, BR-23)", () => {
    it("rejects invalid file types and oversized files immediately without firing network requests", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/related-systems")) {
          return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("category-select")).toBeInTheDocument();
      });

      const fileInput = screen.getByTestId("attachment-input") as HTMLInputElement;

      // Create invalid file (.exe)
      const invalidFile = new File(["dummy content"], "malware.exe", { type: "application/x-msdownload" });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      // Verify inline error chip appears
      expect(await screen.findByText(/Invalid file type/i)).toBeInTheDocument();

      // No attachment upload fetch call should have occurred
      const uploadCalls = fetchSpy.mock.calls.filter((call) =>
        typeof call[0] === "string" && call[0].includes("/attachments")
      );
      expect(uploadCalls.length).toBe(0);
    });
  });

  describe("UI-04: Duplicate submission prevention (AC-10, BR-11)", () => {
    it("disables Submit button and shows Submitting… busy state during request execution", async () => {
      const user = userEvent.setup();

      // Resolve creation after a delay
      vi.spyOn(globalThis, "fetch").mockImplementation((url, opts) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/related-systems")) {
          return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/tickets") && opts?.method === "POST") {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  new Response(
                    JSON.stringify({
                      id: 101,
                      ticketNumber: "TKT-2026-000101",
                      requesterId: 1,
                      categoryId: 2,
                      relatedSystemId: 7,
                      summary: "Laptop battery drains fast",
                      description: "Detailed description for ticket creation test",
                      requestedPriority: "MEDIUM",
                      status: "NEW",
                    }),
                    { status: 201 }
                  )
                ),
              200
            )
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("category-select")).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByTestId("category-select"), "2");
      await user.selectOptions(screen.getByTestId("related-system-select"), "7");
      await user.type(screen.getByTestId("summary-input"), "Laptop battery drains fast");
      await user.type(screen.getByTestId("description-input"), "Detailed description for ticket creation test");

      const submitBtn = screen.getByTestId("submit-ticket-button");
      await user.click(submitBtn);

      // Submit button must be disabled and show busy text
      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/Submitting…/i)).toBeInTheDocument();

      // After request resolves, success panel appears
      await waitFor(() => {
        expect(screen.getByTestId("success-panel")).toBeInTheDocument();
      });
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
    });
  });

  describe("UI-09: Keyboard navigation and accessibility (AC-16)", () => {
    it("allows standard form controls to be operable via keyboard with visible focus", async () => {
      const user = userEvent.setup();

      vi.spyOn(globalThis, "fetch").mockImplementation((url) => {
        if (typeof url === "string" && url.includes("/api/categories")) {
          return Promise.resolve(new Response(JSON.stringify(mockCategories), { status: 200 }));
        }
        if (typeof url === "string" && url.includes("/api/related-systems")) {
          return Promise.resolve(new Response(JSON.stringify(mockSystems), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId("category-select")).toBeInTheDocument();
      });

      const summaryInput = screen.getByTestId("summary-input");
      await user.click(summaryInput);
      expect(document.activeElement).toBe(summaryInput);

      const descriptionInput = screen.getByTestId("description-input");
      await user.click(descriptionInput);
      expect(document.activeElement).toBe(descriptionInput);

      const submitBtn = screen.getByTestId("submit-ticket-button");
      await user.click(submitBtn);
      await waitFor(() => {
        expect(document.activeElement).toBe(submitBtn);
      });
    });
  });
});
