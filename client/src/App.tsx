import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { RouteGuard } from "./components/RouteGuard.js";
import {
  MyTicketsPlaceholder,
  CreateTicketPlaceholder,
  TicketDetailPlaceholder,
} from "./components/PlaceholderScreens.js";
import "./index.css";

const ProtectedAppLayout: React.FC = () => {
  const { currentRequester } = useRequester();

  return (
    <RouteGuard>
      <AppShell>
        {/* Keying the page subtree on currentRequester.id ensures React unmounts & remounts on switch (BR-14) */}
        <div key={currentRequester?.id}>
          <Routes>
            <Route path="/tickets" element={<MyTicketsPlaceholder />} />
            <Route path="/tickets/new" element={<CreateTicketPlaceholder />} />
            <Route path="/tickets/:id" element={<TicketDetailPlaceholder />} />
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
    <RequesterProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </RequesterProvider>
  );
}
