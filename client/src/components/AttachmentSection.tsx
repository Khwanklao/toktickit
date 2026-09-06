import React, { useState, useRef, useEffect } from "react";
import { Attachment, uploadAttachment, softRemoveAttachment } from "../api.js";
import { apiClient } from "../lib/apiClient.js";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ACTIVE_ATTACHMENTS = 5;

interface AttachmentSectionProps {
  ticketId: number;
  attachments: Attachment[];
  onRefresh?: () => void;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  attachments,
  onRefresh,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);

  // Active (non-removed) attachments count
  // Local state
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [softRemovedList, setSoftRemovedList] = useState<Attachment[]>([]);

  // Merged display attachments: active items from server + soft-removed items tracked locally
  const displayAttachments = [
    ...attachments,
    ...softRemovedList.filter((r) => !attachments.some((a) => String(a.id) === String(r.id))),
  ].map((att) => {
    const removedLocally = softRemovedList.find((r) => String(r.id) === String(att.id));
    return removedLocally ? { ...att, ...removedLocally } : att;
  });

  // Active (non-removed) attachments count
  const activeAttachments = displayAttachments.filter((a) => !a.isRemoved);
  const activeCount = activeAttachments.length;
  const isAddDisabled = activeCount >= MAX_ACTIVE_ATTACHMENTS;

  // Soft-removal Modal State
  const [removingAttachment, setRemovingAttachment] = useState<Attachment | null>(null);
  const [removalReason, setRemovalReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [modalApiError, setModalApiError] = useState<string | null>(null);

  // Focus management for modal
  useEffect(() => {
    if (removingAttachment) {
      setTimeout(() => {
        modalTextareaRef.current?.focus();
      }, 50);
    }
  }, [removingAttachment]);

  const handleOpenRemovalModal = (att: Attachment, e: React.MouseEvent<HTMLButtonElement>) => {
    triggerButtonRef.current = e.currentTarget;
    setRemovingAttachment(att);
    setRemovalReason("");
    setReasonError(null);
    setModalApiError(null);
  };

  const handleCloseRemovalModal = () => {
    setRemovingAttachment(null);
    setRemovalReason("");
    setReasonError(null);
    setModalApiError(null);
    if (triggerButtonRef.current) {
      triggerButtonRef.current.focus();
    }
  };

  const handleConfirmRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingAttachment || isRemoving) return;

    const trimmed = removalReason.trim();
    if (!trimmed || trimmed.length < 3) {
      setReasonError("Removal reason is required (minimum 3 characters).");
      return;
    }

    setIsRemoving(true);
    setModalApiError(null);

    try {
      const result = await softRemoveAttachment(removingAttachment.id, trimmed);
      setIsRemoving(false);
      handleCloseRemovalModal();
      const removedItem: Attachment = (result && typeof result === "object" && "id" in result)
        ? { ...result, isRemoved: true, removalReason: trimmed }
        : {
            ...removingAttachment,
            isRemoved: true,
            removalReason: trimmed,
            removedAt: new Date().toISOString(),
          };

      setSoftRemovedList((prev) => [
        ...prev.filter((item) => String(item.id) !== String(removedItem.id)),
        removedItem,
      ]);
    } catch (err: any) {
      setIsRemoving(false);
      setModalApiError(err.message || "Failed to remove attachment. Please try again.");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    e.target.value = ""; // reset input

    if (isAddDisabled) {
      setUploadError("Maximum 5 active attachments allowed per ticket.");
      return;
    }

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setUploadError(`Invalid file type "${file.name}". Allowed formats: JPEG, PNG, WebP, PDF.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File "${file.name}" exceeds 5MB limit.`);
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await uploadAttachment(ticketId, file);
      setUploading(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setUploading(false);
      setUploadError(err.message || "Failed to upload attachment.");
    }
  };

  const handleDownload = async (att: Attachment) => {
    if (att.isRemoved) return;
    try {
      const res = await apiClient.fetch(`/api/attachments/${att.id}/download`);
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.originalFileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Unable to download attachment.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="attachment-section" data-testid="attachment-section">
      {/* Header & Add Button */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h2 className="h6 fw-bold m-0" style={{ color: "#1A2E22" }}>
            Ticket Attachments ({activeCount}/5 Active)
          </h2>
          <span className="text-muted small">
            Supported formats: JPEG, PNG, WebP, PDF (Max 5MB per file)
          </span>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="d-none"
            onChange={handleFileSelect}
            data-testid="add-attachment-file-input"
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
            disabled={isAddDisabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            data-testid="add-attachment-btn"
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Uploading…
              </>
            ) : (
              <>
                <span>+</span> Add Attachment
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div
          className="alert alert-danger alert-dismissible fade show p-2 px-3 small mb-3"
          data-testid="upload-error-banner"
          role="alert"
        >
          {uploadError}
          <button
            type="button"
            className="btn-close btn-close-sm"
            aria-label="Close"
            onClick={() => setUploadError(null)}
          />
        </div>
      )}

      {/* Attachments List */}
      {displayAttachments.length === 0 ? (
        <div className="p-4 border rounded-3 text-center text-muted small bg-light-subtle" data-testid="no-attachments-msg">
          No attachments uploaded for this ticket yet.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2" data-testid="attachments-list">
          {displayAttachments.map((att) => (
            <div
              key={att.id}
              className={`p-3 rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-2 ${
                att.isRemoved
                  ? "bg-light text-muted border-secondary-subtle"
                  : "bg-white border-neutral shadow-sm"
              }`}
              data-testid={`attachment-item-${att.id}`}
            >
              <div className="d-flex align-items-center gap-3 overflow-hidden">
                <div
                  className={`p-2 rounded ${
                    att.isRemoved ? "bg-secondary-subtle text-muted" : "bg-success-subtle text-success"
                  }`}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>

                <div className="overflow-hidden">
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className={`fw-semibold text-truncate ${
                        att.isRemoved ? "text-decoration-line-through text-muted" : "text-dark"
                      }`}
                      data-testid={`filename-${att.id}`}
                    >
                      {att.originalFileName}
                    </span>
                    {att.isRemoved && (
                      <span className="badge bg-secondary text-white small" data-testid={`removed-badge-${att.id}`}>
                        Removed
                      </span>
                    )}
                  </div>

                  <div className="text-muted small mt-1">
                    <span>{formatFileSize(att.fileSize)}</span>
                    <span className="mx-1">•</span>
                    <span>Uploaded {formatDate(att.createdAt)}</span>
                  </div>

                  {att.isRemoved && att.removalReason && (
                    <div className="text-danger small mt-1" style={{ fontSize: "0.75rem" }} data-testid={`removal-reason-text-${att.id}`}>
                      Reason: {att.removalReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  disabled={att.isRemoved}
                  onClick={() => handleDownload(att)}
                  title={att.isRemoved ? "Download disabled for removed attachments" : "Download file"}
                  data-testid={`download-btn-${att.id}`}
                  aria-label={`Download file ${att.originalFileName}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download</span>
                </button>

                {!att.isRemoved && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                    onClick={(e) => handleOpenRemovalModal(att, e)}
                    data-testid={`remove-btn-${att.id}`}
                    aria-label={`Remove file ${att.originalFileName}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Soft Removal Confirmation Modal */}
      {removingAttachment && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-labelledby="removal-modal-title"
          aria-modal="true"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="removal-modal"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              handleCloseRemovalModal();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content surface-card border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold" id="removal-modal-title">
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close modal"
                  onClick={handleCloseRemovalModal}
                  data-testid="close-modal-x"
                />
              </div>

              <form onSubmit={handleConfirmRemoval}>
                <div className="modal-body py-3">
                  <p className="small text-dark mb-3">
                    Are you sure you want to remove{" "}
                    <strong>{removingAttachment.originalFileName}</strong>? Soft-removed files cannot be downloaded.
                  </p>

                  {modalApiError && (
                    <div className="alert alert-danger p-2 small mb-3" role="alert">
                      {modalApiError}
                    </div>
                  )}

                  <div className="mb-2">
                    <label htmlFor="removal-reason" className="form-label fw-semibold small">
                      Removal Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      ref={modalTextareaRef}
                      id="removal-reason"
                      data-testid="removal-reason-input"
                      rows={3}
                      className={`form-control form-control-sm ${
                        reasonError ? "is-invalid" : ""
                      }`}
                      style={{ resize: "vertical" }}
                      placeholder="Please enter a reason for removing this file (min 3 characters)"
                      value={removalReason}
                      onChange={(e) => {
                        setRemovalReason(e.target.value);
                        if (reasonError) setReasonError(null);
                      }}
                      disabled={isRemoving}
                      aria-invalid={!!reasonError}
                      aria-describedby={reasonError ? "removal-reason-error" : undefined}
                    />
                    {reasonError && (
                      <div
                        id="removal-reason-error"
                        className="small text-danger mt-1"
                        style={{ color: "#B91C1C" }}
                        data-testid="removal-reason-error"
                      >
                        {reasonError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer border-top py-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={handleCloseRemovalModal}
                    disabled={isRemoving}
                    data-testid="cancel-remove-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-sm btn-danger px-3 d-flex align-items-center gap-1"
                    disabled={isRemoving}
                    data-testid="confirm-remove-btn"
                  >
                    {isRemoving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                        Removing…
                      </>
                    ) : (
                      "Remove Attachment"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
