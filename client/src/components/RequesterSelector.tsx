import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import { CheckSystem } from "./CheckSystem.js";

export const RequesterSelector: React.FC = () => {
  const { currentRequester, requesters, status, error, switchRequester, fetchRequesters } = useRequester();
  const navigate = useNavigate();

  const [selectedId, setSelectedId] = useState<number | "">(currentRequester ? currentRequester.id : "");
  const [dismissError, setDismissError] = useState<boolean>(false);

  useEffect(() => {
    if (currentRequester) {
      setSelectedId(currentRequester.id);
    } else if (requesters.length > 0 && selectedId === "") {
      setSelectedId(requesters[0].id);
    }
  }, [currentRequester, requesters]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId !== "" && typeof selectedId === "number") {
      switchRequester(selectedId);
      navigate("/tickets");
    }
  };

  const handleCancel = () => {
    navigate("/tickets");
  };

  return (
    <div className="w-100 py-2">
      {/* Breadcrumb ชิดขอบซ้ายตรงกับโลโก้ TokTickIT ด้านบน */}
      <div className="mb-4 d-flex align-items-center gap-2 text-muted small">
        <Link to="/tickets" className="text-decoration-none text-success d-flex align-items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>
        <span>&gt;</span>
        <span className="text-secondary">Development Requester Selection</span>
      </div>

      {/* Main Centered Card Container */}
      <div className="d-flex justify-content-center">
        <div className="surface-card bg-white p-4 p-md-5 w-100 shadow-sm border rounded-3" style={{ maxWidth: 600 }}>

          {/* Centered Top Icon */}
          <div className="d-flex justify-content-center mb-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{ width: 54, height: 54, backgroundColor: "#EAF6EF", color: "#006B3C" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <circle cx="19" cy="11" r="2" />
              </svg>
            </div>
          </div>

          {/* Centered Title & Explanatory Text */}
          <div className="text-center mb-4">
            <h1 className="h4 fw-bold mb-2" style={{ color: "#1A2E22" }}>
              Select Development Requester
            </h1>
            <p className="text-muted small mb-0 px-md-3">
              Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.
            </p>
          </div>

          {/* Error Banner (BR-18, AC-17) */}
          {status === "error" && !dismissError && (
            <div
              className="alert alert-danger mb-4 d-flex align-items-center justify-content-between small"
              data-testid="error-banner"
              role="alert"
            >
              <div>
                <div className="fw-semibold">Failed to load requesters</div>
                <div className="small">{error || "An unexpected error occurred."}</div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  data-testid="retry-button"
                  onClick={() => fetchRequesters()}
                >
                  Retry
                </button>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close error banner"
                  onClick={() => setDismissError(true)}
                />
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleContinue}>
            <div className="mb-3 text-start">
              <label htmlFor="requester-select" className="form-label fw-semibold small">
                Active Development Requester <span className="text-danger">*</span>
              </label>

              {/* State 1: Loading (UI-01) */}
              {status === "loading" && (
                <div data-testid="loading-skeleton" className="py-2 text-muted small">
                  <div className="spinner-border spinner-border-sm me-2 text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  Loading active development requesters...
                </div>
              )}

              {/* State 2: Success Dropdown (UI-01, FR-01) */}
              {status === "success" && requesters.length > 0 && (
                <select
                  id="requester-select"
                  data-testid="requester-select"
                  className="form-select py-2"
                  value={selectedId}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                >
                  {requesters.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name} ({req.email}) — {req.department}
                    </option>
                  ))}
                </select>
              )}

              {/* State 3: Empty State (BR-19, UI-02, AC-18) */}
              {status === "success" && requesters.length === 0 && (
                <div
                  className="alert alert-warning m-0 small"
                  data-testid="empty-state"
                  role="status"
                >
                  No active development requesters are available.
                </div>
              )}
            </div>

            {/* Sub-note */}
            <div
              className="d-flex align-items-center gap-2 p-2 mb-3 rounded border small"
              style={{ backgroundColor: "#F9FAF9", borderColor: "#E5E7EB", color: "#374151" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Only active development requesters are shown.</span>
            </div>

            {/* Blue Info Callout (Lab 3) */}
            <div
              className="callout-info p-3 mb-4 rounded border text-start small"
              style={{ backgroundColor: "#EFF8FF", color: "#0369A1", borderColor: "#BAE6FD" }}
            >
              <div className="fw-semibold mb-1">Authentication coming in Lab 3</div>
              <div>In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.</div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end gap-2 pt-2 border-top">
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success px-4 d-flex align-items-center gap-2"
                style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                data-testid="continue-button"
                disabled={status !== "success" || requesters.length === 0 || selectedId === ""}
              >
                <span>&rarr;</span> Continue
              </button>
            </div>
          </form>

          {/* System Diagnostics Widget ด้านล่าง */}
          <div className="mt-4 border-top pt-3">
            <CheckSystem />
          </div>

        </div>
      </div>
    </div>
  );
};