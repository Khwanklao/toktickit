import React from "react";

export type TicketStatusType =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalizedStatus = (status || "").toUpperCase() as TicketStatusType;

  let bg = "#F1F5F9";
  let color = "#475569";
  let label: string = status;

  switch (normalizedStatus) {
    case "NEW":
      bg = "#E0E7FF";
      color = "#4338CA";
      label = "New";
      break;
    case "OPEN":
      bg = "#DBEAFE";
      color = "#1D4ED8";
      label = "Open";
      break;
    case "IN_PROGRESS":
      bg = "#CCFBF1";
      color = "#0F766E";
      label = "In Progress";
      break;
    case "WAITING_FOR_REQUESTER":
      bg = "#FEF3C7";
      color = "#B45309";
      label = "Waiting for Requester";
      break;
    case "RESOLVED":
      bg = "#DCFCE7";
      color = "#15803D";
      label = "Resolved";
      break;
    case "CLOSED":
      bg = "#F1F5F9";
      color = "#475569";
      label = "Closed";
      break;
    case "REOPENED":
      bg = "#FAE8FF";
      color = "#86198F";
      label = "Reopened";
      break;
    case "CANCELLED":
      bg = "#FEE2E2";
      color = "#991B1B";
      label = "Cancelled";
      break;
    default:
      bg = "#F1F5F9";
      color = "#475569";
      label = status;
      break;
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{
        backgroundColor: bg,
        color: color,
        borderRadius: "9999px",
        padding: "2px 10px",
        fontSize: "0.75rem",
        fontWeight: 700,
        display: "inline-block",
      }}
      data-testid={`status-badge-${status}`}
    >
      {label}
    </span>
  );
};
