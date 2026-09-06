import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import {
  Category,
  RelatedSystem,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  CreatedTicket,
} from "../api.js";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ATTACHMENTS = 5;

interface QueuedFile {
  id: string;
  file: File;
  error?: string;
  status: "idle" | "uploading" | "success" | "failed";
  retryable?: boolean;
}

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const { currentRequester } = useRequester();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Field States
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState<string>("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Attachments State
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // UI / Action States
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
  const [partialUploadNotice, setPartialUploadNotice] = useState<string | null>(null);

  const formattedDateTime = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Fetch categories & related systems
  useEffect(() => {
    let isMounted = true;
    async function loadReferenceData() {
      try {
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        if (isMounted) {
          setCategories(cats || []);
          setRelatedSystems(systems || []);
        }
      } catch (err) {
        if (isMounted) {
          setApiError("Failed to load reference data. Please refresh.");
        }
      }
    }
    loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Validation helper
  const validate = () => {
    const errors: Record<string, string> = {};

    if (categoryId === "" || typeof categoryId !== "number") {
      errors.categoryId = "Category is required.";
    }

    if (relatedSystemId === "" || typeof relatedSystemId !== "number") {
      errors.relatedSystemId = "Related system is required.";
    }

    if (!requestedPriority) {
      errors.requestedPriority = "Requested priority is required.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      errors.summary = "Summary is required.";
    } else if (trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters.";
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      errors.description = "Description is required.";
    } else if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters.";
    }

    return errors;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validate();
    setFieldErrors(errors);
  };

  // Attachment file handling
  const handleAddFiles = (files: FileList | File[]) => {
    const validCount = queuedFiles.filter((q) => !q.error).length;
    const fileArray = Array.from(files);
    const newQueue: QueuedFile[] = [...queuedFiles];

    for (const file of fileArray) {
      const id = `${Date.now()}-${Math.random()}`;

      if (validCount + newQueue.filter((q) => !q.error).length >= MAX_ATTACHMENTS) {
        newQueue.push({
          id,
          file,
          error: "Maximum of 5 attachments allowed per ticket.",
          status: "failed",
        });
        continue;
      }

      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        newQueue.push({
          id,
          file,
          error: `Invalid file type "${file.name}". Allowed types: JPEG, PNG, WebP, PDF.`,
          status: "failed",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        newQueue.push({
          id,
          file,
          error: `File "${file.name}" exceeds 5MB limit.`,
          status: "failed",
        });
        continue;
      }

      newQueue.push({
        id,
        file,
        status: "idle",
      });
    }

    setQueuedFiles(newQueue);
  };

  const handleRemoveFile = (id: string) => {
    setQueuedFiles((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRetryUpload = async (queuedFile: QueuedFile) => {
    if (!createdTicket) return;

    setQueuedFiles((prev) =>
      prev.map((q) => (q.id === queuedFile.id ? { ...q, status: "uploading", error: undefined } : q))
    );

    try {
      await uploadAttachment(createdTicket.id, queuedFile.file);
      setQueuedFiles((prev) =>
        prev.map((q) => (q.id === queuedFile.id ? { ...q, status: "success" } : q))
      );
      setPartialUploadNotice(null);
    } catch (err: any) {
      setQueuedFiles((prev) =>
        prev.map((q) =>
          q.id === queuedFile.id
            ? {
                ...q,
                status: "failed",
                error: "Upload failed — Ticket was saved. Retry upload.",
                retryable: true,
              }
            : q
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setTouched({
      categoryId: true,
      relatedSystemId: true,
      requestedPriority: true,
      summary: true,
      description: true,
    });

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      // Step 1: Create Ticket (BR-24)
      const newTicket = await createTicket({
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
      });

      setCreatedTicket(newTicket);

      // Step 2: Upload valid queued attachments
      const validFilesToUpload = queuedFiles.filter((q) => !q.error && q.status === "idle");
      let failedUploads = false;

      if (validFilesToUpload.length > 0) {
        for (const item of validFilesToUpload) {
          setQueuedFiles((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" } : q))
          );
          try {
            await uploadAttachment(newTicket.id, item.file);
            setQueuedFiles((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, status: "success" } : q))
            );
          } catch (err: any) {
            failedUploads = true;
            setQueuedFiles((prev) =>
              prev.map((q) =>
                q.id === item.id
                  ? {
                      ...q,
                      status: "failed",
                      error: "Upload failed — Ticket was saved. Retry upload.",
                      retryable: true,
                    }
                  : q
              )
            );
          }
        }
      }

      if (failedUploads) {
        setPartialUploadNotice(
          "Ticket saved successfully, but some attachments failed to upload. You can retry uploading them below."
        );
      }
    } catch (err: any) {
      setApiError(err.message || "Failed to create ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("MEDIUM");
    setSummary("");
    setDescription("");
    setQueuedFiles([]);
    setTouched({});
    setFieldErrors({});
    setCreatedTicket(null);
    setApiError(null);
    setPartialUploadNotice(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // If Ticket was successfully created and no pending failed uploads, show Success Confirmation Panel (in-place)
  if (createdTicket && !partialUploadNotice) {
    return (
      <div className="w-100 py-2">
        <div className="mb-4 d-flex align-items-center gap-2 text-muted small">
          <Link to="/tickets" className="text-decoration-none text-success">
            My Tickets
          </Link>
          <span>&gt;</span>
          <span className="text-secondary">Create Ticket</span>
        </div>

        <div
          className="surface-card p-4 p-md-5 rounded-3 border shadow-sm text-center my-4"
          style={{ backgroundColor: "#EAF6EF", borderColor: "#006B3C" }}
          data-testid="success-panel"
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{ width: 64, height: 64, backgroundColor: "#006B3C", color: "#FFFFFF" }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="h3 fw-bold mb-2" style={{ color: "#1A2E22" }}>
            Ticket Created Successfully!
          </h1>
          <p className="text-muted small mb-3">
            Your support request has been submitted and assigned ticket number:
          </p>

          <div
            className="d-inline-block px-4 py-2 bg-white rounded-3 border fw-bold fs-4 font-monospace mb-4 shadow-sm"
            style={{ color: "#006B3C", borderColor: "#006B3C" }}
            data-testid="ticket-number-display"
          >
            {createdTicket.ticketNumber}
          </div>

          <div className="d-flex justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 py-2"
              onClick={resetForm}
              data-testid="create-another-ticket-button"
            >
              Create Another Ticket
            </button>
            <button
              type="button"
              className="btn btn-success px-4 py-2"
              style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
              onClick={() => navigate(`/tickets/${createdTicket.id}`)}
              data-testid="view-ticket-button"
            >
              View Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-100 py-2" data-testid="create-ticket-screen">
      {/* Breadcrumbs */}
      <div className="mb-4 d-flex align-items-center gap-2 text-muted small">
        <Link to="/tickets" className="text-decoration-none text-success">
          My Tickets
        </Link>
        <span>&gt;</span>
        <span className="text-secondary">Create Ticket</span>
      </div>

      <div className="surface-card bg-white p-4 p-md-5 rounded-3 border shadow-sm mx-auto" style={{ maxWidth: 840 }}>
        <h1 className="h4 fw-bold mb-1" style={{ color: "#1A2E22" }}>
          Create Support Ticket
        </h1>
        <p className="text-muted small mb-4">
          Submit a new IT support request. Please fill out all required details below.
        </p>

        {/* API Error Banner (BR-10) */}
        {apiError && (
          <div
            className="alert alert-danger mb-4 d-flex align-items-center justify-content-between small"
            style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", borderColor: "#FCA5A5" }}
            data-testid="api-error-banner"
            role="alert"
          >
            <div>
              <div className="fw-semibold">Submission Failed</div>
              <div>{apiError}</div>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close error message"
              onClick={() => setApiError(null)}
            />
          </div>
        )}

        {/* Partial Upload Notice (BR-20) */}
        {partialUploadNotice && createdTicket && (
          <div
            className="alert alert-warning mb-4 d-flex align-items-center justify-content-between small"
            data-testid="partial-upload-banner"
            role="alert"
          >
            <div>
              <div className="fw-semibold">Ticket Saved ({createdTicket.ticketNumber})</div>
              <div>{partialUploadNotice}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-success"
              onClick={() => navigate(`/tickets/${createdTicket.id}`)}
              data-testid="view-ticket-after-partial-button"
            >
              View Ticket Details
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} data-testid="create-ticket-form" noValidate>
          {/* Row 1: Requester Name & Date/Time (Read-only) */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-muted">
                Requester Name
              </label>
              <input
                type="text"
                className="form-control form-control-sm border-neutral"
                style={{ backgroundColor: "#EDF2EE" }}
                value={currentRequester?.name || "Jennifer Anderson"}
                readOnly
                aria-readonly="true"
                data-testid="requester-name-readonly"
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold small text-muted">
                Date / Time
              </label>
              <input
                type="text"
                className="form-control form-control-sm border-neutral"
                style={{ backgroundColor: "#EDF2EE" }}
                value={formattedDateTime}
                readOnly
                aria-readonly="true"
                data-testid="created-date-readonly"
              />
            </div>
          </div>

          {/* Row 2: Classification (Category, Related System, Requested Priority) */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-4">
              <label htmlFor="category-select" className="form-label fw-semibold small">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="category-select"
                data-testid="category-select"
                className={`form-select form-select-sm ${
                  touched.categoryId && fieldErrors.categoryId ? "is-invalid" : ""
                }`}
                style={
                  touched.categoryId && fieldErrors.categoryId
                    ? { borderColor: "#B91C1C" }
                    : {}
                }
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value === "" ? "" : Number(e.target.value));
                  if (touched.categoryId) {
                    setFieldErrors(validate());
                  }
                }}
                onBlur={() => handleBlur("categoryId")}
                disabled={submitting}
                aria-invalid={touched.categoryId && !!fieldErrors.categoryId}
                aria-describedby={fieldErrors.categoryId ? "category-error" : undefined}
              >
                <option value="">Select Category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {touched.categoryId && fieldErrors.categoryId && (
                <div
                  id="category-error"
                  className="small text-danger mt-1"
                  style={{ color: "#B91C1C" }}
                  data-testid="category-error"
                >
                  {fieldErrors.categoryId}
                </div>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="related-system-select" className="form-label fw-semibold small">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="related-system-select"
                data-testid="related-system-select"
                className={`form-select form-select-sm ${
                  touched.relatedSystemId && fieldErrors.relatedSystemId ? "is-invalid" : ""
                }`}
                style={
                  touched.relatedSystemId && fieldErrors.relatedSystemId
                    ? { borderColor: "#B91C1C" }
                    : {}
                }
                value={relatedSystemId}
                onChange={(e) => {
                  setRelatedSystemId(e.target.value === "" ? "" : Number(e.target.value));
                  if (touched.relatedSystemId) {
                    setFieldErrors(validate());
                  }
                }}
                onBlur={() => handleBlur("relatedSystemId")}
                disabled={submitting}
                aria-invalid={touched.relatedSystemId && !!fieldErrors.relatedSystemId}
                aria-describedby={fieldErrors.relatedSystemId ? "related-system-error" : undefined}
              >
                <option value="">Select System...</option>
                {relatedSystems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>
              {touched.relatedSystemId && fieldErrors.relatedSystemId && (
                <div
                  id="related-system-error"
                  className="small text-danger mt-1"
                  style={{ color: "#B91C1C" }}
                  data-testid="related-system-error"
                >
                  {fieldErrors.relatedSystemId}
                </div>
              )}
            </div>

            <div className="col-12 col-md-4">
              <label htmlFor="requested-priority-select" className="form-label fw-semibold small">
                Requested Priority <span className="text-danger">*</span>
              </label>
              <select
                id="requested-priority-select"
                data-testid="requested-priority-select"
                className="form-select form-select-sm"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
                disabled={submitting}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Row 3: Summary (Single Line, 5–100 chars, Live Counter) */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="summary-input" className="form-label fw-semibold small mb-0">
                Summary <span className="text-danger">*</span>
              </label>
              <span
                className={`small ${
                  summary.length > 100 || (summary.trim().length > 0 && summary.trim().length < 5)
                    ? "text-danger"
                    : "text-muted"
                }`}
                data-testid="summary-counter"
              >
                {summary.length}/100
              </span>
            </div>
            <input
              type="text"
              id="summary-input"
              data-testid="summary-input"
              className={`form-control form-control-sm ${
                touched.summary && fieldErrors.summary ? "is-invalid" : ""
              }`}
              style={
                touched.summary && fieldErrors.summary ? { borderColor: "#B91C1C" } : {}
              }
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (touched.summary) {
                  setFieldErrors(validate());
                }
              }}
              onBlur={() => handleBlur("summary")}
              placeholder="Brief summary of the issue (5–100 characters)"
              disabled={submitting}
              maxLength={100}
              aria-invalid={touched.summary && !!fieldErrors.summary}
              aria-describedby={fieldErrors.summary ? "summary-error" : undefined}
            />
            {touched.summary && fieldErrors.summary && (
              <div
                id="summary-error"
                className="small text-danger mt-1"
                style={{ color: "#B91C1C" }}
                data-testid="summary-error"
              >
                {fieldErrors.summary}
              </div>
            )}
          </div>

          {/* Row 4: Description (Textarea, 10–2000 chars, Live Counter) */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="description-input" className="form-label fw-semibold small mb-0">
                Description <span className="text-danger">*</span>
              </label>
              <span
                className={`small ${
                  description.length > 2000 || (description.trim().length > 0 && description.trim().length < 10)
                    ? "text-danger"
                    : "text-muted"
                }`}
                data-testid="description-counter"
              >
                {description.length}/2000
              </span>
            </div>
            <textarea
              id="description-input"
              data-testid="description-input"
              rows={5}
              className={`form-control form-control-sm ${
                touched.description && fieldErrors.description ? "is-invalid" : ""
              }`}
              style={{
                minHeight: 120,
                resize: "vertical",
                ...(touched.description && fieldErrors.description
                  ? { borderColor: "#B91C1C" }
                  : {}),
              }}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (touched.description) {
                  setFieldErrors(validate());
                }
              }}
              onBlur={() => handleBlur("description")}
              placeholder="Detailed description of your issue or request (10–2000 characters)"
              disabled={submitting}
              maxLength={2000}
              aria-invalid={touched.description && !!fieldErrors.description}
              aria-describedby={fieldErrors.description ? "description-error" : undefined}
            />
            {touched.description && fieldErrors.description && (
              <div
                id="description-error"
                className="small text-danger mt-1"
                style={{ color: "#B91C1C" }}
                data-testid="description-error"
              >
                {fieldErrors.description}
              </div>
            )}
          </div>

          {/* Row 5: Attachments Drag and Drop Zone */}
          <div className="mb-4">
            <label className="form-label fw-semibold small mb-1">
              Attachments (Optional)
            </label>

            <div
              className={`p-4 border-2 border-dashed rounded-3 text-center transition-all ${
                dragActive ? "border-success bg-light" : "border-secondary-subtle bg-light-subtle"
              }`}
              style={{ cursor: submitting ? "not-allowed" : "pointer" }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (!submitting) {
                  handleAddFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => {
                if (!submitting) {
                  fileInputRef.current?.click();
                }
              }}
              data-testid="attachment-dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="d-none"
                data-testid="attachment-input"
                disabled={submitting}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAddFiles(e.target.files);
                    e.target.value = "";
                  }
                }}
              />
              <div className="text-muted small">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div>
                  <span className="fw-semibold text-success">Click to browse</span> or drag and drop files here
                </div>
                <div className="text-muted small mt-1" style={{ fontSize: "0.75rem" }}>
                  Accepted formats: JPG, PNG, WebP, PDF | Max size: 5MB per file | Limit: 5 files
                </div>
              </div>
            </div>

            {/* Queued File Chips */}
            {queuedFiles.length > 0 && (
              <div className="mt-3 d-flex flex-column gap-2" data-testid="queued-files-list">
                {queuedFiles.map((q) => (
                  <div
                    key={q.id}
                    className={`p-2 rounded border d-flex align-items-center justify-content-between small ${
                      q.error ? "bg-danger-subtle border-danger text-danger" : "bg-light border-neutral"
                    }`}
                    data-testid={`file-chip-${q.id}`}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="fw-semibold text-truncate">{q.file.name}</span>
                      <span className="text-muted small">({formatFileSize(q.file.size)})</span>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      {q.status === "uploading" && (
                        <div className="spinner-border spinner-border-sm text-success" role="status">
                          <span className="visually-hidden">Uploading...</span>
                        </div>
                      )}

                      {q.status === "success" && (
                        <span className="badge bg-success small">Uploaded</span>
                      )}

                      {q.error && (
                        <span className="small text-danger me-2" data-testid={`file-error-${q.id}`}>
                          {q.error}
                        </span>
                      )}

                      {q.retryable && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger py-0 px-2"
                          onClick={() => handleRetryUpload(q)}
                          data-testid={`retry-upload-btn-${q.id}`}
                        >
                          Retry
                        </button>
                      )}

                      {!submitting && (
                        <button
                          type="button"
                          className="btn-close btn-close-sm"
                          aria-label={`Remove file ${q.file.name}`}
                          onClick={() => handleRemoveFile(q.id)}
                          data-testid={`remove-file-btn-${q.id}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={() => navigate("/tickets")}
              disabled={submitting}
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success px-4 d-flex align-items-center gap-2"
              style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
              disabled={submitting}
              data-testid="submit-ticket-button"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                "Submit Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
