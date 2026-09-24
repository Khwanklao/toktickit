import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";
import { RoleBadge } from "./RoleBadge.js";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRequester } = useRequester();
  const { user } = useAuth();
  const location = useLocation();

  const isMyTicketsActive = location.pathname === "/tickets";
  const isCreateTicketActive = location.pathname === "/tickets/new";
  const isQueueActive = location.pathname === "/staff/queue";
  const isUserMgmtActive = location.pathname === "/admin/users";

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
      {/* 1. Header Bar */}
      <header className="shadow-sm w-100" style={{ backgroundColor: "#1B4D3E", color: "#FFFFFF" }}>
        <div className="container-fluid px-4 py-2 d-flex flex-wrap align-items-center justify-content-between">
          {/* Logo */}
          <Link to={user?.role === "ADMINISTRATOR" ? "/admin/users" : user?.role === "IT_STAFF" ? "/staff/queue" : "/tickets"} className="d-flex align-items-center text-white text-decoration-none me-4">
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

          {/* Nav links */}
          <nav className="d-flex align-items-center gap-2 me-auto">
            {user?.role === "ADMINISTRATOR" ? (
              <>
                <Link
                  to="/admin/users"
                  className={`nav-link text-white ${isUserMgmtActive ? "active" : ""}`}
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
                  className={`nav-link text-white ${isQueueActive ? "active" : ""}`}
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
            ) : user?.role === "IT_STAFF" ? (
              <Link
                to="/staff/queue"
                className={`nav-link text-white ${isQueueActive ? "active" : ""}`}
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
                  className={`nav-link text-white ${isMyTicketsActive ? "active" : ""}`}
                  style={{
                    backgroundColor: isMyTicketsActive ? "#153C30" : "transparent",
                    borderRadius: "4px",
                    padding: "6px 12px",
                  }}
                >
                  My Tickets
                </Link>
                <Link
                  to="/tickets/new"
                  className={`nav-link text-white ${isCreateTicketActive ? "active" : ""}`}
                  style={{
                    backgroundColor: isCreateTicketActive ? "#153C30" : "transparent",
                    borderRadius: "4px",
                    padding: "6px 12px",
                  }}
                >
                  Create Ticket
                </Link>
              </>
            )}
          </nav>

          {/* User / Requester Identity */}
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            {user ? (
              <div
                className="d-flex align-items-center gap-2 px-3 py-1 text-white rounded-pill"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", fontSize: "0.875rem" }}
              >
                <span className="fw-medium">{user.name}</span>
                <RoleBadge role={user.role} />
              </div>
            ) : currentRequester ? (
              <div
                className="d-flex align-items-center gap-2 px-3 py-1 text-white rounded-pill"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", fontSize: "0.875rem" }}
              >
                <span className="fw-medium">{currentRequester.name}</span>
                <span className="text-white-50">({currentRequester.department})</span>
              </div>
            ) : (
              <span className="badge bg-warning text-dark">No User Selected</span>
            )}
            {!user && (
              <Link
                to="/select-requester"
                className="btn btn-sm text-white border-white"
                style={{ fontSize: "0.8125rem", borderRadius: "4px" }}
              >
                Change Requester
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Area: ใช้ container-fluid px-4 ให้ตรงกับ Header เพื่อดึงรูปบ้านไปชิดซ้ายสุด */}
      <main className="flex-grow-1 w-100">
        <div className="container-fluid px-4 py-4">
          {children}
        </div>
      </main>
    </div>
  );
};