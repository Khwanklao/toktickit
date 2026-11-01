import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { apiClient } from "../lib/apiClient.js";
import { StatusBadge } from "./StatusBadge.js";
import { formatBangkokDateTime } from "../utils/date.js";

export interface RequesterMetrics {
  activeTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}

export interface RecentRequestItem {
  id: number;
  ticketNumber: string;
  summary: string;
  status: string;
  needsAttention: boolean;
  updatedAt: string;
}

export interface RequesterDashboardData {
  metrics: RequesterMetrics;
  recentRequests: RecentRequestItem[];
}

export const RequesterDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const dataRef = useRef<RequesterDashboardData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const latestRequestId = useRef(0);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    const currentRequestId = ++latestRequestId.current;

    if (isRefresh) {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      setRefreshing(true);
      setRefreshError(null);
    } else {
      setLoading(true);
    }

    try {
      const res = await apiClient.get<RequesterDashboardData>("/api/requester/dashboard");
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
    if (user && user.role === "REQUESTER") {
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

  if ((user && user.role !== "REQUESTER") || isForbidden) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center py-5" data-testid="access-restricted-screen">
        <div className="text-center p-5 surface-card rounded shadow-sm" style={{ maxWidth: "480px" }}>
          <div className="mb-3" style={{ fontSize: "3rem", color: "#DC2626" }}>⚠️</div>
          <h2 className="h4 font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-muted mb-4">You do not have permission to view this screen.</p>
          <Link to="/tickets" className="btn text-white" style={{ backgroundColor: "#1B4D3E" }}>
            Return to Tickets
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
          <span className="placeholder col-2 rounded" style={{ height: "38px", width: "110px" }}></span>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div className="col" key={i} data-testid="skeleton-card">
              <div className="surface-card p-3 rounded-3 border placeholder-glow">
                <span className="placeholder col-7 d-block mb-2" style={{ height: "14px" }}></span>
                <span className="placeholder col-4 d-block mb-2" style={{ height: "36px" }}></span>
                <span className="placeholder col-9 d-block" style={{ height: "12px" }}></span>
              </div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="row g-4">
          <div className="col-12 col-lg-8">
            <div className="surface-card p-4 rounded-3 border placeholder-glow">
              <span className="placeholder col-4 d-block mb-4" style={{ height: "24px" }}></span>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-3 border-bottom" data-testid="skeleton-row">
                  <span className="placeholder col-12 d-block mb-2" style={{ height: "18px" }}></span>
                  <span className="placeholder col-6 d-block" style={{ height: "14px" }}></span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="surface-card p-4 rounded-3 border placeholder-glow">
              <span className="placeholder col-6 d-block mb-4" style={{ height: "24px" }}></span>
              <span className="placeholder col-12 d-block mb-3" style={{ height: "42px" }}></span>
              <span className="placeholder col-12 d-block" style={{ height: "42px" }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Initial error state
  if (error && !data) {
    return (
      <div className="container-fluid max-width-1200 py-4 px-3 px-md-4" data-testid="requester-dashboard">
        <div className="callout-error mb-4 p-4 rounded-3 border d-flex align-items-center justify-content-between" role="alert" data-testid="dashboard-error">
          <div>
            <h2 className="h5 fw-bold mb-1 text-danger">Unable to load dashboard</h2>
            <p className="text-muted small mb-0">{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-danger"
            data-testid="dashboard-retry-btn"
            onClick={() => fetchDashboard(false)}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics ?? {
    activeTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
  };
  const recentRequests = data?.recentRequests ?? [];

  return (
    <div className="container-fluid max-width-1200 py-4 px-3 px-md-4" data-testid="requester-dashboard">
      {/* Refresh Error Banner (preserves data) */}
      {refreshError && (
        <div
          className="alert alert-warning alert-dismissible fade show d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          data-testid="refresh-error-banner"
        >
          <div className="d-flex align-items-center">
            <svg
              className="bi flex-shrink-0 me-2"
              width="20"
              height="20"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
            </svg>
            <div>{refreshError}</div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-dark ms-3"
            data-testid="refresh-retry-btn"
            onClick={() => fetchDashboard(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Greeting Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "#1A2E22" }}>
            Welcome, {user?.name}!
          </h1>
          <p className="text-muted small mb-0">Here's the latest on your requests.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          data-testid="refresh-dashboard-btn"
          aria-label="Refresh dashboard"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
        >
          {refreshing && (
            <span
              className="spinner-border spinner-border-sm text-secondary"
              role="status"
              aria-hidden="true"
            />
          )}
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Cards (1 row on desktop >= 1024px: row-cols-lg-4) */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
        {/* Card 1: Active Tickets */}
        <div className="col">
          <Link
            to="/tickets?group=open"
            className="surface-card p-3 rounded-3 border d-block text-decoration-none text-dark h-100 shadow-sm"
            data-testid="metric-card-active"
            aria-label={`Active tickets: ${metrics.activeTickets}, view all`}
            style={{
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              borderLeft: "4px solid #1B4D3E !important",
            }}
          >
            <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem" }}>
              Active Tickets
            </div>
            <div className="fs-2 fw-bold text-success mb-1">{metrics.activeTickets}</div>
            <div className="small text-muted" style={{ fontSize: "0.8125rem" }}>
              Submitted &amp; in progress
            </div>
          </Link>
        </div>

        {/* Card 2: In Progress */}
        <div className="col">
          <Link
            to="/tickets?status=IN_PROGRESS"
            className="surface-card p-3 rounded-3 border d-block text-decoration-none text-dark h-100 shadow-sm"
            data-testid="metric-card-in-progress"
            aria-label={`In progress tickets: ${metrics.inProgressTickets}, view all`}
            style={{
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              borderLeft: "4px solid #0369A1 !important",
            }}
          >
            <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem" }}>
              In Progress
            </div>
            <div className="fs-2 fw-bold text-primary mb-1">{metrics.inProgressTickets}</div>
            <div className="small text-muted" style={{ fontSize: "0.8125rem" }}>
              Under active investigation
            </div>
          </Link>
        </div>

        {/* Card 3: Resolved */}
        <div className="col">
          <Link
            to="/tickets?status=RESOLVED"
            className="surface-card p-3 rounded-3 border d-block text-decoration-none text-dark h-100 shadow-sm"
            data-testid="metric-card-resolved"
            aria-label={`Resolved tickets: ${metrics.resolvedTickets}, view all`}
            style={{
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              borderLeft: "4px solid #059669 !important",
            }}
          >
            <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem" }}>
              Resolved
            </div>
            <div className="fs-2 fw-bold text-success mb-1">{metrics.resolvedTickets}</div>
            <div className="small text-muted" style={{ fontSize: "0.8125rem" }}>
              Awaiting confirmation
            </div>
          </Link>
        </div>

        {/* Card 4: Closed */}
        <div className="col">
          <Link
            to="/tickets?status=CLOSED"
            className="surface-card p-3 rounded-3 border d-block text-decoration-none text-dark h-100 shadow-sm"
            data-testid="metric-card-closed"
            aria-label={`Closed tickets: ${metrics.closedTickets}, view all`}
            style={{
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              borderLeft: "4px solid #64748B !important",
            }}
          >
            <div className="small fw-semibold text-muted text-uppercase mb-1" style={{ fontSize: "0.75rem" }}>
              Closed
            </div>
            <div className="fs-2 fw-bold text-secondary mb-1">{metrics.closedTickets}</div>
            <div className="small text-muted" style={{ fontSize: "0.8125rem" }}>
              Past 30 days
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Area: Recent Requests Feed (2/3) + Quick Actions (1/3) */}
      <div className="row g-4">
        {/* Recent Requests Feed */}
        <div className="col-12 col-lg-8">
          <div className="surface-card p-4 rounded-3 border shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h2 className="h5 fw-bold mb-1" style={{ color: "#1A2E22" }}>
                  Recent Requests
                </h2>
                <p className="text-muted small mb-0">Your recently updated support requests</p>
              </div>
            </div>

            {recentRequests.length === 0 ? (
              <div className="text-center py-5" data-testid="recent-requests-empty">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
                  style={{ width: 56, height: 56, backgroundColor: "#EAF6EF", color: "#1B4D3E" }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <h3 className="h6 fw-bold mb-1">You haven't submitted any tickets yet.</h3>
                <p className="text-muted small mb-3">Submit your first request and our IT team will help you shortly.</p>
                <Link
                  to="/tickets/new"
                  className="btn btn-primary-green px-4 py-2"
                  data-testid="create-first-ticket-cta"
                >
                  + Create First Ticket
                </Link>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {recentRequests.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-3 border position-relative cursor-pointer transition-all ${
                      item.needsAttention ? "bg-amber-50" : "bg-white"
                    }`}
                    style={{
                      cursor: "pointer",
                      borderLeft: item.needsAttention ? "4px solid #D97706" : undefined,
                      backgroundColor: item.needsAttention ? "#FFFBEB" : "#FFFFFF",
                    }}
                    onClick={() => navigate(`/tickets/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/tickets/${item.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ticket ${item.ticketNumber}: ${item.summary}`}
                    data-testid={`recent-request-row-${item.id}`}
                  >
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="font-monospace fw-bold text-success fs-6">
                          {item.ticketNumber}
                        </span>
                        {item.needsAttention && (
                          <span
                            className="badge bg-warning text-dark fw-bold"
                            data-testid="badge-action-required"
                          >
                            Action Required
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-muted small">
                          {formatBangkokDateTime(item.updatedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="fw-semibold text-dark mb-1">{item.summary}</div>

                    {item.needsAttention && (
                      <p
                        className="small text-warning-emphasis fw-medium mb-0 mt-2 d-flex align-items-center gap-1"
                        data-testid="hint-action-required"
                      >
                        <span>💬</span> IT Staff is waiting for your reply. Add a comment.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-12 col-lg-4">
          <div className="surface-card p-4 rounded-3 border shadow-sm">
            <h2 className="h5 fw-bold mb-3" style={{ color: "#1A2E22" }}>
              Quick Actions
            </h2>
            <div className="d-flex flex-column gap-3">
              <Link
                to="/tickets/new"
                className="btn btn-primary-green d-flex align-items-center justify-content-center gap-2 py-2"
                data-testid="quick-action-create-ticket"
              >
                <span>+</span> Create Ticket
              </Link>
              <Link
                to="/tickets"
                className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2"
                data-testid="quick-action-my-tickets"
              >
                View My Tickets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
