import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/apiClient.js";
import { Category } from "../api.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { TicketFilterToolbar } from "./TicketFilterToolbar.js";
import { PaginationFooter } from "./PaginationFooter.js";

export interface TicketListItem {
  id: number;
  ticketNumber: string;
  summary: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: string;
  itPriority: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export const MyTickets: React.FC = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Filters & Sorting state
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await apiClient.get<Category[]>("/api/categories");
        setCategories(data);
      } catch (_) {
        // Fallback gracefully if categories fetch fails
      }
    }
    loadCategories();
  }, []);

  // Fetch tickets function
  const fetchTickets = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (categoryId) params.append("categoryId", categoryId);
      if (priority) params.append("priority", priority);
      if (statusFilter) params.append("status", statusFilter);
      if (sortBy) params.append("sortBy", sortBy);
      if (sortDir) params.append("sortDir", sortDir);
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const res = await apiClient.fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch tickets.");
      }
      const json = await res.json();
      setTickets(json.data || []);
      setPagination(
        json.pagination || {
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
        }
      );
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Unable to connect to TokTickIT API";
      setErrorMessage(msg);
    }
  }, [search, categoryId, priority, statusFilter, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const hasSearchOrFilters =
    search.trim().length > 0 || categoryId !== "" || priority !== "" || statusFilter !== "";

  const handleClearFilters = () => {
    setSearch("");
    setCategoryId("");
    setPriority("");
    setStatusFilter("");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  };

  const handleSortHeaderClick = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(1);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (_) {
      return isoString;
    }
  };

  return (
    <div className="my-tickets-screen" data-testid="my-tickets-screen">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1 fw-bold" style={{ color: "#1A2E22" }}>
            My Tickets
          </h1>
          <p className="text-muted small m-0">View and track all of your support requests.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary-green d-flex align-items-center gap-1">
          <span>+</span> Create Ticket
        </Link>
      </div>

      {/* Filter Toolbar */}
      <TicketFilterToolbar
        categories={categories}
        search={search}
        categoryId={categoryId}
        priority={priority}
        status={statusFilter}
        sortBy={sortBy}
        sortDir={sortDir}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        onCategoryChange={(val) => {
          setCategoryId(val);
          setPage(1);
        }}
        onPriorityChange={(val) => {
          setPriority(val);
          setPage(1);
        }}
        onStatusChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onSortByChange={(val) => {
          setSortBy(val);
          setPage(1);
        }}
        onSortDirChange={(val) => {
          setSortDir(val);
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
      />

      {/* API Failure State */}
      {status === "error" && (
        <div
          className="callout-error mb-4 d-flex align-items-center justify-content-between"
          data-testid="api-error-banner"
          role="alert"
        >
          <div>
            <div className="fw-semibold">Unable to load tickets</div>
            <div className="small">{errorMessage || "An error occurred while fetching your tickets."}</div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-testid="retry-btn"
            onClick={fetchTickets}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {status === "loading" && (
        <div data-testid="loading-state" className="surface-card p-4 rounded-3 shadow-sm text-center py-5">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <div className="text-muted small">Loading support tickets...</div>
        </div>
      )}

      {/* Success State */}
      {status === "success" && (
        <>
          {/* State 1: Empty State (Zero tickets overall, NO search/filter params sent) (UI-05, BR-12, AC-08) */}
          {tickets.length === 0 && !hasSearchOrFilters && (
            <div
              className="surface-card bg-white p-5 rounded-3 border text-center shadow-sm my-4"
              data-testid="empty-state"
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 64, height: 64, backgroundColor: "#EAF6EF", color: "#006B3C" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className="h4 fw-bold mb-2">No tickets found</h2>
              <p className="text-muted small mb-4" style={{ maxWidth: 420, margin: "0 auto" }}>
                No tickets found. Create your first support ticket to get started.
              </p>
              <Link to="/tickets/new" className="btn btn-primary-green px-4 py-2" data-testid="create-ticket-cta">
                + Create Ticket
              </Link>
            </div>
          )}

          {/* State 2: No-Results State (Tickets exist but filter matches none) (UI-06, BR-12, AC-09) */}
          {tickets.length === 0 && hasSearchOrFilters && (
            <div
              className="surface-card bg-white p-5 rounded-3 border text-center shadow-sm my-4"
              data-testid="no-results-state"
            >
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                style={{ width: 64, height: 64, backgroundColor: "#EFF8FF", color: "#0369A1" }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <h2 className="h4 fw-bold mb-2">No results found</h2>
              <p className="text-muted small mb-4" style={{ maxWidth: 420, margin: "0 auto" }}>
                No tickets match your search or filter criteria.
              </p>
              <button
                type="button"
                className="btn btn-secondary-custom px-4 py-2"
                data-testid="no-results-clear-filters-cta"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* State 3: Populated List State */}
          {tickets.length > 0 && (
            <>
              {/* Desktop Table View (≥992px) */}
              <div className="d-none d-lg-block surface-card rounded-3 border overflow-hidden shadow-sm">
                <table className="table table-hover align-middle mb-0" data-testid="desktop-ticket-table">
                  <thead className="table-light">
                    <tr>
                      <th
                        scope="col"
                        className="py-3 px-3 cursor-pointer text-uppercase small"
                        style={{ width: "16%", color: "#5A6E63", fontSize: "0.75rem" }}
                        onClick={() => handleSortHeaderClick("ticketNumber")}
                      >
                        <div className="d-flex align-items-center gap-1">
                          Ticket No
                          {sortBy === "ticketNumber" && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-3 cursor-pointer text-uppercase small"
                        style={{ width: "14%", color: "#5A6E63", fontSize: "0.75rem" }}
                        onClick={() => handleSortHeaderClick("createdAt")}
                      >
                        <div className="d-flex align-items-center gap-1">
                          Created Date
                          {sortBy === "createdAt" && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
                        </div>
                      </th>
                      <th scope="col" className="py-3 px-3 text-uppercase small" style={{ width: "26%", color: "#5A6E63", fontSize: "0.75rem" }}>
                        Summary
                      </th>
                      <th scope="col" className="py-3 px-3 text-uppercase small" style={{ width: "14%", color: "#5A6E63", fontSize: "0.75rem" }}>
                        Category
                      </th>
                      <th scope="col" className="py-3 px-3 text-uppercase small" style={{ width: "10%", color: "#5A6E63", fontSize: "0.75rem" }}>
                        Priority
                      </th>
                      <th scope="col" className="py-3 px-3 text-uppercase small" style={{ width: "10%", color: "#5A6E63", fontSize: "0.75rem" }}>
                        Status
                      </th>
                      <th
                        scope="col"
                        className="py-3 px-3 cursor-pointer text-uppercase small"
                        style={{ width: "10%", color: "#5A6E63", fontSize: "0.75rem" }}
                        onClick={() => handleSortHeaderClick("updatedAt")}
                      >
                        <div className="d-flex align-items-center gap-1">
                          Updated
                          {sortBy === "updatedAt" && <span>{sortDir === "desc" ? "▼" : "▲"}</span>}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr
                        key={t.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        data-testid={`ticket-row-${t.id}`}
                      >
                        <td className="py-3 px-3 fw-bold text-success font-monospace">
                          {t.ticketNumber}
                        </td>
                        <td className="py-3 px-3 text-muted small">{formatDate(t.createdAt)}</td>
                        <td className="py-3 px-3 text-dark font-weight-medium">{t.summary}</td>
                        <td className="py-3 px-3 text-muted small">{t.category?.name || "N/A"}</td>
                        <td className="py-3 px-3">
                          <PriorityBadge priority={t.requestedPriority} />
                        </td>
                        <td className="py-3 px-3">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="py-3 px-3 text-muted small">{formatDate(t.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View (<992px) */}
              <div className="d-block d-lg-none" data-testid="mobile-ticket-cards">
                <div className="d-flex flex-column gap-3">
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="surface-card bg-white p-3 rounded-3 border shadow-sm"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      data-testid={`ticket-card-${t.id}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="fw-bold text-success font-monospace fs-6">
                          {t.ticketNumber}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>

                      <h2 className="h6 fw-semibold text-dark mb-2">{t.summary}</h2>

                      <div className="d-flex flex-wrap align-items-center justify-content-between text-muted small pt-2 border-top gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <span>{t.category?.name || "N/A"}</span>
                          <span>•</span>
                          <PriorityBadge priority={t.requestedPriority} />
                        </div>
                        <span className="text-muted small">{formatDate(t.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination Footer */}
              <PaginationFooter
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => setPage(newPage)}
                onPageSizeChange={(newPageSize) => {
                  setPageSize(newPageSize);
                  setPage(1);
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};
