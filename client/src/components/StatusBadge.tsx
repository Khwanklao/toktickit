import React from "react";

export type TicketStatusType = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = status.toUpperCase() as TicketStatusType;

  let bg = "#E0F2FE";
  let color = "#0369A1";
  let label = status;

  switch (normalizedStatus) {
    case "NEW":
      bg = "#E0F2FE";
      color = "#0369A1";
      label = "NEW";
      break;
    case "IN_PROGRESS":
      bg = "#D1FAE5";
      color = "#047857";
      label = "IN PROGRESS";
      break;
    case "RESOLVED":
      bg = "#EDE9FE";
      color = "#6D28D9";
      label = "RESOLVED";
      break;
    case "CLOSED":
      bg = "#F3F4F6";
      color = "#4B5563";
      label = "CLOSED";
      break;
    default:
      bg = "#F3F4F6";
      color = "#4B5563";
      label = status;
      break;
  }

  return (
    <span
      className="badge d-inline-flex align-items-center gap-1 font-monospace"
      style={{
        backgroundColor: bg,
        color: color,
        fontWeight: 600,
        fontSize: "0.75rem",
        padding: "4px 8px",
        borderRadius: "4px",
        letterSpacing: "0.02em",
      }}
      data-testid={`status-badge-${status}`}
    >
      {label}
    </span>
  );
};
