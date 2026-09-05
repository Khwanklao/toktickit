import React from "react";
import { useParams, Link } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

// TODO: My Tickets issue - If a future data-fetching library (e.g. React Query or global cache) is added,
// explicit cache invalidation on requester switch can be hooked into context here if remount-by-key is insufficient.

export const MyTicketsPlaceholder: React.FC = () => {
  const { currentRequester } = useRequester();

  return (
    <div className="surface-card p-4 rounded shadow-sm" data-testid="my-tickets-placeholder">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="h3 mb-1">My Tickets</h1>
          <p className="text-muted small m-0">View and track all of your support requests.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary-green">
          + Create Ticket
        </Link>
      </div>

      <div className="alert alert-secondary mt-4">
        Showing tickets for <strong>{currentRequester?.name}</strong> ({currentRequester?.email}).
        <br />
        <span className="small text-muted">Placeholder screen for Issue 6 verification.</span>
      </div>
    </div>
  );
};

export const CreateTicketPlaceholder: React.FC = () => {
  const { currentRequester } = useRequester();

  return (
    <div className="surface-card p-4 rounded shadow-sm" data-testid="create-ticket-placeholder">
      <h1 className="h3 mb-3">Create Ticket</h1>
      <p className="text-muted mb-4">Submit a new support ticket.</p>

      <div className="alert alert-secondary">
        Ticket requester: <strong>{currentRequester?.name}</strong>
        <br />
        <span className="small text-muted">Placeholder form for Issue 6 verification.</span>
      </div>
    </div>
  );
};

export const TicketDetailPlaceholder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { currentRequester } = useRequester();

  return (
    <div className="surface-card p-4 rounded shadow-sm" data-testid="ticket-detail-placeholder">
      <h1 className="h3 mb-3">Ticket Details (ID: {id})</h1>
      <div className="alert alert-secondary">
        Viewing ticket #{id} as <strong>{currentRequester?.name}</strong>.
        <br />
        <span className="small text-muted">Placeholder detail view for Issue 6 verification.</span>
      </div>
    </div>
  );
};
