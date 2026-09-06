import React, { useState, useEffect, useRef } from "react";
import { Category } from "../api.js";

interface TicketFilterToolbarProps {
  categories: Category[];
  search: string;
  categoryId: string;
  priority: string;
  status: string;
  sortBy: string;
  sortDir: string;
  onSearchChange: (newSearch: string) => void;
  onCategoryChange: (newCatId: string) => void;
  onPriorityChange: (newPriority: string) => void;
  onStatusChange: (newStatus: string) => void;
  onSortByChange: (newSortBy: string) => void;
  onSortDirChange: (newSortDir: string) => void;
  onClearFilters: () => void;
}

export const TicketFilterToolbar: React.FC<TicketFilterToolbarProps> = ({
  categories,
  search,
  categoryId,
  priority,
  status,
  sortBy,
  sortDir,
  onSearchChange,
  onCategoryChange,
  onPriorityChange,
  onStatusChange,
  onSortByChange,
  onSortDirChange,
  onClearFilters,
}) => {
  const [searchInput, setSearchInput] = useState(search);
  const isFirstRender = useRef(true);

  // Sync internal search input state if external search prop changes (e.g. Clear Filters clicked)
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Debounce search input (~300ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange, search]);

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    categoryId !== "" ||
    priority !== "" ||
    status !== "" ||
    sortBy !== "createdAt" ||
    sortDir !== "desc";

  return (
    <div className="surface-card p-3 mb-4 rounded-3 border shadow-sm" data-testid="filter-toolbar">
      <div className="row g-2 align-items-center">
        {/* Search input (matches ticketNumber or summary) */}
        <div className="col-12 col-md-4">
          <div className="input-group">
            <span className="input-group-text bg-white text-muted border-end-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              id="ticket-search-input"
              data-testid="ticket-search-input"
              className="form-select border-start-0 ps-0"
              style={{ height: 40 }}
              placeholder="Search by ticket number or summary..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* Category filter dropdown */}
        <div className="col-6 col-md-2">
          <select
            id="category-filter-select"
            data-testid="category-filter-select"
            className="form-select"
            style={{ height: 40 }}
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by Category"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority filter dropdown */}
        <div className="col-6 col-md-2">
          <select
            id="priority-filter-select"
            data-testid="priority-filter-select"
            className="form-select"
            style={{ height: 40 }}
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            aria-label="Filter by Priority"
          >
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>

        {/* Status filter dropdown */}
        <div className="col-6 col-md-2">
          <select
            id="status-filter-select"
            data-testid="status-filter-select"
            className="form-select"
            style={{ height: 40 }}
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by Status"
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>

        {/* Mobile / General Sort control */}
        <div className="col-6 col-md-2 d-flex align-items-center gap-1">
          <select
            id="sort-by-select"
            data-testid="sort-by-select"
            className="form-select text-truncate"
            style={{ height: 40 }}
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            aria-label="Sort by field"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Last Updated</option>
            <option value="ticketNumber">Ticket Number</option>
          </select>

          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
            style={{ height: 40, minWidth: 40 }}
            data-testid="sort-dir-btn"
            onClick={() => onSortDirChange(sortDir === "desc" ? "asc" : "desc")}
            title={`Sort ${sortDir === "desc" ? "Descending" : "Ascending"}`}
            aria-label={`Sort direction ${sortDir}`}
          >
            {sortDir === "desc" ? "▼" : "▲"}
          </button>
        </div>
      </div>

      {/* Clear Filters action line (visible only when filters active) */}
      {hasActiveFilters && (
        <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
          <span className="small text-muted">Active filters applied</span>
          <button
            type="button"
            className="btn btn-sm btn-link text-danger text-decoration-none p-0 fw-medium"
            data-testid="clear-filters-btn"
            onClick={() => {
              setSearchInput("");
              onClearFilters();
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
