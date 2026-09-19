import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { RouteGuard } from "./components/RouteGuard.js";
import { MyTickets } from "./components/MyTickets.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { TicketDetail } from "./components/TicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import "./index.css";

const ProtectedAppLayout: React.FC = () => {
  const { currentRequester } = useRequester();

  return (
    <RouteGuard>
      <AppShell>
        <div key={currentRequester?.id}>
          <Routes>
            <Route path="/tickets" element={<MyTickets />} />
            <Route path="/tickets/new" element={<CreateTicket />} />
            <Route path="/tickets/:id" element={<TicketDetail />} />
            <Route path="/staff/queue" element={<StaffTicketQueue />} />
            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
            <Route path="*" element={<Navigate to="/tickets" replace />} />
          </Routes>
        </div>
      </AppShell>
    </RouteGuard>
  );
};

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/select-requester" element={<AppShell><RequesterSelector /></AppShell>} />
      <Route path="/*" element={<ProtectedAppLayout />} />
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
