import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AppShell } from "./components/AppShell.js";
import { RouteGuard } from "./components/RouteGuard.js";
import { Login, getRoleHomePath } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { MyTickets } from "./components/MyTickets.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { TicketDetail } from "./components/TicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import { UserManagement } from "./components/UserManagement.js";
import { CheckSystem } from "./components/CheckSystem.js";
import "./index.css";

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex justify-content-center align-items-center py-5" data-testid="route-guard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Navigate to={getRoleHomePath(user.role)} replace />;
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/check-system" element={<CheckSystem />} />

      {/* Protected App Routes */}
      <Route
        path="/tickets"
        element={
          <RouteGuard allowedRoles={["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]}>
            <AppShell>
              <MyTickets />
            </AppShell>
          </RouteGuard>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <RouteGuard allowedRoles={["REQUESTER"]}>
            <AppShell>
              <CreateTicket />
            </AppShell>
          </RouteGuard>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RouteGuard allowedRoles={["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]}>
            <AppShell>
              <TicketDetail />
            </AppShell>
          </RouteGuard>
        }
      />
      <Route
        path="/staff/queue"
        element={
          <RouteGuard allowedRoles={["IT_STAFF", "ADMINISTRATOR"]}>
            <AppShell>
              <StaffTicketQueue />
            </AppShell>
          </RouteGuard>
        }
      />
      <Route
        path="/staff/tickets/:id"
        element={
          <RouteGuard allowedRoles={["IT_STAFF", "ADMINISTRATOR"]}>
            <AppShell>
              <StaffTicketDetail />
            </AppShell>
          </RouteGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RouteGuard allowedRoles={["ADMINISTRATOR"]}>
            <AppShell>
              <UserManagement />
            </AppShell>
          </RouteGuard>
        }
      />

      {/* Legacy selector fallback */}
      <Route path="/select-requester" element={<Navigate to="/login" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequesterProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RequesterProvider>
    </AuthProvider>
  );
}
