import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionTakenModal } from "../../src/components/ActionTakenModal.js";
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
}));

describe("ActionTakenModal Component Tests (UI-01, UI-05, UI-06, UI-11)", () => {
  const mockTicket = {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    createdAt: "2026-10-19T08:00:00.000Z",
    updatedAt: "2026-10-19T08:00:00.000Z",
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ticket: mockTicket,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("UI-01: Field Validation & Follow-up Note Rules", () => {
    it("disables Save and shows validation error when Description or Result is less than 5 characters", async () => {
      render(<ActionTakenModal {...defaultProps} />);

      const descInput = screen.getByTestId("action-description-input");
      const resultInput = screen.getByTestId("action-result-input");
      const saveBtn = screen.getByTestId("action-save-btn");

      // Enter short input < 5 chars
      fireEvent.change(descInput, { target: { value: "diag" } });
      fireEvent.change(resultInput, { target: { value: "done" } });

      expect(saveBtn).toBeDisabled();
      expect(screen.getByText("Description must be between 5 and 2,000 characters.")).toBeInTheDocument();
      expect(screen.getByText("Result must be between 5 and 2,000 characters.")).toBeInTheDocument();
    });

    it("requires Follow-up Note when Follow-up checkbox is checked", async () => {
      render(<ActionTakenModal {...defaultProps} />);

      const descInput = screen.getByTestId("action-description-input");
      const resultInput = screen.getByTestId("action-result-input");
      const followUpCheckbox = screen.getByTestId("action-followup-checkbox");
      const saveBtn = screen.getByTestId("action-save-btn");

      fireEvent.change(descInput, { target: { value: "Replaced thermal paste on heatsink" } });
      fireEvent.change(resultInput, { target: { value: "Temperature dropped from 90C to 45C" } });

      // Check follow-up
      fireEvent.click(followUpCheckbox);
      expect(followUpCheckbox).toBeChecked();

      // Note is empty -> save disabled & error shown
      expect(saveBtn).toBeDisabled();
      expect(
        screen.getByText("Follow-up note is required when follow-up is checked.")
      ).toBeInTheDocument();

      // Enter valid follow-up note >= 5 chars
      const noteInput = screen.getByTestId("action-followup-note-input");
      fireEvent.change(noteInput, { target: { value: "Check temperatures again in 24 hours" } });

      expect(saveBtn).not.toBeDisabled();
    });

    it("enforces Action Date/Time boundaries (not before ticket creation, not > 60s in future)", async () => {
      render(<ActionTakenModal {...defaultProps} />);

      const dateInput = screen.getByTestId("action-datetime-input");
      const saveBtn = screen.getByTestId("action-save-btn");

      // Fill valid text
      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Inspected hardware motherboard unit" },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "All capacitors in good shape" },
      });

      // Set date before ticket creation (ticket was created 2026-10-19T08:00:00Z -> 15:00 Bangkok)
      fireEvent.change(dateInput, { target: { value: "2026-10-18T10:00" } });

      expect(saveBtn).toBeDisabled();
      expect(
        screen.getByText("Action date/time must be after the ticket was created and not in the future.")
      ).toBeInTheDocument();
    });
  });

  describe("UI-05: Double-Click Protection & Safe Failure", () => {
    it("disables submit button and shows loading state during submission", async () => {
      let resolvePromise: (val: any) => void;
      (apiClient.post as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<ActionTakenModal {...defaultProps} />);

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Updated network routing configuration" },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "Connectivity successfully restored" },
      });

      const saveBtn = screen.getByTestId("action-save-btn");
      expect(saveBtn).not.toBeDisabled();

      fireEvent.click(saveBtn);

      // Button should be disabled with loading indication
      expect(saveBtn).toBeDisabled();
      expect(screen.getByTestId("action-save-spinner")).toBeInTheDocument();

      // Resolve API
      resolvePromise!({
        action: { id: "act-1", description: "Updated network routing" },
        ticketUpdatedAt: "2026-10-19T10:00:00.000Z",
      });

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("retains form inputs and shows error banner on network failure", async () => {
      (apiClient.post as any).mockRejectedValueOnce(new Error("Network connection dropped"));

      render(<ActionTakenModal {...defaultProps} />);

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Cleaned dusty exhaust fans thoroughly" },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "Airflow normalized to manufacturer spec" },
      });

      const saveBtn = screen.getByTestId("action-save-btn");
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Modal stays open and preserves input
      expect(screen.getByTestId("action-description-input")).toHaveValue(
        "Cleaned dusty exhaust fans thoroughly"
      );
      expect(screen.getByTestId("action-result-input")).toHaveValue(
        "Airflow normalized to manufacturer spec"
      );
    });
  });

  describe("UI-06: Optimistic Concurrency Conflict (409 STALE_UPDATE)", () => {
    it("displays alert banner on 409 STALE_UPDATE with 'Reload Latest' button and preserves user text", async () => {
      const existingAction = {
        id: "act-old",
        ticketId: 101,
        description: "Initial action taken",
        result: "Initial action result",
        actionDateTime: "2026-10-19T09:00:00.000Z",
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        updatedAt: "2026-10-19T09:00:00.000Z",
      };

      const err: any = new Error("Action has been modified by another user.");
      err.status = 409;
      err.code = "STALE_UPDATE";
      (apiClient.patch as any).mockRejectedValueOnce(err);

      const onReloadMock = vi.fn();

      render(
        <ActionTakenModal
          {...defaultProps}
          actionToEdit={existingAction}
          onReloadLatest={onReloadMock}
        />
      );

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "My unsaved edits to description" },
      });

      fireEvent.click(screen.getByTestId("action-save-btn"));

      const conflictBanner = await screen.findByTestId("concurrency-conflict-banner");
      expect(conflictBanner).toHaveTextContent(
        "This record was updated by another user. Reload to see the latest version before saving."
      );

      // Typed text is kept
      expect(screen.getByTestId("action-description-input")).toHaveValue(
        "My unsaved edits to description"
      );

      // Click Reload Latest
      const reloadBtn = screen.getByTestId("reload-latest-btn");
      fireEvent.click(reloadBtn);
      expect(onReloadMock).toHaveBeenCalled();
    });
  });

  describe("UI-11: Modal Fields, Discard Confirmation & Accessibility", () => {
    it("renders Performed By auto-filled and disabled with user name and role badge", () => {
      render(<ActionTakenModal {...defaultProps} />);

      const performedByDisplay = screen.getByTestId("performed-by-display");
      expect(performedByDisplay).toHaveTextContent("Sarah Staff");
      expect(screen.getByText("IT Staff")).toBeInTheDocument();
    });

    it("displays character counters for Description, Result, and Attachment Notes", () => {
      render(<ActionTakenModal {...defaultProps} />);

      expect(screen.getByTestId("desc-char-counter")).toHaveTextContent("0 / 2000");
      expect(screen.getByTestId("result-char-counter")).toHaveTextContent("0 / 2000");

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Checking RAM" },
      });
      expect(screen.getByTestId("desc-char-counter")).toHaveTextContent("12 / 2000");
    });

    it("prompts 'Discard changes?' when dirty form is closed", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

      render(<ActionTakenModal {...defaultProps} />);

      // Form is clean: close directly
      fireEvent.click(screen.getByTestId("modal-close-btn"));
      expect(defaultProps.onClose).toHaveBeenCalled();

      // Form is dirty: asks confirm
      defaultProps.onClose.mockClear();
      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Dirty description" },
      });

      fireEvent.click(screen.getByTestId("modal-close-btn"));
      expect(confirmSpy).toHaveBeenCalledWith("Discard changes?");
      expect(defaultProps.onClose).not.toHaveBeenCalled(); // user cancelled confirm
    });

    it("has correct dialog accessibility attributes (role, aria-modal, aria-labelledby)", () => {
      render(<ActionTakenModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "action-modal-title");
    });
  });
});
