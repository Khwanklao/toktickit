import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/apiClient.js";
import { StatusBadge } from "./StatusBadge.js";
import { PriorityBadge } from "./PriorityBadge.js";
import { formatBangkokDateTime } from "../utils/date.js";

export interface DashboardMetrics {
  newTickets: number;
  openTickets: number;
  inProgressTickets: number;
  waitingRequesterTickets: number;
  myAssignedTickets: number;
}

export interface RecentQueueUpdate {
  id: number;
  ticketNumber: string;
  summary: string;
  status: string;
  itPriority: string;
  owner: { id: string; name: string } | null;
  updatedAt: string;
}

export interface StaffDashboardData {
  metrics: DashboardMetrics;
  recentQueueUpdates: RecentQueueUpdate[];
}

export const StaffDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<StaffDashboardData | null>(null);
  const dataRef = useRef<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const latestRequestId = useRef(0);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh && (isRefreshingRef.current || refreshing)) {
      return;
    }

    const currentRequestId = ++latestRequestId.current;

    if (isRefresh) {
      setRefreshing(true);
      isRefreshingRef.current = true;
    } else {
      setLoading(true);
    }

    try {
      const res = await apiClient.get<StaffDashboardData>("/api/staff/dashboard");
      if (currentRequestId !== latestRequestId.current) {
        return;
      }
      setData(res);
      dataRef.current = res;
      setError(null);
      setRefreshError(null);
      setIsForbidden(false);
      setIsUnauthorized(false);
    } catch (err: any) {
      if (currentRequestId !== latestRequestId.current) {
        return;
      }

      if (err?.status === 403 || err?.response?.status === 403) {
        setData(null);
        dataRef.current = null;
        setIsForbidden(true);
      } else if (err?.status === 401 || err?.response?.status === 401) {
        setData(null);
        dataRef.current = null;
        setIsUnauthorized(true);
      } else {
        if (isRefresh || dataRef.current !== null) {
          setRefreshError("Failed to refresh dashboard. The data shown may be out of date.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    } finally {
      if (currentRequestId === latestRequestId.current) {
        setLoading(false);
        setRefreshing(false);
        isRefreshingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== "REQUESTER") {
      fetchDashboard();
    }
  }, [user, fetchDashboard]);

  // Auth & Access Control
  if (!authLoading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (isUnauthorized) {
    return <Navigate to="/login" replace />;
  }

  if ((user && user.role === "REQUESTER") || isForbidden) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" data-testid="access-restricted-screen">
        <div className="text-center p-5 surface-card rounded shadow-sm" style={{ maxWidth: "480px" }}>
          <div className="mb-3" style={{ fontSize: "3rem", color: "#DC2626" }}>⚠️</div>
          <h2 className="h4 font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-muted mb-4">You do not have permission to view this screen.</p>
          <Link to="/tickets" className="btn text-white" style={{ backgroundColor: "#1B4D3E" }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Loading skeleton state
  if (loading && !data && !error) {
    return (
      <div className="container-fluid max-width-1200 py-4 px-3 px-md-4" data-testid="dashboard-loading" aria-busy="true">
        <span role="status" className="visually-hidden">Loading dashboard...</span>
        {/* Header Skeleton */}
        <div className="d-flex justify-content-between align-items-center mb-4 placeholder-glow">
          <div>
            <span className="placeholder col-6 d-block mb-2" style={{ height: "32px", width: "240px" }}></span>
            <span className="placeholder col-4 d-block" style={{ height: "16px", width: "320px" }}></span>
          </div>
          <span className="placeholder btn btn-sm px-4 py-2" style={{ width: "90px" }}></span>
        </div>

        {/* 5 Skeleton Cards */}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-3 mb-4 placeholder-glow">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="col">
              <div
                data-testid="skeleton-card"
                className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between"
                style={{ minHeight: "96px" }}
              >
                <span className="placeholder col-7 mb-2"></span>
                <span className="placeholder col-4" style={{ height: "28px" }}></span>
                <span className="placeholder col-5 mt-2"></span>
              </div>
            </div>
          ))}
        </div>

        {/* 4 Skeleton Rows */}
        <div className="surface-card bg-white p-4 rounded-3 border shadow-sm placeholder-glow">
          <span className="placeholder col-3 mb-4 d-block" style={{ height: "24px" }}></span>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              data-testid="skeleton-row"
              className="d-flex align-items-center justify-content-between py-3 border-bottom"
            >
              <span className="placeholder col-2"></span>
              <span className="placeholder col-4"></span>
              <span className="placeholder col-1"></span>
              <span className="placeholder col-1"></span>
              <span className="placeholder col-2"></span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metrics = data?.metrics ?? {
    newTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    waitingRequesterTickets: 0,
    myAssignedTickets: 0,
  };

  const recentQueueUpdates = data?.recentQueueUpdates ?? [];

  return (
    <div className="container-fluid max-width-1200 py-4 px-3 px-md-4">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A202C" }}>
            Welcome back, {user?.name || "Staff"}!
          </h1>
          <p className="text-muted small mb-0">Here's what's happening with your queue today.</p>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing || loading}
          className="btn btn-outline-success d-inline-flex align-items-center gap-2"
          data-testid="refresh-dashboard-btn"
          aria-label="Refresh dashboard"
        >
          {refreshing ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </>
          )}
        </button>
      </div>

      {/* Refresh Warning Alert Banner */}
      {refreshError && (
        <div
          role="alert"
          className="alert alert-warning d-flex align-items-center justify-content-between mb-4 p-3 rounded-3 shadow-sm"
        >
          <span>{refreshError}</span>
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="btn btn-sm btn-outline-warning ms-3 px-3 py-1 text-dark"
          >
            Retry
          </button>
        </div>
      )}

      {/* Initial Error Alert Banner */}
      {error && !data && (
        <div
          role="alert"
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 p-3 rounded-3 shadow-sm"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchDashboard(false)}
            className="btn btn-sm btn-outline-danger ms-3 px-3 py-1"
          >
            Retry
          </button>
        </div>
      )}

      {/* 5 Metric Cards */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-5 g-3 mb-4">
        {/* Card 1: New */}
        <div className="col">
          <Link
            to="/staff/queue?status=NEW"
            className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between text-decoration-none h-100 transition-hover"
            aria-label={`New tickets: ${metrics.newTickets}, view in queue`}
            data-testid="metric-card-new"
            style={{ minHeight: "96px" }}
          >
            <div className="text-muted small fw-medium mb-1">New</div>
            <div className="fs-3 fw-bold mb-1" style={{ color: "#4338CA" }}>
              {metrics.newTickets}
            </div>
            <div className="small fw-medium text-success d-flex align-items-center gap-1">
              <span>View in queue</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        </div>

        {/* Card 2: Open */}
        <div className="col">
          <Link
            to="/staff/queue?group=open"
            className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between text-decoration-none h-100 transition-hover"
            aria-label={`Open tickets: ${metrics.openTickets}, view in queue`}
            data-testid="metric-card-open"
            style={{ minHeight: "96px" }}
          >
            <div className="text-muted small fw-medium mb-1">Open</div>
            <div className="fs-3 fw-bold mb-1" style={{ color: "#1D4ED8" }}>
              {metrics.openTickets}
            </div>
            <div className="small fw-medium text-success d-flex align-items-center gap-1">
              <span>View in queue</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        </div>

        {/* Card 3: In Progress */}
        <div className="col">
          <Link
            to="/staff/queue?status=IN_PROGRESS"
            className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between text-decoration-none h-100 transition-hover"
            aria-label={`In progress tickets: ${metrics.inProgressTickets}, view in queue`}
            data-testid="metric-card-in-progress"
            style={{ minHeight: "96px" }}
          >
            <div className="text-muted small fw-medium mb-1">In Progress</div>
            <div className="fs-3 fw-bold mb-1" style={{ color: "#0F766E" }}>
              {metrics.inProgressTickets}
            </div>
            <div className="small fw-medium text-success d-flex align-items-center gap-1">
              <span>View in queue</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        </div>

        {/* Card 4: Waiting for Requester */}
        <div className="col">
          <Link
            to="/staff/queue?status=WAITING_FOR_REQUESTER"
            className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between text-decoration-none h-100 transition-hover"
            aria-label={`Waiting for requester tickets: ${metrics.waitingRequesterTickets}, view in queue`}
            data-testid="metric-card-waiting-requester"
            style={{ minHeight: "96px" }}
          >
            <div className="text-muted small fw-medium mb-1">Waiting for Requester</div>
            <div className="fs-3 fw-bold mb-1" style={{ color: "#B45309" }}>
              {metrics.waitingRequesterTickets}
            </div>
            <div className="small fw-medium text-success d-flex align-items-center gap-1">
              <span>View in queue</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        </div>

        {/* Card 5: My Assigned */}
        <div className="col">
          <Link
            to="/staff/queue?ownerId=me&activeOnly=true"
            className="surface-card bg-white p-3 rounded-3 border shadow-sm d-flex flex-column justify-content-between text-decoration-none h-100 transition-hover"
            aria-label={`My assigned tickets: ${metrics.myAssignedTickets}, view in queue`}
            data-testid="metric-card-my-assigned"
            style={{ minHeight: "96px" }}
          >
            <div className="text-muted small fw-medium mb-1">My Assigned</div>
            <div className="fs-3 fw-bold mb-1" style={{ color: "#1B4D3E" }}>
              {metrics.myAssignedTickets}
            </div>
            <div className="small fw-medium text-success d-flex align-items-center gap-1">
              <span>View in queue</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Row: Feed (2/3) + Quick Actions (1/3) */}
      <div className="row g-4">
        {/* Left: Recent Queue Updates Feed (2/3) */}
        <div className="col-12 col-lg-8">
          <div className="surface-card bg-white p-3 p-md-4 rounded-3 border shadow-sm h-100">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h2 className="h5 fw-bold mb-0" style={{ color: "#1A202C" }}>
                Recent Queue Updates
              </h2>
            </div>

            {recentQueueUpdates.length === 0 ? (
              <div
                data-testid="recent-updates-empty"
                className="text-center py-5 text-muted small"
              >
                No recent queue updates found.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr className="text-muted small" style={{ fontSize: "0.8125rem" }}>
                      <th scope="col" style={{ width: "16%" }}>Ticket No.</th>
                      <th scope="col" style={{ width: "34%" }}>Summary</th>
                      <th scope="col" style={{ width: "16%" }}>Status</th>
                      <th scope="col" style={{ width: "14%" }}>Priority</th>
                      <th scope="col" style={{ width: "20%" }}>Owner</th>
                      <th scope="col" style={{ minWidth: "140px" }}>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentQueueUpdates.map((ticket) => (
                      <tr
                        key={ticket.id}
                        data-testid={`recent-update-row-${ticket.id}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/staff/tickets/${ticket.id}`)}
                        className="transition-hover"
                      >
                        <td className="fw-medium text-success text-nowrap">
                          {ticket.ticketNumber}
                        </td>
                        <td className="text-truncate" style={{ maxWidth: "260px" }} title={ticket.summary}>
                          <span className="fw-medium text-dark">{ticket.summary}</span>
                        </td>
                        <td>
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td>
                          <PriorityBadge priority={ticket.itPriority} />
                        </td>
                        <td className="small text-muted text-nowrap">
                          {ticket.owner ? ticket.owner.name : "Unassigned"}
                        </td>
                        <td className="small text-muted text-nowrap">
                          {formatBangkokDateTime(ticket.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions (1/3) */}
        <div className="col-12 col-lg-4">
          <div className="surface-card bg-white p-3 p-md-4 rounded-3 border shadow-sm h-100">
            <h2 className="h5 fw-bold mb-3" style={{ color: "#1A202C" }}>
              Quick Actions
            </h2>
            <div className="d-flex flex-column gap-2">
              <Link
                to="/staff/queue?focus=search"
                state={{ focusSearch: true }}
                className="btn btn-outline-success d-flex align-items-center py-2 px-3 text-start shadow-none"
                data-testid="quick-action-search"
              >
                <svg
                  className="me-2 flex-shrink-0"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span className="fw-medium">Search Tickets</span>
              </Link>

              <Link
                to="/staff/queue?ownerId=me&activeOnly=true"
                className="btn btn-outline-secondary d-flex align-items-center py-2 px-3 text-start shadow-none"
                data-testid="quick-action-my-queue"
              >
                <svg
                  className="me-2 flex-shrink-0"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <polyline points="17 11 19 13 23 9" />
                </svg>
                <span className="fw-medium">My Queue</span>
              </Link>

              <Link
                to="/staff/queue"
                className="btn btn-outline-secondary d-flex align-items-center py-2 px-3 text-start shadow-none"
                data-testid="quick-action-ticket-queue"
              >
                <svg
                  className="me-2 flex-shrink-0"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span className="fw-medium">Ticket Queue</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
