import React from "react";

export type TicketPriorityType = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface PriorityBadgeProps {
  priority: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const normalizedPriority = (priority || "").toUpperCase() as TicketPriorityType;

  let bg = "#F1F5F9";
  let color = "#475569";
  let label: string = priority;

  switch (normalizedPriority) {
    case "LOW":
      bg = "#F1F5F9";
      color = "#475569";
      label = "Low";
      break;
    case "MEDIUM":
      bg = "#FEF3C7";
      color = "#B45309";
      label = "Medium";
      break;
    case "HIGH":
      bg = "#FFEDD5";
      color = "#C2410C";
      label = "High";
      break;
    case "URGENT":
      bg = "#FEE2E2";
      color = "#B91C1C";
      label = "Urgent";
      break;
    default:
      bg = "#F1F5F9";
      color = "#475569";
      label = priority;
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
      data-testid={`priority-badge-${priority}`}
    >
      {label}
    </span>
  );
};
