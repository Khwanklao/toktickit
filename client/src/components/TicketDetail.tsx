import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { TicketDetail as TicketDetailType, fetchTicketDetail } from "../api.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { AttachmentSection } from "./AttachmentSection.js";

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "notFound" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"attachments">("attachments");

  const loadTicket = useCallback(async () => {
    if (!id) {
      setStatus("notFound");
      return;
    }

    if (!ticket) {
      setStatus("loading");
    }
    setErrorMessage("");

    try {
      const data = await fetchTicketDetail(id);
      setTicket(data);
      setStatus("success");
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("404") || msg.includes("not found") || msg.includes("Not Found")) {
        setStatus("notFound");
      } else {
        setStatus("error");
        setErrorMessage(msg || "Failed to load ticket details.");
      }
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const formatDate = (iso?: string) => {
    if (!iso) return "N/A";
    try {
      return new Date(iso).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (_) {
      return iso;
    }
  };

  return (
    <div className="w-100 py-2" data-testid="ticket-detail-screen">
      {/* Breadcrumbs */}
      <div className="mb-4 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2 text-muted small">
          <Link to="/tickets" className="text-decoration-none text-success">
            My Tickets
          </Link>
          <span>&gt;</span>
          <span className="text-secondary">Ticket Details</span>
        </div>

        <Link to="/tickets" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" data-testid="back-to-tickets-btn">
          <span>&larr;</span> Back to My Tickets
        </Link>
      </div>

      {/* Loading Skeleton State */}
      {status === "loading" && (
        <div className="surface-card bg-white p-5 rounded-3 border shadow-sm text-center" data-testid="detail-loading-skeleton">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading ticket details...</span>
          </div>
          <div className="text-muted small">Loading ticket details...</div>
        </div>
      )}

      {/* Safe Not-Found / Ownership Violation State (BR-04) */}
      {status === "notFound" && (
        <div className="surface-card bg-white p-5 rounded-3 border shadow-sm text-center my-4" data-testid="not-found-card">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{ width: 64, height: 64, backgroundColor: "#FEF2F2", color: "#B91C1C" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-2 text-dark">Ticket Not Found</h1>
          <p className="text-muted small mb-4" style={{ maxWidth: 460, margin: "0 auto" }}>
            The requested ticket does not exist or you do not have permission to view it.
          </p>
          <Link to="/tickets" className="btn btn-success px-4" style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}>
            Back to My Tickets
          </Link>
        </div>
      )}

      {/* General API Failure State */}
      {status === "error" && (
        <div className="alert alert-danger p-4 rounded-3 border shadow-sm d-flex justify-content-between align-items-center" data-testid="detail-error-banner">
          <div>
            <div className="fw-semibold">Error Loading Ticket</div>
            <div className="small">{errorMessage || "An unexpected error occurred."}</div>
          </div>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadTicket} data-testid="detail-retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Success State — Populated Ticket View */}
      {status === "success" && ticket && (
        <>
          {/* Main Ticket Card Header */}
          <div className="surface-card bg-white p-4 p-md-5 rounded-3 border shadow-sm mb-4">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4 pb-3 border-bottom">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-bold fs-4 font-monospace text-success" data-testid="detail-ticket-number">
                    {ticket.ticketNumber}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
                <h1 className="h4 fw-bold mb-0 text-dark" data-testid="detail-summary">
                  {ticket.summary}
                </h1>
              </div>

              <div className="text-muted small text-end">
                <div>Created: <span className="fw-semibold text-dark">{formatDate(ticket.createdAt)}</span></div>
                <div>Updated: <span className="fw-semibold text-dark">{formatDate(ticket.updatedAt)}</span></div>
              </div>
            </div>

            {/* Read-Only Details Grid */}
            <div className="row g-3 mb-4 p-3 rounded-3" style={{ backgroundColor: "#EDF2EE" }}>
              <div className="col-12 col-sm-6 col-md-3">
                <div className="text-muted small fw-semibold text-uppercase">Requester</div>
                <div className="fw-semibold text-dark small mt-1" data-testid="detail-requester-name">
                  {ticket.requester?.name || "N/A"}
                </div>
                <div className="text-muted small" style={{ fontSize: "0.75rem" }}>
                  {ticket.requester?.email}
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <div className="text-muted small fw-semibold text-uppercase">Category</div>
                <div className="fw-semibold text-dark small mt-1" data-testid="detail-category-name">
                  {ticket.category?.name || "N/A"}
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <div className="text-muted small fw-semibold text-uppercase">Related System</div>
                <div className="fw-semibold text-dark small mt-1" data-testid="detail-related-system-name">
                  {ticket.relatedSystem?.name || "N/A"}
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <div className="text-muted small fw-semibold text-uppercase">Requested Priority</div>
                <div className="mt-1" data-testid="detail-requested-priority">
                  <PriorityBadge priority={ticket.requestedPriority} />
                </div>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <div className="text-muted small fw-semibold text-uppercase">IT Priority</div>
                <div className="mt-1" data-testid="detail-it-priority">
                  {ticket.itPriority ? (
                    <PriorityBadge priority={ticket.itPriority} />
                  ) : (
                    <span className="text-muted small italic">Not Assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div>
              <h2 className="h6 fw-bold mb-2 text-dark">Description</h2>
              <div
                className="p-3 bg-light rounded-3 border text-dark small text-wrap"
                style={{ whiteSpace: "pre-wrap", minHeight: 80 }}
                data-testid="detail-description"
              >
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Tabbed Interface */}
          <div className="surface-card bg-white rounded-3 border shadow-sm overflow-hidden mb-4">
            <ul className="nav nav-tabs px-3 pt-2 bg-light border-bottom" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link fw-semibold px-4 ${activeTab === "attachments" ? "active text-success" : ""}`}
                  style={activeTab === "attachments" ? { borderColor: "#D1DCD5 #D1DCD5 #FFFFFF", color: "#006B3C" } : {}}
                  onClick={() => setActiveTab("attachments")}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "attachments"}
                  data-testid="tab-attachments"
                >
                  Attachments ({ticket.attachments?.filter((a) => !a.isRemoved).length || 0})
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button
                  className="nav-link disabled text-muted opacity-50 px-4"
                  type="button"
                  disabled
                  tabIndex={-1}
                  data-testid="tab-comments-disabled"
                  title="Public Comments module is excluded from Lab 2 scope"
                >
                  Public Comments (Lab 3)
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button
                  className="nav-link disabled text-muted opacity-50 px-4"
                  type="button"
                  disabled
                  tabIndex={-1}
                  data-testid="tab-actions-disabled"
                  title="Service Actions module is excluded from Lab 2 scope"
                >
                  Service Actions (Lab 3)
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button
                  className="nav-link disabled text-muted opacity-50 px-4"
                  type="button"
                  disabled
                  tabIndex={-1}
                  data-testid="tab-eventlog-disabled"
                  title="Event Log module is excluded from Lab 2 scope"
                >
                  Event Log (Lab 3)
                </button>
              </li>
            </ul>

            <div className="p-4 p-md-5">
              {activeTab === "attachments" && (
                <AttachmentSection
                  ticketId={ticket.id}
                  attachments={ticket.attachments || []}
                  onRefresh={loadTicket}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
