import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRequester, status } = useRequester();
  const location = useLocation();

  if (status === "loading") {
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
