import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRequester } = useRequester();
  const location = useLocation();

  const isMyTicketsActive = location.pathname === "/tickets";
  const isCreateTicketActive = location.pathname === "/tickets/new";

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
      {/* Top Header Bar (#006B3C) */}
      <header className="app-header shadow-sm" style={{ backgroundColor: "#006B3C", color: "#FFFFFF" }}>
        <div className="container-fluid max-width-1200 d-flex flex-wrap align-items-center justify-content-between py-2 px-3">
          {/* Logo */}
          <Link to="/tickets" className="d-flex align-items-center text-white text-decoration-none me-4">
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
            <Link
              to="/tickets"
              className={`nav-link text-white ${isMyTicketsActive ? "active" : ""}`}
              style={{
                backgroundColor: isMyTicketsActive ? "#0B7A46" : "transparent",
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
                backgroundColor: isCreateTicketActive ? "#0B7A46" : "transparent",
                borderRadius: "4px",
                padding: "6px 12px",
              }}
            >
              Create Ticket
            </Link>
          </nav>

          {/* Development Requester identity pill */}
          <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
            {currentRequester ? (
              <div
                className="d-flex align-items-center gap-2 px-3 py-1 text-white rounded-pill"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.15)", fontSize: "0.875rem" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="fw-medium">{currentRequester.name}</span>
                <span className="text-white-50">({currentRequester.department})</span>
              </div>
            ) : (
              <span className="badge bg-warning text-dark">No Requester Selected</span>
            )}
            <Link
              to="/select-requester"
              className="btn btn-sm text-white border-white"
              style={{ fontSize: "0.8125rem", borderRadius: "4px" }}
            >
              Change Requester
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area: ใช้ container-fluid max-width-1200 px-3 เพื่อให้แนวขอบซ้ายตรงกับ Header พอดี */}
      <main className="flex-grow-1 container-fluid max-width-1200 py-4 px-3">
        {children}
      </main>
    </div>
  );
};