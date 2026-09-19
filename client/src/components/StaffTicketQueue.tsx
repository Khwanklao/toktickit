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
  const [staffUsers, setStaffUsers] = useState<Array<{ id: string; name: string }>>([]);

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

  // Load categories & potential owners on mount
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6" data-testid="forbidden-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">You do not have permission to view the IT Staff Queue.</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-[#1B4D3E] text-white rounded hover:bg-[#153C30]"
        >
          Return Home
        </button>
      </div>
    );
  }

  const startRecord = (pagination.page - 1) * pagination.limit + 1;
  const endRecord = Math.min(pagination.page * pagination.limit, pagination.totalRecords);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Role Audit Notice */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1A202C]">
            {user?.role === "ADMINISTRATOR" ? "IT Staff Ticket Queue (Audit Mode)" : "IT Staff Ticket Queue"}
          </h1>
          <p className="text-sm text-[#718096]">
            {user?.role === "ADMINISTRATOR"
              ? "Read-only access for administrative auditing and monitoring."
              : "Search, filter, and manage support tickets."}
          </p>
        </div>
      </div>

      {/* Network Error Alert */}
      {error && (
        <div
          className="p-4 rounded-md bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-between"
          data-testid="queue-error-alert"
        >
          <span>{error}</span>
          <button
            onClick={fetchQueue}
            className="px-3 py-1 bg-[#DC2626] text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filter Controls Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Field */}
          <div className="relative lg:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket number or summary..."
              className="w-full pl-9 pr-3 py-2 border border-[#E2E8F0] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
              data-testid="search-input"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border border-[#E2E8F0] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            data-testid="filter-category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* IT Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="w-full p-2 border border-[#E2E8F0] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            data-testid="filter-priority"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full p-2 border border-[#E2E8F0] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
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

          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="w-full p-2 border border-[#E2E8F0] rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
            data-testid="filter-owner"
          >
            <option value="">All Owners</option>
            <option value="unassigned">Unassigned</option>
            <option value="me">Assigned to Me</option>
          </select>
        </div>

        {/* Counter & Clear Filters Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#718096] pt-2 border-t border-[#F1F3F2] gap-2">
          <span data-testid="result-counter">
            {pagination.totalRecords > 0
              ? `Showing ${startRecord} to ${endRecord} of ${pagination.totalRecords} tickets`
              : "0 tickets found"}
          </span>
          {(search || selectedCategory || selectedPriority || selectedStatus || selectedOwner) && (
            <button
              onClick={clearFilters}
              className="text-[#1B4D3E] font-semibold hover:underline self-start sm:self-auto"
              data-testid="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Data Content Area */}
      {loading ? (
        <div className="space-y-3" data-testid="queue-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 animate-pulse rounded-md" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        debouncedSearch || selectedCategory || selectedPriority || selectedStatus || selectedOwner ? (
          /* No-Results State */
          <div className="bg-white p-12 text-center rounded-lg border border-[#E2E8F0]" data-testid="no-results-state">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-[#1A202C]">No tickets found matching your criteria</h3>
            <p className="text-sm text-[#718096] mt-1 mb-4">Try adjusting your filter selections or search terms.</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-[#1B4D3E] text-white text-sm font-medium rounded hover:bg-[#153C30]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Empty State (No tickets in system at all) */
          <div className="bg-white p-12 text-center rounded-lg border border-[#E2E8F0]" data-testid="empty-state">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-[#1A202C]">No tickets currently in queue</h3>
            <p className="text-sm text-[#718096] mt-1">There are no support tickets in the database.</p>
          </div>
        )
      ) : (
        <>
          {/* Desktop Table View (≥ 768px / lg) */}
          <div className="hidden md:block bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse" data-testid="desktop-queue-table">
              <thead>
                <tr className="bg-[#F1F3F2] text-[#1A202C] text-xs font-semibold uppercase tracking-wider border-b border-[#E2E8F0]">
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("ticketNumber")}
                    data-testid="header-ticket-number"
                  >
                    Ticket No. {sortBy === "ticketNumber" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("createdAt")}
                    data-testid="header-created-at"
                  >
                    Created Date {sortBy === "createdAt" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="p-3">Summary</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Req. Priority</th>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("itPriority")}
                    data-testid="header-it-priority"
                  >
                    IT Priority {sortBy === "itPriority" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th
                    className="p-3 cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort("status")}
                    data-testid="header-status"
                  >
                    Status {sortBy === "status" && (sortOrder === "asc" ? "▲" : "▼")}
                  </th>
                  <th className="p-3">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/staff/tickets/${t.id}`)}
                    className="hover:bg-[#F7FAF8] cursor-pointer transition-colors duration-150"
                    data-testid={`queue-row-${t.id}`}
                  >
                    <td className="p-3 font-semibold text-[#1B4D3E] whitespace-nowrap">{t.ticketNumber}</td>
                    <td className="p-3 text-[#718096] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium text-[#1A202C] max-w-xs truncate">{t.summary || t.title}</td>
                    <td className="p-3 text-[#718096]">{t.category?.name}</td>
                    <td className="p-3">
                      <PriorityBadge priority={t.requestedPriority} />
                    </td>
                    <td className="p-3">
                      <PriorityBadge priority={t.itPriority || t.requestedPriority} />
                    </td>
                    <td className="p-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="p-3 text-xs text-[#718096]">
                      {t.owner ? (
                        <span className="font-medium text-[#1A202C]">{t.owner.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden space-y-3" data-testid="mobile-ticket-list">
            {tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/staff/tickets/${t.id}`)}
                className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm cursor-pointer hover:border-[#1B4D3E] transition-all"
                data-testid="mobile-ticket-card"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-[#1B4D3E] text-sm">{t.ticketNumber}</span>
                  <StatusBadge status={t.status} />
                </div>
                <h4 className="font-semibold text-[#1A202C] text-base mb-2 line-clamp-2">{t.summary || t.title}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#718096] mb-3">
                  <div>Category: <span className="text-[#1A202C]">{t.category?.name}</span></div>
                  <div>IT Priority: <PriorityBadge priority={t.itPriority || t.requestedPriority} /></div>
                </div>
                <div className="flex justify-between items-center text-xs text-[#718096] pt-2 border-t border-[#F1F3F2]">
                  <span>Owner: {t.owner ? t.owner.name : "Unassigned"}</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-[#E2E8F0] text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                data-testid="prev-page-btn"
              >
                &lt; Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 text-xs font-semibold rounded-full ${
                      pg === currentPage
                        ? "bg-[#1B4D3E] text-white"
                        : "text-[#1A202C] hover:bg-gray-100"
                    }`}
                  >
                    {pg}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-3 py-1.5 border border-[#E2E8F0] text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
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
