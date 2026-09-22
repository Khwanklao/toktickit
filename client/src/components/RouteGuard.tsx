import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";
import { useAuth } from "../context/AuthContext.js";
import { getStoredRequesterId } from "../lib/apiClient.js";

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRequester, status } = useRequester();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="route-guard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  // IT Staff and Administrators or staff routes do not require a requester selection
  if (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR" || location.pathname.startsWith("/staff")) {
    return <>{children}</>;
  }

  const storedId = getStoredRequesterId();
  if (status === "loading" || (status === "idle" && storedId)) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="route-guard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!currentRequester) {
    return <Navigate to="/select-requester" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
