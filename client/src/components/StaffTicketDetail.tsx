import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { RoleBadge } from "./RoleBadge.js";
import { useAuth } from "../context/AuthContext.js";

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
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: string; name: string; email: string };
  owner: { id: string; name: string; email: string } | null;
  attachments: AttachmentItem[];
}

export const StaffTicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === "ADMINISTRATOR";

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);

  const [activeTab, setActiveTab] = useState<"comments" | "notes" | "attachments">("comments");
  const [commentInput, setCommentInput] = useState("");
  const [noteInput, setNoteInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [opSuccess, setOpSuccess] = useState<string | null>(null);

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

      const res = await apiClient.patch<{ ticketId: number; ownerId: string | null; status: string }>(
        `/api/staff/tickets/${ticket.id}/assign`,
        { ownerId: ownerIdToAssign }
      );
      setTicket((prev) => (prev ? { ...prev, owner: res.ownerId ? { id: res.ownerId, name: user?.name || "Assigned Staff", email: user?.email || "" } : null, status: res.status } : null));
      setOpSuccess("Ticket ownership updated successfully.");
    } catch (err: any) {
      setOpError(err?.message || err?.response?.data?.error?.message || "Failed to assign ticket owner.");
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    if (isAdmin || !ticket) return;
    setOpError(null);
    setOpSuccess(null);
    try {
      const res = await apiClient.patch<{ ticketId: number; itPriority: string }>(
        `/api/staff/tickets/${ticket.id}/priority`,
        { itPriority: newPriority }
      );
      setTicket((prev) => (prev ? { ...prev, itPriority: res.itPriority } : null));
      setOpSuccess("IT Priority updated successfully.");
    } catch (err: any) {
      setOpError(err?.message || err?.response?.data?.error?.message || "Failed to update IT Priority.");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isAdmin || !ticket) return;
    setOpError(null);
    setOpSuccess(null);
    try {
      const res = await apiClient.patch<{ ticketId: number; status: string }>(
        `/api/staff/tickets/${ticket.id}/status`,
        { status: newStatus }
      );
      setTicket((prev) => (prev ? { ...prev, status: res.status } : null));
      setOpSuccess(`Ticket status changed to ${res.status}.`);
    } catch (err: any) {
      setOpError(err?.message || err?.response?.data?.error?.message || "Failed to change ticket status.");
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
      setOpError(err?.message || err?.response?.data?.error?.message || "Failed to post comment.");
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
      setOpError(err?.message || err?.response?.data?.error?.message || "Failed to save internal note.");
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

  const adminTooltip = "Administrators have read-only audit access to ticket operations.";

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
        <div className="alert alert-danger p-3 rounded-3 mb-4 text-sm" data-testid="op-error-banner">
          {opError}
        </div>
      )}
      {opSuccess && (
        <div className="alert alert-success p-3 rounded-3 mb-4 text-sm" data-testid="op-success-banner">
          {opSuccess}
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
          <div className="col-12 col-sm-6 col-md-4" title={isAdmin ? adminTooltip : undefined}>
            <label className="d-block text-muted text-uppercase small fw-bold mb-1" style={{ fontSize: "0.75rem", letterSpacing: "0.5px" }}>
              Current Status
            </label>
            <select
              disabled={isAdmin || ticket.status === "CLOSED" || ticket.status === "CANCELLED"}
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="form-select form-select-sm"
              data-testid="status-dropdown"
            >
              <option value="NEW" disabled>New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
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
        <ul className="nav nav-tabs border-bottom px-3 pt-2 bg-light">
          <li className="nav-item">
            <button
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
          <li className="nav-item">
            <button
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
          <li className="nav-item">
            <button
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
            <div className="space-y-4" data-testid="comments-panel">
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
            <div className="p-3 rounded-3 border border-warning-subtle bg-[#FFFBEB]" style={{ backgroundColor: "#FFFBEB" }} data-testid="internal-notes-panel">
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

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === "attachments" && (
            <div data-testid="attachments-panel">
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
    </div>
  );
};
