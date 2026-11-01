import React, { useState, useEffect, useMemo, useRef } from "react";
import { RoleBadge } from "./RoleBadge.js";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/apiClient.js";
import {
  toDateTimeLocalBangkok,
  fromDateTimeLocalBangkok,
} from "../utils/date.js";

export interface ActionTakenItem {
  id: string;
  ticketId: number;
  actionDateTime: string;
  description: string;
  result: string;
  performedBy?: { id: string; name: string; role: string };
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ActionTakenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (action: ActionTakenItem, ticketUpdatedAt?: string) => void;
  ticket: {
    id: number;
    ticketNumber: string;
    createdAt: string;
    updatedAt: string;
  };
  actionToEdit?: ActionTakenItem | null;
  onReloadLatest?: () => void;
}

export const ActionTakenModal: React.FC<ActionTakenModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ticket,
  actionToEdit,
  onReloadLatest,
}) => {
  const { user } = useAuth();
  const isEdit = Boolean(actionToEdit);

  // Form states
  const [actionDateTime, setActionDateTime] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isStaleConflict, setIsStaleConflict] = useState(false);

  const initialValuesRef = useRef({
    actionDateTime: "",
    description: "",
    result: "",
    followUpRequired: false,
    followUpNote: "",
    attachmentNotes: "",
  });

  // Reset or initialize values when modal opens or actionToEdit changes
  useEffect(() => {
    if (isOpen) {
      setIsStaleConflict(false);
      setApiError(null);
      setFieldErrors({});

      let initDate = toDateTimeLocalBangkok(new Date());
      let initDesc = "";
      let initRes = "";
      let initFuReq = false;
      let initFuNote = "";
      let initAttNotes = "";

      if (actionToEdit) {
        initDate = toDateTimeLocalBangkok(actionToEdit.actionDateTime);
        initDesc = actionToEdit.description || "";
        initRes = actionToEdit.result || "";
        initFuReq = Boolean(actionToEdit.followUpRequired);
        initFuNote = actionToEdit.followUpNote || "";
        initAttNotes = actionToEdit.attachmentNotes || "";
      }

      setActionDateTime(initDate);
      setDescription(initDesc);
      setResult(initRes);
      setFollowUpRequired(initFuReq);
      setFollowUpNote(initFuNote);
      setAttachmentNotes(initAttNotes);

      initialValuesRef.current = {
        actionDateTime: initDate,
        description: initDesc,
        result: initRes,
        followUpRequired: initFuReq,
        followUpNote: initFuNote,
        attachmentNotes: initAttNotes,
      };
    }
  }, [isOpen, actionToEdit]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    const init = initialValuesRef.current;
    return (
      actionDateTime !== init.actionDateTime ||
      description !== init.description ||
      result !== init.result ||
      followUpRequired !== init.followUpRequired ||
      followUpNote !== init.followUpNote ||
      attachmentNotes !== init.attachmentNotes
    );
  }, [actionDateTime, description, result, followUpRequired, followUpNote, attachmentNotes]);

  // Handle safe close with discard prompt
  const handleSafeClose = () => {
    if (isDirty) {
      const confirmDiscard = window.confirm("Discard changes?");
      if (!confirmDiscard) return;
    }
    onClose();
  };

  // Keyboard navigation (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleSafeClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDirty]);

  // Client-side validations
  const minDateTimeLocal = useMemo(() => {
    return toDateTimeLocalBangkok(ticket.createdAt);
  }, [ticket.createdAt]);

  const maxDateTimeLocal = useMemo(() => {
    // Current time + 60 seconds
    return toDateTimeLocalBangkok(new Date(Date.now() + 60000));
  }, []);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    // Description validation
    if (!description.trim() || description.trim().length < 5 || description.length > 2000) {
      errors.description = "Description must be between 5 and 2,000 characters.";
    }

    // Result validation
    if (!result.trim() || result.trim().length < 5 || result.length > 2000) {
      errors.result = "Result must be between 5 and 2,000 characters.";
    }

    // Follow-up validation
    if (followUpRequired) {
      if (!followUpNote.trim() || followUpNote.trim().length < 5 || followUpNote.length > 2000) {
        errors.followUpNote = "Follow-up note is required when follow-up is checked.";
      }
    }

    // Attachment notes validation
    if (attachmentNotes.length > 500) {
      errors.attachmentNotes = "Attachment notes must not exceed 500 characters.";
    }

    // Date/time validation
    if (!actionDateTime) {
      errors.actionDateTime = "Action date/time is required.";
    } else {
      const dateIso = fromDateTimeLocalBangkok(actionDateTime);
      const chosenTime = new Date(dateIso).getTime();
      const ticketCreatedTime = new Date(ticket.createdAt).getTime();
      const nowPlus60s = Date.now() + 60000;

      if (chosenTime < ticketCreatedTime || chosenTime > nowPlus60s) {
        errors.actionDateTime =
          "Action date/time must be after the ticket was created and not in the future.";
      }
    }

    return errors;
  }, [description, result, followUpRequired, followUpNote, attachmentNotes, actionDateTime, ticket.createdAt]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setApiError(null);
    setFieldErrors({});
    setIsStaleConflict(false);

    const actionDateTimeIso = fromDateTimeLocalBangkok(actionDateTime);

    const payload: any = {
      actionDateTime: actionDateTimeIso,
      description: description.trim(),
      result: result.trim(),
      followUpRequired,
      followUpNote: followUpRequired ? followUpNote.trim() : null,
      attachmentNotes: attachmentNotes.trim() || null,
    };

    try {
      if (isEdit && actionToEdit) {
        payload.expectedUpdatedAt = actionToEdit.updatedAt;
        const res = await apiClient.patch<{
          action: ActionTakenItem;
          ticketUpdatedAt: string;
        }>(`/api/tickets/${ticket.id}/actions/${actionToEdit.id}`, payload);
        onSuccess(res.action, res.ticketUpdatedAt);
        onClose();
      } else {
        const res = await apiClient.post<{
          action: ActionTakenItem;
          ticketUpdatedAt: string;
        }>(`/api/tickets/${ticket.id}/actions`, payload);
        onSuccess(res.action, res.ticketUpdatedAt);
        onClose();
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      const code = err?.code || err?.response?.data?.error?.code;
      const details = err?.details || err?.response?.data?.error?.details || [];

      if (status === 409 || code === "STALE_UPDATE") {
        setIsStaleConflict(true);
      } else if (code === "VALIDATION_ERROR" && details.length > 0) {
        const mappedErrors: Record<string, string> = {};
        for (const d of details) {
          if (d.field) mappedErrors[d.field] = d.message;
        }
        setFieldErrors(mappedErrors);
      } else if (code === "INVALID_ACTION_DATE") {
        setFieldErrors({
          actionDateTime:
            "Action date/time must be after the ticket was created and not in the future.",
        });
      } else {
        setApiError(
          err?.message ||
            err?.response?.data?.error?.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1050 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleSafeClose();
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: "600px" }}>
        <div className="modal-content rounded-3 border-0 shadow">
          {/* Header */}
          <div className="modal-header border-bottom px-4 py-3">
            <h5 className="modal-title fw-bold text-dark fs-5" id="action-modal-title">
              {isEdit ? "Edit Action Taken" : "Record Action Taken"}
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={handleSafeClose}
              data-testid="modal-close-btn"
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 space-y-3">
              {/* Concurrency Stale Update Banner */}
              {isStaleConflict && (
                <div
                  className="alert alert-warning p-3 rounded-3 d-flex align-items-center justify-content-between mb-3"
                  data-testid="concurrency-conflict-banner"
                  role="alert"
                >
                  <span className="small fw-semibold">
                    This record was updated by another user. Reload to see the latest version before saving.
                  </span>
                  {onReloadLatest && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning text-dark fw-bold ms-3"
                      onClick={() => {
                        setIsStaleConflict(false);
                        onReloadLatest();
                      }}
                      data-testid="reload-latest-btn"
                    >
                      Reload Latest
                    </button>
                  )}
                </div>
              )}

              {/* General API Error Banner */}
              {apiError && (
                <div className="alert alert-danger p-3 rounded-3 mb-3 small" role="alert">
                  {apiError}
                </div>
              )}

              {/* Action Date / Time */}
              <div className="mb-3">
                <label className="form-label text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem" }}>
                  Action Date/Time <span className="text-danger">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`form-control ${
                    validationErrors.actionDateTime || fieldErrors.actionDateTime ? "is-invalid" : ""
                  }`}
                  value={actionDateTime}
                  min={minDateTimeLocal}
                  max={maxDateTimeLocal}
                  onChange={(e) => setActionDateTime(e.target.value)}
                  data-testid="action-datetime-input"
                  required
                />
                {(validationErrors.actionDateTime || fieldErrors.actionDateTime) && (
                  <div className="invalid-feedback d-block small mt-1">
                    {fieldErrors.actionDateTime || validationErrors.actionDateTime}
                  </div>
                )}
              </div>

              {/* Performed By (Auto / Disabled) */}
              <div className="mb-3">
                <label className="form-label text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem" }}>
                  Performed by
                </label>
                <div
                  className="form-control bg-light d-flex align-items-center justify-content-between"
                  style={{ opacity: 0.85, cursor: "not-allowed" }}
                  data-testid="performed-by-display"
                >
                  <span className="fw-medium text-dark">{user?.name || "IT Staff"}</span>
                  <RoleBadge role={user?.role || "IT_STAFF"} />
                </div>
              </div>

              {/* Action Description */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted text-uppercase small fw-bold mb-0" style={{ fontSize: "0.75rem" }}>
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <span
                    className={`small ${description.length < 5 || description.length > 2000 ? "text-danger" : "text-muted"}`}
                    data-testid="desc-char-counter"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {description.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={3}
                  className={`form-control ${
                    validationErrors.description || fieldErrors.description ? "is-invalid" : ""
                  }`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the diagnosis, triage, or repair actions taken..."
                  data-testid="action-description-input"
                  required
                />
                {(validationErrors.description || fieldErrors.description) && (
                  <div className="invalid-feedback d-block small mt-1">
                    {fieldErrors.description || validationErrors.description}
                  </div>
                )}
              </div>

              {/* Result */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted text-uppercase small fw-bold mb-0" style={{ fontSize: "0.75rem" }}>
                    Result <span className="text-danger">*</span>
                  </label>
                  <span
                    className={`small ${result.length < 5 || result.length > 2000 ? "text-danger" : "text-muted"}`}
                    data-testid="result-char-counter"
                    style={{ fontSize: "0.75rem" }}
                  >
                    {result.length} / 2000
                  </span>
                </div>
                <textarea
                  rows={3}
                  className={`form-control ${
                    validationErrors.result || fieldErrors.result ? "is-invalid" : ""
                  }`}
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  placeholder="Describe the outcome or findings from this action..."
                  data-testid="action-result-input"
                  required
                />
                {(validationErrors.result || fieldErrors.result) && (
                  <div className="invalid-feedback d-block small mt-1">
                    {fieldErrors.result || validationErrors.result}
                  </div>
                )}
              </div>

              {/* Follow-up Required Checkbox */}
              <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="followUpRequiredCheck"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    data-testid="action-followup-checkbox"
                  />
                  <label className="form-check-label fw-semibold text-dark small" htmlFor="followUpRequiredCheck">
                    Follow-up required for this issue
                  </label>
                </div>
              </div>

              {/* Follow-up Note */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted text-uppercase small fw-bold mb-0" style={{ fontSize: "0.75rem" }}>
                    Follow-up Note {followUpRequired && <span className="text-danger">*</span>}
                  </label>
                  {followUpRequired && (
                    <span
                      className={`small ${
                        followUpNote.length < 5 || followUpNote.length > 2000 ? "text-danger" : "text-muted"
                      }`}
                      style={{ fontSize: "0.75rem" }}
                    >
                      {followUpNote.length} / 2000
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  className={`form-control ${
                    validationErrors.followUpNote || fieldErrors.followUpNote ? "is-invalid" : ""
                  }`}
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="Specify required follow-up actions..."
                  data-testid="action-followup-note-input"
                />
                {(validationErrors.followUpNote || fieldErrors.followUpNote) && (
                  <div className="invalid-feedback d-block small mt-1">
                    {fieldErrors.followUpNote || validationErrors.followUpNote}
                  </div>
                )}
              </div>

              {/* Attachment Notes */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label text-muted text-uppercase small fw-bold mb-0" style={{ fontSize: "0.75rem" }}>
                    Attachment Notes <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <span className="small text-muted" style={{ fontSize: "0.75rem" }}>
                    {attachmentNotes.length} / 500
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={500}
                  className="form-control"
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                  placeholder="e.g. Look for RAM_diagnostic_report.png in Attachments"
                  data-testid="action-attachment-notes-input"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer border-top px-4 py-3 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary px-3 py-2 fw-medium"
                onClick={handleSafeClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary-green px-4 py-2 fw-bold d-flex align-items-center gap-2"
                style={{ backgroundColor: "#10403E", borderColor: "#10403E" }}
                disabled={!isValid || isSubmitting}
                data-testid="action-save-btn"
              >
                {isSubmitting && (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                    data-testid="action-save-spinner"
                  />
                )}
                <span>Save Action</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
