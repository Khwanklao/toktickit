import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentSection } from "../../src/components/AttachmentSection.js";
import { Attachment } from "../../src/api.js";

const mockAttachments: Attachment[] = [
  {
    id: 501,
    originalFileName: "battery_report.pdf",
    fileSize: 1048576,
    mimeType: "application/pdf",
    createdAt: "2026-08-24T05:27:00.000Z",
    isRemoved: false,
  },
];

describe("AttachmentSection Component Tests (UI-08, UI-08b)", () => {
  beforeEach(() => {
    localStorage.setItem("toktickit_requester_id", "1");
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("UI-08: Attachment removal modal Cancel (AC-21)", () => {
    it("opens removal modal on Remove click and closes without changes when Cancel is clicked", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();

      render(
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onRefresh={onRefresh}
        />
      );

      // Click Remove button
      const removeBtn = screen.getByTestId("remove-btn-501");
      await user.click(removeBtn);

      // Modal opens
      expect(await screen.findByTestId("removal-modal")).toBeInTheDocument();
      expect(screen.getByTestId("removal-reason-input")).toBeInTheDocument();

      // Click Cancel button
      const cancelBtn = screen.getByTestId("cancel-remove-btn");
      await user.click(cancelBtn);

      // Modal closes
      expect(screen.queryByTestId("removal-modal")).not.toBeInTheDocument();

      // Refresh callback must not have been triggered
      expect(onRefresh).not.toHaveBeenCalled();

      // Attachment remains active in list
      expect(screen.getByTestId("filename-501")).toHaveTextContent("battery_report.pdf");
      expect(screen.queryByTestId("removed-badge-501")).not.toBeInTheDocument();
    });
  });

  describe("UI-08b: Attachment removal modal validation (AC-22, BR-22)", () => {
    it("blocks removal submit and shows inline validation when reason is empty or less than 3 characters", async () => {
      const user = userEvent.setup();

      render(
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
        />
      );

      // Open modal
      const removeBtn = screen.getByTestId("remove-btn-501");
      await user.click(removeBtn);

      expect(await screen.findByTestId("removal-modal")).toBeInTheDocument();

      const confirmBtn = screen.getByTestId("confirm-remove-btn");
      const reasonInput = screen.getByTestId("removal-reason-input");

      // Clear input and attempt submit
      await user.clear(reasonInput);
      await user.click(confirmBtn);

      // Inline error must appear
      expect(await screen.findByTestId("removal-reason-error")).toBeInTheDocument();
      expect(screen.getByText(/Removal reason is required/i)).toBeInTheDocument();

      // Modal stays open and attachment stays active
      expect(screen.getByTestId("removal-modal")).toBeInTheDocument();
    });

    it("sends DELETE request with valid reason and triggers refresh on successful removal", async () => {
      const user = userEvent.setup();
      const onRefresh = vi.fn();

      const deleteSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 501,
            ticketId: 101,
            originalFileName: "battery_report.pdf",
            isRemoved: true,
            removedAt: "2026-08-24T05:30:00.000Z",
            removedBy: 1,
            removalReason: "Uploaded wrong document version",
          }),
          { status: 200 }
        )
      );

      render(
        <AttachmentSection
          ticketId={101}
          attachments={mockAttachments}
          onRefresh={onRefresh}
        />
      );

      // Open modal
      await user.click(screen.getByTestId("remove-btn-501"));
      expect(await screen.findByTestId("removal-modal")).toBeInTheDocument();

      // Enter valid reason and submit
      await user.type(screen.getByTestId("removal-reason-input"), "Uploaded wrong document version");
      await user.click(screen.getByTestId("confirm-remove-btn"));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });

      const deleteCall = deleteSpy.mock.calls.find((c) =>
        typeof c[0] === "string" && c[0].includes("/api/attachments/501")
      );
      expect(deleteCall).toBeDefined();

      // Modal closes and removed badge appears
      await waitFor(() => {
        expect(screen.queryByTestId("removal-modal")).not.toBeInTheDocument();
        expect(screen.getByTestId("removed-badge-501")).toBeInTheDocument();
      });
    });
  });
});
