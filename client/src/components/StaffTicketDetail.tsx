import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { RoleBadge } from "./RoleBadge.js";
import { useAuth } from "../context/AuthContext.js";
import { formatBangkokDateTime } from "../utils/date.js";
import { ActionTakenModal, ActionTakenData } from "./ActionTakenModal.js";

interface CommentItem {
  id: string;
  author: { id: string; name: string; role: string };
  content: string;
  createdAt: string;
}

interface NoteItem {
  id: string;
  author: { id: string; name: string; role: string };
  content: string;
  createdAt: string;
}

interface AttachmentItem {
  id: number;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface ActionItem {
  id: string;
  ticketId: number;
  actionDateTime: string;
  performedById: string;
  performedBy: { id: string; name: string; role: string };
  description: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string;
  status: string;
  isRequesterResolved: boolean;
  createdAt: string;
  updatedAt: string;
  reopenedAt?: string | null;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: string; name: string; email: string };
  owner: { id: string; name: string; email: string } | null;
  attachments: AttachmentItem[];
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  REOPENED: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  CLOSED: [],
  CANCELLED: [],
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

export const StaffTicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMINISTRATOR";

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);

  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "actions" | "attachments">("comments");
  const [commentInput, setCommentInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);

  // Resolution Gate & Concurrency States
  const [resolutionRequiredError, setResolutionRequiredError] = useState<string | null>(null);
  const [staleError, setStaleError] = useState<string | null>(null);

  // Status Confirmation Modal State
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Action Taken Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionTakenData | null>(null);

  const fetchTicketData = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const t = await apiClient.get<any>(`/api/tickets/${id}`);
      setTicket(t.ticket || t);

      // Fetch comments
      const cRes = await apiClient.get<{ comments: CommentItem[] }>(`/api/tickets/${id}/comments`);
      setComments(cRes.comments || []);

      // Fetch notes (Staff / Admin only)
      if (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") {
        try {
          const nRes = await apiClient.get<{ notes: NoteItem[] }>(`/api/tickets/${id}/internal-notes`);
          setNotes(nRes.notes || []);
        } catch (_) {}
      }

      // Fetch actions
      try {
        const aRes = await apiClient.get<{ actions: ActionItem[] }>(`/api/tickets/${id}/actions`);
        setActions(aRes.actions || []);
      } catch (_) {}
    } catch (err: any) {
      setError("Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchTicketData();
  }, [fetchTicketData]);

  // Handle operations
  const handleAssignOwner = async (targetOwnerId?: string | null) => {
    if (isAdmin || !ticket) return;
    setOpError(null);
    setOpSuccess(null);
    try {
      let ownerIdToAssign = targetOwnerId;
      if (ownerIdToAssign === undefined) {
        if (user?.id) {
          ownerIdToAssign = user.id;
        } else {
          const me = await apiClient.get<any>("/api/auth/me");
          ownerIdToAssign = me.user?.id || me.id;
        }
      }

      const res = await apiClient.patch<{ ticketId: number; ownerId: string | null; status: string; updatedAt?: string }>(
        `/api/staff/tickets/${ticket.id}/assign`,
        { ownerId: ownerIdToAssign }
      );
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              owner: res.ownerId ? { id: res.ownerId, name: user?.name || "Assigned Staff", email: user?.email || "" } : null,
              status: res.status,
              updatedAt: res.updatedAt || prev.updatedAt,
            }
          : null
      );
      setOpSuccess("Ticket ownership updated successfully.");
    } catch (err: any) {
      setOpError(err?.response?.data?.error?.message || err?.message || "Failed to assign ticket owner.");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (isAdmin || !ticket) return;
    setOpError(null);
    setOpSuccess(null);
    try {
      const res = await apiClient.patch<{ ticketId: number; itPriority: string; updatedAt?: string }>(
        `/api/staff/tickets/${ticket.id}/priority`,
        { itPriority: newPriority }
      );
      setTicket((prev) => (prev ? { ...prev, itPriority: res.itPriority, updatedAt: res.updatedAt || prev.updatedAt } : null));
      setOpSuccess("IT Priority updated successfully.");
    } catch (err: any) {
      setOpError(err?.response?.data?.error?.message || err?.message || "Failed to update IT Priority.");
    }
  };

  const handleStatusSelectChange = (newStatus: string) => {
    if (isAdmin || !ticket) return;
    setResolutionRequiredError(null);
    setStaleError(null);
    setOpError(null);
    setOpSuccess(null);

    if (newStatus === "RESOLVED" || newStatus === "CLOSED" || newStatus === "CANCELLED") {
      setPendingStatus(newStatus);
      setIsConfirmModalOpen(true);
    } else {
      executeStatusChange(newStatus);
    }
  };

  const executeStatusChange = async (targetStatus: string) => {
    if (!ticket) return;
    try {
      const res = await apiClient.patch<{
        ticketId: number;
        status: string;
        updatedAt?: string;
        reopenedAt?: string | null;
      }>(`/api/staff/tickets/${ticket.id}/status`, {
        status: targetStatus,
        expectedUpdatedAt: ticket.updatedAt,
      });

      setTicket((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              updatedAt: res.updatedAt || prev.updatedAt,
              reopenedAt: res.reopenedAt !== undefined ? res.reopenedAt : prev.reopenedAt,
            }
          : null
      );
      setOpSuccess(`Ticket status changed to ${res.status}.`);
      setPendingStatus(null);
      setIsConfirmModalOpen(false);
    } catch (err: any) {
      setIsConfirmModalOpen(false);
      setPendingStatus(null);
      const code = err?.response?.data?.error?.code;
      if (code === "RESOLUTION_ACTION_REQUIRED") {
        setResolutionRequiredError(
          err.response.data.error.message ||
            "Record at least one Action Taken (after the reopen, if reopened) before resolving."
        );
      } else if (code === "STALE_UPDATE" || err?.status === 409 || err?.response?.status === 409) {
        setStaleError("This record was updated by another user. Reload to see the latest version before saving.");
      } else {
        setOpError(err?.response?.data?.error?.message || err?.message || "Failed to change ticket status.");
      }
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentInput.trim()) return;
    setOpError(null);
    try {
      const res = await apiClient.post<{ comment: CommentItem }>(`/api/tickets/${ticket.id}/comments`, {
        content: commentInput.trim(),
      });
      setComments((prev) => [...prev, res.comment]);
      setCommentInput("");
    } catch (err: any) {
      setOpError(err?.response?.data?.error?.message || err?.message || "Failed to post comment.");
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !noteInput.trim()) return;
    setOpError(null);
    try {
      const res = await apiClient.post<{ note: NoteItem }>(`/api/tickets/${ticket.id}/internal-notes`, {
        content: noteInput.trim(),
      });
      setNotes((prev) => [...prev, res.note]);
      setNoteInput("");
    } catch (err: any) {
      setOpError(err?.response?.data?.error?.message || err?.message || "Failed to save internal note.");
    }
  };

  if (loading) {
    return (
      <div className="container-fluid max-width-1200 py-4 px-3 px-md-4" data-testid="detail-skeleton">
        <div className="placeholder-glow mb-4">
          <span className="placeholder col-4 py-3 rounded"></span>
        </div>
        <div className="placeholder-glow mb-4">
          <span className="placeholder col-12 py-5 rounded"></span>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container-fluid max-width-1200 py-5 text-center" data-testid="detail-error">
        <h2 className="h4 fw-bold text-danger mb-2">Error</h2>
        <p className="text-secondary mb-4">{error || "Ticket not found."}</p>
        <button
          onClick={() => navigate("/staff/queue")}
          className="btn btn-primary-green px-4 py-2"
        >
          ← Back to Queue
        </button>
      </div>
    );
  }

  const adminTooltip = "Only IT Staff can change status, owner, or priority.";
  const isTerminal = ticket.status === "CLOSED" || ticket.status === "CANCELLED";

  // BR-12: Can resolve resolution gate check
  const canResolve = Boolean(
    actions.length > 0 &&
      (!ticket.reopenedAt || actions.some((a) => new Date(a.createdAt) > new Date(ticket.reopenedAt!)))
  );

  const allowedTargets = ALLOWED_TRANSITIONS[ticket.status] || [];
  const statusOptions = Array.from(new Set([ticket.status, ...allowedTargets]));

  return (
    <div className="container-fluid max-width-1200 py-4 px-3 px-md-4">
      {/* Navigation Breadcrumb & Back Link */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <nav className="text-muted small">
          <span className="cursor-pointer text-decoration-none hover-underline text-secondary" onClick={() => navigate("/staff/queue")}>
            My Queue
          </span>{" "}
          &gt; <span className="text-dark fw-semibold">Ticket Detail</span>
        </nav>
        <button
          onClick={() => navigate("/staff/queue")}
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 transition-all"
          data-testid="back-to-queue-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to Queue</span>
        </button>
      </div>

      {/* Operational Feedback Alerts */}
      {opError && (
        <div className="alert alert-danger p-3 rounded-3 mb-4 text-sm" role="alert" data-testid="op-error-banner">
          {opError}
        </div>
      )}
      {opSuccess && (
        <div className="alert alert-success p-3 rounded-3 mb-4 text-sm" data-testid="op-success-banner">
          {opSuccess}
        </div>
      )}

      {/* Resolution Required Alert Banner (BR-12) */}
      {resolutionRequiredError && (
        <div
          className="alert alert-danger p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
          role="alert"
          data-testid="resolution-required-banner"
        >
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">⚠️</span>
            <span className="small">{resolutionRequiredError}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger px-3 fw-semibold"
            data-testid="resolution-record-action-btn"
            onClick={() => {
              setEditingAction(null);
              setIsActionModalOpen(true);
            }}
          >
            Record Action Taken
          </button>
        </div>
      )}

      {/* Stale Update Alert Banner (BR-16) */}
      {staleError && (
        <div
          className="alert alert-warning p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2"
          role="alert"
          data-testid="stale-update-banner"
        >
          <div className="d-flex align-items-center gap-2">
            <span className="fs-5">⚠️</span>
            <span className="small">{staleError}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-warning text-dark px-3 fw-semibold"
            data-testid="reload-latest-btn"
            onClick={() => {
              setStaleError(null);
              fetchTicketData();
            }}
          >
            Reload Latest
          </button>
        </div>
      )}

      {/* Ticket Metadata Card Grid */}
      <div className="surface-card bg-white p-4 rounded-3 border shadow-sm mb-4" data-testid="ticket-metadata-grid">
        {/* Ticket Header & Summary */}
        <div className="d-flex flex-wrap align-items-center justify-content-between pb-3 border-bottom mb-4 gap-2">
          <div>
            <span
              className="badge text-monospace font-monospace fw-bold mb-2 px-2 py-1"
              style={{ backgroundColor: "#E8F0EC", color: "#1B4D3E" }}
            >
              {ticket.ticketNumber}
            </span>
            <h2 className="h4 fw-bold text-dark mb-0 mt-1">{ticket.summary}</h2>
          </div>
          <div className="d-flex align-items-center gap-2">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Responsive Metadata Grid Layout */}
        <div className="row g-3">
          <div className="col-12 col-sm-6 col-md-4">
            <span className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Category
            </span>
            <span className="fw-medium text-dark">{ticket.category?.name || "N/A"}</span>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <span className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Related System
            </span>
            <span className="fw-medium text-dark">{ticket.relatedSystem?.name || "N/A"}</span>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <span className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Requester
            </span>
            <span className="fw-medium text-dark">{ticket.requester?.name}</span>{" "}
            <span className="text-muted small">({ticket.requester?.email})</span>
          </div>

          <div className="col-12 col-sm-6 col-md-4">
            <span className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Requested Priority
            </span>
            <PriorityBadge priority={ticket.requestedPriority} />
          </div>

          {/* IT Priority Dropdown */}
          <div className="col-12 col-sm-6 col-md-4" title={isAdmin ? adminTooltip : undefined}>
            <label className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              IT Priority
            </label>
            <select
              disabled={isAdmin}
              value={ticket.itPriority || ticket.requestedPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="form-select form-select-sm"
              data-testid="it-priority-dropdown"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Current Status Dropdown */}
          <div className="col-12 col-sm-6 col-md-4" data-testid="status-control-container" title={isAdmin ? adminTooltip : undefined}>
            <label className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Current Status
            </label>
            {isTerminal ? (
              <select
                disabled={true}
                value={ticket.status}
                className="form-select form-select-sm"
                data-testid="status-dropdown"
              >
                <option value={ticket.status}>Final status ({STATUS_LABELS[ticket.status] || ticket.status})</option>
              </select>
            ) : (
              <select
                disabled={isAdmin}
                value={pendingStatus || ticket.status}
                onChange={(e) => handleStatusSelectChange(e.target.value)}
                className="form-select form-select-sm"
                data-testid="status-dropdown"
              >
                {statusOptions.map((st) => {
                  let label = STATUS_LABELS[st] || st;
                  if (st === "RESOLVED" && !canResolve) {
                    label = "Resolved (Record an Action Taken first)";
                  }
                  return (
                    <option key={st} value={st}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Owner Assignment Controls */}
          <div className="col-12 pt-3 border-top mt-3" title={isAdmin ? adminTooltip : undefined}>
            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
              <div>
                <span className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
                  Ticket Owner
                </span>
                <span className="fw-semibold text-dark fs-6">
                  {ticket.owner ? ticket.owner.name : "Unassigned"}
                </span>
              </div>
              {!isAdmin && (
                <div className="d-flex align-items-center gap-2">
                  {!ticket.owner || ticket.owner.id !== user?.id ? (
                    <button
                      onClick={() => handleAssignOwner()}
                      className="btn btn-primary-green btn-sm px-3 py-2 fw-bold"
                      data-testid="claim-ticket-btn"
                    >
                      Claim Ticket
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssignOwner(null)}
                      className="btn btn-secondary-custom btn-sm px-3 py-2 fw-semibold"
                      data-testid="unassign-ticket-btn"
                    >
                      Unassign Ticket
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Problem Description Box */}
      <div className="surface-card bg-white p-4 rounded-3 border shadow-sm mb-4">
        <h3 className="text-muted text-uppercase small fw-bold mb-2" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
          Problem Description
        </h3>
        <p className="text-dark small mb-0 lh-base text-pre-wrap">{ticket.description}</p>
      </div>

      {/* Requester Resolution Banner */}
      {ticket.isRequesterResolved && (
        <div
          className="alert alert-info p-3 rounded-3 mb-4 d-flex align-items-start gap-3"
          style={{ backgroundColor: "#EFF8FF", borderColor: "#BFDBFE", color: "#0369A1" }}
          data-testid="requester-resolution-banner"
        >
          <span className="fs-5">ℹ️</span>
          <div>
            <h4 className="fw-bold fs-6 mb-1">Requester Indicated Issue Appears Resolved</h4>
            <p className="small mb-0">
              The requester indicated that this issue appears resolved. Please verify and formally update status.
            </p>
          </div>
        </div>
      )}

      {/* Operational Tabs Section */}
      <div className="surface-card bg-white rounded-3 border shadow-sm overflow-hidden mb-4">
        <ul className="nav nav-tabs border-bottom px-3 pt-2 bg-light" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              role="tab"
              id="tab-comments-btn"
              aria-controls="comments-panel"
              aria-selected={activeTab === "comments"}
              onClick={() => setActiveTab("comments")}
              className={`nav-link fw-bold ${
                activeTab === "comments" ? "active text-success border-bottom-0" : "text-secondary"
              }`}
              style={activeTab === "comments" ? { color: "#1B4D3E" } : {}}
              data-testid="tab-comments"
            >
              Public Comments ({comments.length})
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              role="tab"
              id="tab-notes-btn"
              aria-controls="notes-panel"
              aria-selected={activeTab === "notes"}
              onClick={() => setActiveTab("notes")}
              className={`nav-link fw-bold ${
                activeTab === "notes" ? "active text-warning bg-warning-subtle" : "text-secondary"
              }`}
              style={activeTab === "notes" ? { backgroundColor: "#FFFBEB", color: "#D97706" } : {}}
              data-testid="tab-internal-notes"
            >
              Internal Notes ({notes.length})
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              role="tab"
              id="tab-actions-btn"
              aria-controls="actions-panel"
              aria-selected={activeTab === "actions"}
              onClick={() => setActiveTab("actions")}
              className={`nav-link fw-bold ${
                activeTab === "actions" ? "active border-bottom-0" : "text-secondary"
              }`}
              style={activeTab === "actions" ? { color: "#047857", backgroundColor: "#ECFDF5" } : {}}
              data-testid="tab-actions-taken"
            >
              Actions Taken ({actions.length})
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              role="tab"
              id="tab-attachments-btn"
              aria-controls="attachments-panel"
              aria-selected={activeTab === "attachments"}
              onClick={() => setActiveTab("attachments")}
              className={`nav-link fw-bold ${
                activeTab === "attachments" ? "active text-success border-bottom-0" : "text-secondary"
              }`}
              style={activeTab === "attachments" ? { color: "#1B4D3E" } : {}}
              data-testid="tab-attachments"
            >
              Attachments ({ticket.attachments?.length || 0})
            </button>
          </li>
        </ul>

        {/* Tab Content Panels */}
        <div className="p-4">
          {/* TAB 1: PUBLIC COMMENTS */}
          {activeTab === "comments" && (
            <div role="tabpanel" id="comments-panel" aria-labelledby="tab-comments-btn" className="space-y-4" data-testid="comments-panel">
              {/* Comment History */}
              <div className="mb-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-muted small italic">No public comments yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-3 bg-light border rounded-3 mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark small">{c.author.name}</span>
                          <RoleBadge role={c.author.role} />
                        </div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-dark small mb-0 pt-1 text-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="pt-3 border-top">
                <div className="mb-3">
                  <textarea
                    rows={3}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Type a public comment..."
                    className="form-control"
                    data-testid="comment-textarea"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="btn btn-primary-green btn-sm px-4 py-2 font-semibold"
                  data-testid="post-comment-btn"
                >
                  Post Comment
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: INTERNAL NOTES */}
          {activeTab === "notes" && (
            <div role="tabpanel" id="notes-panel" aria-labelledby="tab-notes-btn" className="p-3 rounded-3 border border-warning-subtle bg-[#FFFBEB]" style={{ backgroundColor: "#FFFBEB" }} data-testid="internal-notes-panel">
              {/* Confidential Warning Bar */}
              <div className="alert alert-warning p-3 mb-4 rounded-3 text-warning-emphasis fw-semibold small d-flex align-items-center gap-2" data-testid="internal-notes-warning">
                ⚠️ Internal notes are strictly confidential and only visible to IT Staff and Administrators.
              </div>

              {/* Note History */}
              <div className="mb-4">
                {notes.length === 0 ? (
                  <p className="text-warning-emphasis small italic">No internal notes recorded yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-3 bg-white border border-warning-subtle rounded-3 mb-2">
                      <div className="d-flex align-items-center justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark small">{n.author.name}</span>
                          <RoleBadge role={n.author.role} />
                        </div>
                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-dark small mb-0 pt-1 text-pre-wrap">{n.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Internal Note Form */}
              <form onSubmit={handleSaveNote} className="pt-3 border-top border-warning-subtle">
                <div className="mb-3">
                  <textarea
                    rows={3}
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Record confidential internal notes..."
                    className="form-control bg-white border-warning-subtle"
                    data-testid="internal-note-textarea"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="btn btn-warning text-white btn-sm px-4 py-2 font-semibold"
                  style={{ backgroundColor: "#D97706", borderColor: "#D97706" }}
                  data-testid="save-note-btn"
                >
                  Save Note
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ACTIONS TAKEN */}
          {activeTab === "actions" && (
            <div role="tabpanel" id="actions-panel" aria-labelledby="tab-actions-btn" data-testid="actions-taken-panel">
              {/* Terminal banner or Record Action button */}
              {isTerminal ? (
                <div className="alert alert-secondary p-3 mb-4 rounded-3 text-secondary small d-flex align-items-center gap-2" data-testid="terminal-actions-banner">
                  <span>ℹ️</span>
                  <span>This ticket is closed; Actions Taken can no longer be changed.</span>
                </div>
              ) : (
                (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
                  <div className="d-flex justify-content-end mb-3">
                    <button
                      type="button"
                      className="btn btn-primary-green btn-sm px-3 py-2 fw-semibold d-flex align-items-center gap-1"
                      data-testid="record-action-btn"
                      onClick={() => {
                        setEditingAction(null);
                        setIsActionModalOpen(true);
                      }}
                    >
                      <span>+</span> <span>Record Action</span>
                    </button>
                  </div>
                )
              )}

              {/* Actions Timeline */}
              {actions.length === 0 ? (
                <div className="p-4 text-center text-muted small" data-testid="actions-empty-state">
                  No actions recorded yet. IT Staff will log diagnostic and repair steps here.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((act) => {
                    const isEdited = new Date(act.updatedAt).getTime() > new Date(act.createdAt).getTime();
                    return (
                      <div key={act.id} className="p-3 bg-white border rounded-3 mb-3 shadow-sm">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2 pb-2 border-bottom">
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className="fw-bold text-dark small">{act.performedBy?.name || "IT Staff"}</span>
                            <RoleBadge role={act.performedBy?.role || "IT_STAFF"} />
                            <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                              {formatBangkokDateTime(act.actionDateTime)}
                            </span>
                            {isEdited && (
                              <span className="badge bg-light text-secondary border small px-2 py-1">
                                Edited
                              </span>
                            )}
                          </div>
                          {!isTerminal && (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") && (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm py-1 px-2 text-xs"
                              data-testid={`edit-action-btn-${act.id}`}
                              onClick={() => {
                                setEditingAction(act);
                                setIsActionModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Description */}
                        <div className="mb-2">
                          <p className="text-dark small mb-0 text-pre-wrap">{act.description}</p>
                        </div>

                        {/* Result */}
                        <div className="mb-2">
                          <div className="small text-secondary">
                            <strong className="text-dark">Result: </strong>
                            <span className="text-pre-wrap">{act.result}</span>
                          </div>
                        </div>

                        {/* Follow-up */}
                        {act.followUpRequired ? (
                          <div
                            className="p-3 rounded-2 mb-2"
                            style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
                          >
                            <div className="d-flex align-items-center gap-1 fw-bold small text-amber-800 mb-1" style={{ color: "#92400E" }}>
                              <span>⚠️</span>
                              <span>Follow-Up Required</span>
                            </div>
                            <p className="small mb-0 text-amber-900 text-pre-wrap" style={{ color: "#78350F" }}>
                              {act.followUpNote}
                            </p>
                          </div>
                        ) : (
                          <div className="small text-muted mb-2">No follow-up needed</div>
                        )}

                        {/* Attachment Notes */}
                        {act.attachmentNotes && (
                          <div className="small text-muted fst-italic">
                            {act.attachmentNotes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ATTACHMENTS */}
          {activeTab === "attachments" && (
            <div role="tabpanel" id="attachments-panel" aria-labelledby="tab-attachments-btn" data-testid="attachments-panel">
              {ticket.attachments?.length === 0 ? (
                <p className="text-muted small italic">No attachments uploaded for this ticket.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {ticket.attachments?.map((att) => (
                    <div key={att.id} className="list-group-item d-flex align-items-center justify-content-between py-3 px-0">
                      <div>
                        <span className="fw-medium text-dark small">{att.originalFileName}</span>
                        <span className="text-muted small ms-2">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                      </div>
                      <a
                        href={`/api/attachments/${att.id}/download`}
                        download
                        className="btn btn-sm btn-outline-success"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Transition Confirmation Modal */}
      {isConfirmModalOpen && pendingStatus && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          data-testid="status-confirm-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" id="confirm-modal-title">
                  Confirm Status Change
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setPendingStatus(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <p className="mb-3 text-secondary">
                  Are you sure you want to transition this ticket to <strong>{STATUS_LABELS[pendingStatus] || pendingStatus}</strong>?
                </p>
                <div className="p-3 bg-light rounded-3 border mb-3">
                  <div className="fw-semibold small text-muted text-uppercase mb-1">
                    Total Actions Taken: {actions.length}
                  </div>
                  <div className="small text-dark">
                    <strong>Latest Action: </strong>
                    {actions.length > 0 ? actions[0].description : "No actions recorded."}
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  data-testid="cancel-status-btn"
                  onClick={() => {
                    setIsConfirmModalOpen(false);
                    setPendingStatus(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary-green btn-sm px-3"
                  data-testid="confirm-status-btn"
                  onClick={() => executeStatusChange(pendingStatus)}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record / Edit Action Taken Modal */}
      {isActionModalOpen && ticket && (
        <ActionTakenModal
          isOpen={isActionModalOpen}
          onClose={() => {
            setIsActionModalOpen(false);
            setEditingAction(null);
          }}
          ticket={ticket}
          actionToEdit={editingAction}
          onSuccess={(_savedAction, ticketUpdatedAt) => {
            setIsActionModalOpen(false);
            setEditingAction(null);
            if (ticketUpdatedAt) {
              setTicket((prev) => (prev ? { ...prev, updatedAt: ticketUpdatedAt } : null));
            }
            fetchTicketData();
          }}
        />
      )}
    </div>
  );
};
