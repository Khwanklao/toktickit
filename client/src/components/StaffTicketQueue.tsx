import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { useAuth } from "../context/AuthContext.js";

interface QueueTicket {
  id: number;
  ticketNumber: string;
  title: string;
  summary: string;
  category: { id: number; name: string };
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  isRequesterResolved?: boolean;
  owner: { id: string; name: string; email: string } | null;
  requester: { id: string; name: string; email: string };
  createdAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

interface Category {
  id: number;
  name: string;
}

export const StaffTicketQueue: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    totalRecords: 0,
    totalPages: 1,
  });
  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);

  // Debounce search
  useEffect(() => {
    if (search === "") {
      setDebouncedSearch("");
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchQueue = useCallback(async () => {
    if (tickets.length === 0) {
      setLoading(true);
    }
    setError(null);
    setIsForbidden(false);

    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "10");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (selectedPriority) params.set("itPriority", selectedPriority);
      if (selectedStatus) params.set("status", selectedStatus);

      if (selectedOwner === "me" && user) {
        params.set("ownerId", user.id);
      } else if (selectedOwner) {
        params.set("ownerId", selectedOwner);
      }

      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await apiClient.get<{
        data: QueueTicket[];
        pagination: PaginationData;
      }>(`/api/staff/queue?${params.toString()}`);

      setTickets(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      if (err?.status === 403 || err?.response?.status === 403) {
        setIsForbidden(true);
      } else {
        setError("Failed to load ticket queue. Please check your network connection and retry.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearch,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    selectedOwner,
    sortBy,
    sortOrder,
    user,
    tickets.length,
  ]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage((prev) => (prev === 1 ? prev : 1));
  }, [debouncedSearch, selectedCategory, selectedPriority, selectedStatus, selectedOwner, sortBy, sortOrder]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Load categories on mount
  useEffect(() => {
    apiClient
      .get<Category[]>("/api/categories")
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setSelectedOwner("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  if (isForbidden) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center p-4" data-testid="forbidden-screen">
        <h2 className="h3 fw-bold text-danger mb-2">Access Denied</h2>
        <p className="text-secondary mb-4">You do not have permission to view the IT Staff Queue.</p>
        <button
          onClick={() => navigate("/")}
          className="btn btn-primary-green px-4 py-2"
        >
          Return Home
        </button>
      </div>
    );
  }

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.totalRecords);

  // Standard Pagination Window Calculation
  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
    return pages;
  };

  return (
    <div className="container-fluid max-width-1200 py-4 px-3 px-md-4">
      {/* Header & Title */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A202C" }}>
            {user?.role === "ADMINISTRATOR" ? "IT Staff Ticket Queue (Audit Mode)" : "IT Staff Ticket Queue"}
          </h1>
          <p className="text-muted small mb-0">
            {user?.role === "ADMINISTRATOR"
              ? "Read-only access for administrative auditing and monitoring."
              : "Search, filter, and manage support tickets."}
          </p>
        </div>
      </div>

      {/* Network Error Alert */}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 p-3 rounded-3"
          data-testid="queue-error-alert"
        >
          <span className="small font-medium">{error}</span>
          <button
            onClick={fetchQueue}
            className="btn btn-sm btn-danger px-3 py-1 ms-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Controls Toolbar */}
      <div className="surface-card bg-white p-3 p-md-4 rounded-3 border mb-4 shadow-sm">
        <div className="row g-2 mb-3">
          {/* Search Input Box */}
          <div className="col-12 col-lg-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ticket number or summary..."
                className="form-control border-start-0 ps-0"
                data-testid="search-input"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select"
              data-testid="filter-category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* IT Priority Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="form-select"
              data-testid="filter-priority"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
              data-testid="filter-status"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Owner Filter */}
          <div className="col-12 col-sm-6 col-lg-2">
            <select
              value={selectedOwner}
              onChange={(e) => setSelectedOwner(e.target.value)}
              className="form-select"
              data-testid="filter-owner"
            >
              <option value="">All Owners</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>

        {/* Result Counter & Clear Filters CTA */}
        <div className="d-flex flex-wrap align-items-center justify-content-between pt-2 border-top text-muted small gap-2">
          <span data-testid="result-counter">
            {pagination.totalRecords > 0
              ? `Showing ${startRecord} to ${endRecord} of ${pagination.totalRecords} tickets`
              : "0 tickets found"}
          </span>
          {(search || selectedCategory || selectedPriority || selectedStatus || selectedOwner) && (
            <button
              onClick={clearFilters}
              className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
              style={{ color: "#1B4D3E" }}
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="surface-card bg-white p-4 rounded-3 border shadow-sm" data-testid="queue-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="placeholder-glow mb-2">
              <span className="placeholder col-12 py-3 rounded"></span>
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        debouncedSearch || selectedCategory || selectedPriority || selectedStatus || selectedOwner ? (
          /* No-Results State */
          <div className="surface-card bg-white p-5 text-center rounded-3 border shadow-sm my-3" data-testid="no-results-state">
            <div className="d-inline-flex align-items-center justify-content-center mb-3 text-muted" style={{ fontSize: "2rem" }}>
              🔍
            </div>
            <h3 className="h5 fw-bold mb-1" style={{ color: "#1A202C" }}>No tickets found matching your criteria</h3>
            <p className="text-muted small mb-4">Try adjusting your filter selections or search terms.</p>
            <button
              onClick={clearFilters}
              className="btn btn-primary-green px-4 py-2"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Empty State */
          <div className="surface-card bg-white p-5 text-center rounded-3 border shadow-sm my-3" data-testid="empty-state">
            <div className="d-inline-flex align-items-center justify-content-center mb-3 text-muted" style={{ fontSize: "2rem" }}>
              📋
            </div>
            <h3 className="h5 fw-bold mb-1" style={{ color: "#1A202C" }}>No tickets currently in queue</h3>
            <p className="text-muted small mb-0">There are no support tickets in the database.</p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (≥ 768px: d-none d-md-block) */}
          <div className="d-none d-md-block surface-card bg-white rounded-3 border shadow-sm overflow-hidden mb-4">
            <table className="table table-hover align-middle mb-0" data-testid="desktop-queue-table">
              <thead className="table-light">
                <tr className="text-uppercase small" style={{ color: "#5A6E63", fontSize: "0.75rem" }}>
                  <th
                    scope="col"
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => handleSort("ticketNumber")}
                    data-testid="header-ticket-number"
                  >
                    Ticket No. {sortBy === "ticketNumber" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => handleSort("createdAt")}
                    data-testid="header-created-at"
                  >
                    Created Date {sortBy === "createdAt" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" className="py-3 px-3">Summary</th>
                  <th scope="col" className="py-3 px-3">Category</th>
                  <th scope="col" className="py-3 px-3">Req. Priority</th>
                  <th
                    scope="col"
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => handleSort("itPriority")}
                    data-testid="header-it-priority"
                  >
                    IT Priority {sortBy === "itPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 cursor-pointer"
                    onClick={() => handleSort("status")}
                    data-testid="header-status"
                  >
                    Status {sortBy === "status" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th scope="col" className="py-3 px-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/staff/tickets/${t.id}`)}
                    className="cursor-pointer"
                    style={{ backgroundColor: "transparent" }}
                    data-testid={`queue-row-${t.id}`}
                  >
                    <td className="py-3 px-3 fw-bold" style={{ color: "#1B4D3E" }}>{t.ticketNumber}</td>
                    <td className="py-3 px-3 text-muted text-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 fw-medium text-dark text-truncate" style={{ maxWidth: "250px" }}>
                      {t.summary || t.title}
                    </td>
                    <td className="py-3 px-3 text-muted">{t.category?.name}</td>
                    <td className="py-3 px-3">
                      <PriorityBadge priority={t.requestedPriority} />
                    </td>
                    <td className="py-3 px-3">
                      <PriorityBadge priority={t.itPriority || t.requestedPriority} />
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-3 small">
                      {t.owner ? (
                        <span className="fw-semibold text-dark">{t.owner.name}</span>
                      ) : (
                        <span className="text-muted italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Stack View (< 768px: d-block d-md-none) */}
          <div className="d-block d-md-none space-y-3 mb-4" data-testid="mobile-ticket-list">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/staff/tickets/${t.id}`)}
                className="surface-card bg-white p-3 rounded-3 border shadow-sm mb-3 cursor-pointer"
                data-testid="mobile-ticket-card"
              >
                {/* Top of Card */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-success small" style={{ color: "#1B4D3E" }}>
                    {t.ticketNumber}
                  </span>
                  <StatusBadge status={t.status} />
                </div>

                {/* Middle of Card */}
                <h4 className="h6 fw-bold text-dark mb-2 text-truncate">{t.summary || t.title}</h4>
                <div className="row g-1 text-muted small mb-3">
                  <div className="col-6">
                    <span className="fw-semibold text-secondary">Category:</span> {t.category?.name}
                  </div>
                  <div className="col-6 d-flex align-items-center gap-1">
                    <span className="fw-semibold text-secondary">IT Priority:</span>
                    <PriorityBadge priority={t.itPriority || t.requestedPriority} />
                  </div>
                </div>

                {/* Bottom of Card: Clean typography separation for Owner and Date */}
                <div className="d-flex justify-content-between align-items-center text-muted small pt-2 border-top">
                  <div>
                    <span className="fw-semibold text-secondary">Owner:</span>{" "}
                    <span className="text-dark font-medium">{t.owner ? t.owner.name : "Unassigned"}</span>
                  </div>
                  <div className="text-muted">{new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Standard Pagination Window Controls */}
          {pagination.totalPages > 1 && (
            <div className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex align-items-center justify-content-between">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary-custom btn-sm px-3"
                data-testid="prev-page-btn"
              >
                &lt; Previous
              </button>
              
              <div className="d-flex align-items-center gap-1">
                {getPageNumbers(currentPage, pagination.totalPages).map((pg, idx) => (
                  <React.Fragment key={idx}>
                    {typeof pg === "number" ? (
                      <button
                        onClick={() => setCurrentPage(pg)}
                        className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${
                          pg === currentPage
                            ? "btn-primary-green fw-bold"
                            : "btn-light text-dark"
                        }`}
                        style={{ width: "32px", height: "32px", padding: 0 }}
                      >
                        {pg}
                      </button>
                    ) : (
                      <span className="px-1 text-muted small">{pg}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="btn btn-secondary-custom btn-sm px-3"
                data-testid="next-page-btn"
              >
                Next &gt;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
