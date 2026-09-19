import React from "react";

export type UserRoleType = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

interface RoleBadgeProps {
  role: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const normalizedRole = (role || "").toUpperCase() as UserRoleType;

  let bg = "#EFF6FF";
  let color = "#1D4ED8";
  let label: string = role;

  switch (normalizedRole) {
    case "REQUESTER":
      bg = "#EFF6FF";
      color = "#1D4ED8";
      label = "Requester";
      break;
    case "IT_STAFF":
      bg = "#DCFCE7";
      color = "#15803D";
      label = "IT Staff";
      break;
    case "ADMINISTRATOR":
      bg = "#F3E8FF";
      color = "#7E22CE";
      label = "Administrator";
      break;
    default:
      bg = "#EFF6FF";
      color = "#1D4ED8";
      label = role;
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
      data-testid={`role-badge-${role}`}
    >
      {label}
    </span>
  );
};
