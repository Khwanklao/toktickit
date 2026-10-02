import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";
import { RoleBadge } from "./RoleBadge.js";
import { getRoleHomePath } from "./Login.js";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isMyTicketsActive = location.pathname === "/tickets";
  const isCreateTicketActive = location.pathname === "/tickets/new";
  const isQueueActive = location.pathname === "/staff/queue";
  const isUserMgmtActive = location.pathname === "/admin/users";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const homePath = user ? getRoleHomePath(user.role) : "/login";

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F8F9FA" }}>
      {/* Header Bar */}
      <header className="shadow-sm w-100" style={{ backgroundColor: "#1B4D3E", color: "#FFFFFF" }}>
        <div className="container-fluid px-4 py-2 d-flex flex-wrap align-items-center justify-content-between">
          {/* Logo */}
          <Link to={homePath} className="d-flex align-items-center text-white text-decoration-none me-4">
            <svg
              className="me-2"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="fw-bold fs-5">TokTickIT</span>
          </Link>

          {/* Navigation Links based on User Role */}
          {user && (
            <nav className="d-flex align-items-center gap-2 me-auto my-1 my-md-0">
              {user.role === "ADMINISTRATOR" ? (
                <>
                  <Link
                    to="/admin/users"
                    className={`nav-link text-white ${isUserMgmtActive ? "active fw-bold" : ""}`}
                    style={{
                      backgroundColor: isUserMgmtActive ? "#153C30" : "transparent",
                      borderRadius: "4px",
                      padding: "6px 12px",
                    }}
                    data-testid="nav-user-management"
                  >
                    User Management
                  </Link>
                  <Link
                    to="/staff/queue"
                    className={`nav-link text-white ${isQueueActive ? "active fw-bold" : ""}`}
                    style={{
                      backgroundColor: isQueueActive ? "#153C30" : "transparent",
                      borderRadius: "4px",
                      padding: "6px 12px",
                    }}
                    data-testid="nav-ticket-queue-audit"
                  >
                    Ticket Queue (Audit)
                  </Link>
                </>
              ) : user.role === "IT_STAFF" ? (
                <Link
                  to="/staff/queue"
                  className={`nav-link text-white ${isQueueActive ? "active fw-bold" : ""}`}
                  style={{
                    backgroundColor: isQueueActive ? "#153C30" : "transparent",
                    borderRadius: "4px",
                    padding: "6px 12px",
                  }}
                  data-testid="nav-my-queue"
                >
                  My Queue
                </Link>
              ) : (
                <>
                  <Link
                    to="/tickets"
                    className={`nav-link text-white ${isMyTicketsActive ? "active fw-bold" : ""}`}
                    style={{
                      backgroundColor: isMyTicketsActive ? "#153C30" : "transparent",
                      borderRadius: "4px",
                      padding: "6px 12px",
                    }}
                    data-testid="nav-my-tickets"
                  >
                    My Tickets
                  </Link>
                  <Link
                    to="/tickets/new"
                    className={`nav-link text-white ${isCreateTicketActive ? "active fw-bold" : ""}`}
                    style={{
                      backgroundColor: isCreateTicketActive ? "#153C30" : "transparent",
                      borderRadius: "4px",
                      padding: "6px 12px",
                    }}
                    data-testid="nav-create-ticket"
                  >
                    + Create Ticket
                  </Link>
                </>
              )}
            </nav>
          )}

          {/* Logged-in User Identity & Logout Action */}
          {user && (
            <div className="d-flex align-items-center gap-3 ms-auto ms-md-0 my-1 my-md-0">
              <div
                className="d-flex align-items-center gap-2 px-3 py-1 text-white rounded-pill"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", fontSize: "0.875rem" }}
                data-testid="user-identity-pill"
              >
                <span className="fw-medium">{user.name}</span>
                <span className="text-white-50 small d-none d-lg-inline">({user.email})</span>
                <RoleBadge role={user.role} />
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-sm text-white-50 text-hover-white border-0 p-0 me-1"
                style={{ fontSize: "0.875rem" }}
                data-testid="logout-button"
                title="Sign Out"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 w-100">
        <div className="container-fluid px-4 py-4">{children}</div>
      </main>
    </div>
  );
};