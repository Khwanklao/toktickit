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
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; email: string }>>([]);

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
      <div className="p-6 max-w-5xl mx-auto space-y-4 animate-pulse" data-testid="detail-skeleton">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-40 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center" data-testid="detail-error">
        <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
        <p className="text-gray-600 mb-4">{error || "Ticket not found."}</p>
        <button
          onClick={() => navigate("/staff/queue")}
          className="px-4 py-2 bg-[#1B4D3E] text-white rounded hover:bg-[#153C30]"
        >
          &lt;- Back to Queue
        </button>
      </div>
    );
  }

  const adminTooltip = "Administrators have read-only audit access to ticket operations.";

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <nav className="text-xs text-[#718096]">
          <span className="cursor-pointer hover:underline" onClick={() => navigate("/staff/queue")}>
            My Queue
          </span>{" "}
          &gt; <span className="text-[#1A202C] font-semibold">Ticket Detail</span>
        </nav>
        <button
          onClick={() => navigate("/staff/queue")}
          className="text-xs font-semibold text-[#1B4D3E] hover:underline"
          data-testid="back-to-queue-btn"
        >
          &lt;- Back to Queue
        </button>
      </div>

      {/* Operational Feedback Alerts */}
      {opError && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] rounded text-sm" data-testid="op-error-banner">
          {opError}
        </div>
      )}
      {opSuccess && (
        <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] text-[#16A34A] rounded text-sm" data-testid="op-success-banner">
          {opSuccess}
        </div>
      )}

      {/* Ticket Metadata Card Grid */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm space-y-4" data-testid="ticket-metadata-grid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F1F3F2] gap-2">
          <div>
            <span className="text-xs font-mono font-bold text-[#1B4D3E] bg-[#E8F0EC] px-2 py-1 rounded">
              {ticket.ticketNumber}
            </span>
            <h2 className="text-xl font-bold text-[#1A202C] mt-2">{ticket.summary}</h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {/* Grouped Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="block text-xs font-semibold text-[#718096] uppercase">Category</span>
            <span className="font-medium text-[#1A202C]">{ticket.category?.name || "N/A"}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#718096] uppercase">Related System</span>
            <span className="font-medium text-[#1A202C]">{ticket.relatedSystem?.name || "N/A"}</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#718096] uppercase">Requester</span>
            <span className="font-medium text-[#1A202C]">{ticket.requester?.name} ({ticket.requester?.email})</span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#718096] uppercase">Requested Priority</span>
            <PriorityBadge priority={ticket.requestedPriority} />
          </div>

          {/* IT Priority Dropdown */}
          <div title={isAdmin ? adminTooltip : undefined}>
            <label className="block text-xs font-semibold text-[#718096] uppercase mb-1">IT Priority</label>
            <select
              disabled={isAdmin}
              value={ticket.itPriority || ticket.requestedPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="w-full p-2 border border-[#E2E8F0] rounded text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#1B4D3E]"
              data-testid="it-priority-dropdown"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Current Status Dropdown */}
          <div title={isAdmin ? adminTooltip : undefined}>
            <label className="block text-xs font-semibold text-[#718096] uppercase mb-1">Status</label>
            <select
              disabled={isAdmin || ticket.status === "CLOSED" || ticket.status === "CANCELLED"}
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full p-2 border border-[#E2E8F0] rounded text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed focus:ring-2 focus:ring-[#1B4D3E]"
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
          <div className="md:col-span-3 pt-2 border-t border-[#F1F3F2]" title={isAdmin ? adminTooltip : undefined}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-semibold text-[#718096] uppercase">Ticket Owner</span>
                <span className="font-semibold text-[#1A202C]">
                  {ticket.owner ? ticket.owner.name : "Unassigned"}
                </span>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-2">
                  {!ticket.owner || ticket.owner.id !== user?.id ? (
                    <button
                      onClick={() => handleAssignOwner()}
                      className="px-3 py-1.5 bg-[#1B4D3E] text-white text-xs font-bold rounded hover:bg-[#153C30]"
                      data-testid="claim-ticket-btn"
                    >
                      Claim Ticket
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAssignOwner(null)}
                      className="px-3 py-1.5 border border-[#E2E8F0] text-xs font-bold text-[#718096] rounded hover:bg-gray-50"
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

      {/* Description Box */}
      <div className="bg-white p-6 rounded-lg border border-[#E2E8F0] shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-[#718096] uppercase tracking-wider">Problem Description</h3>
        <p className="text-sm text-[#1A202C] whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
      </div>

      {/* Requester Resolution Banner */}
      {ticket.isRequesterResolved && (
        <div
          className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-lg flex items-start gap-3"
          data-testid="requester-resolution-banner"
        >
          <span className="text-lg">ℹ️</span>
          <div>
            <h4 className="font-bold text-sm">Requester Indicated Issue Appears Resolved</h4>
            <p className="text-xs text-[#1E40AF]">
              The requester indicated that this issue appears resolved. Please verify and formally update status.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="flex border-b border-[#E2E8F0]">
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === "comments"
                ? "border-[#1B4D3E] text-[#1B4D3E]"
                : "border-transparent text-[#718096] hover:text-[#1A202C]"
            }`}
            data-testid="tab-comments"
          >
            Public Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === "notes"
                ? "border-[#D97706] text-[#D97706] bg-[#FFFBEB]"
                : "border-transparent text-[#718096] hover:text-[#1A202C]"
            }`}
            data-testid="tab-internal-notes"
          >
            Internal Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("attachments")}
            className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
              activeTab === "attachments"
                ? "border-[#1B4D3E] text-[#1B4D3E]"
                : "border-transparent text-[#718096] hover:text-[#1A202C]"
            }`}
            data-testid="tab-attachments"
          >
            Attachments ({ticket.attachments?.length || 0})
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-6">
          {/* TAB 1: PUBLIC COMMENTS */}
          {activeTab === "comments" && (
            <div className="space-y-6" data-testid="comments-panel">
              {/* Comment History */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#718096] italic">No public comments yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="p-4 bg-gray-50 border border-[#E2E8F0] rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1A202C]">{c.author.name}</span>
                          <RoleBadge role={c.author.role} />
                        </div>
                        <span className="text-[#718096]">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#1A202C] pt-1 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} className="space-y-3 pt-4 border-t border-[#F1F3F2]">
                <textarea
                  rows={3}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Type a public comment..."
                  className="w-full p-3 border border-[#E2E8F0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                  data-testid="comment-textarea"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="px-4 py-2 bg-[#1B4D3E] text-white text-sm font-bold rounded hover:bg-[#153C30] disabled:opacity-40"
                  data-testid="post-comment-btn"
                >
                  Post Comment
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: INTERNAL NOTES */}
          {activeTab === "notes" && (
            <div className="space-y-6 bg-[#FFFBEB] p-4 rounded-lg border border-[#FDE68A]" data-testid="internal-notes-panel">
              {/* Confidential Warning Bar */}
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-xs font-bold rounded-md flex items-center gap-2" data-testid="internal-notes-warning">
                ⚠️ Internal notes are strictly confidential and only visible to IT Staff and Administrators.
              </div>

              {/* Note History */}
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-xs text-[#D97706] italic">No internal notes recorded yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="p-4 bg-white border border-[#FDE68A] rounded-lg space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1A202C]">{n.author.name}</span>
                          <RoleBadge role={n.author.role} />
                        </div>
                        <span className="text-[#718096]">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-[#1A202C] pt-1 whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Internal Note Form */}
              <form onSubmit={handleSaveNote} className="space-y-3 pt-4 border-t border-[#FDE68A]">
                <textarea
                  rows={3}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Record confidential internal notes..."
                  className="w-full p-3 border border-[#FDE68A] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#D97706]"
                  data-testid="internal-note-textarea"
                />
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="px-4 py-2 bg-[#D97706] text-white text-sm font-bold rounded hover:bg-[#B45309] disabled:opacity-40"
                  data-testid="save-note-btn"
                >
                  Save Note
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === "attachments" && (
            <div className="space-y-4" data-testid="attachments-panel">
              {ticket.attachments?.length === 0 ? (
                <p className="text-xs text-[#718096] italic">No attachments uploaded for this ticket.</p>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {ticket.attachments?.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm text-[#1A202C]">{att.originalFileName}</span>
                        <span className="text-xs text-[#718096] ml-2">({(att.fileSize / 1024).toFixed(1)} KB)</span>
                      </div>
                      <a
                        href={`/api/attachments/${att.id}/download`}
                        download
                        className="text-xs text-[#1B4D3E] font-semibold hover:underline"
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
