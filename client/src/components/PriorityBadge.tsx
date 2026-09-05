import React from "react";

export type TicketPriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface PriorityBadgeProps {
  priority: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const normalizedPriority = priority.toUpperCase() as TicketPriorityType;

  let bg = "#DCFCE7";
  let color = "#166534";
  let label = priority;

  switch (normalizedPriority) {
    case "LOW":
      bg = "#DCFCE7";
      color = "#166534";
      label = "LOW";
      break;
    case "MEDIUM":
      bg = "#FEF3C7";
      color = "#92400E";
      label = "MEDIUM";
      break;
    case "HIGH":
      bg = "#FFEDD5";
      color = "#C2410C";
      label = "HIGH";
      break;
    case "URGENT":
      bg = "#FEE2E2";
      color = "#991B1B";
      label = "URGENT";
      break;
    default:
      bg = "#F3F4F6";
      color = "#4B5563";
      label = priority;
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
      data-testid={`priority-badge-${priority}`}
    >
      {label}
    </span>
  );
};
