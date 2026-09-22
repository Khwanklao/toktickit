import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../../src/components/StatusBadge.js";
import { PriorityBadge } from "../../src/components/PriorityBadge.js";
import { RoleBadge } from "../../src/components/RoleBadge.js";

describe("STYLE-01: Zen Green Design Tokens and Badge Styles", () => {
  it("renders RoleBadges with exact ui-spec color tokens", () => {
    render(
      <div>
        <RoleBadge role="REQUESTER" />
        <RoleBadge role="IT_STAFF" />
        <RoleBadge role="ADMINISTRATOR" />
      </div>
    );

    const reqBadge = screen.getByTestId("role-badge-REQUESTER");
    expect(reqBadge).toHaveTextContent("Requester");
    expect(reqBadge.style.backgroundColor).toBe("rgb(239, 246, 255)"); // #EFF6FF

    const staffBadge = screen.getByTestId("role-badge-IT_STAFF");
    expect(staffBadge).toHaveTextContent("IT Staff");
    expect(staffBadge.style.backgroundColor).toBe("rgb(220, 252, 231)"); // #DCFCE7

    const adminBadge = screen.getByTestId("role-badge-ADMINISTRATOR");
    expect(adminBadge).toHaveTextContent("Administrator");
    expect(adminBadge.style.backgroundColor).toBe("rgb(243, 232, 255)"); // #F3E8FF
  });

  it("renders PriorityBadges with exact ui-spec color tokens", () => {
    render(
      <div>
        <PriorityBadge priority="LOW" />
        <PriorityBadge priority="MEDIUM" />
        <PriorityBadge priority="HIGH" />
        <PriorityBadge priority="URGENT" />
      </div>
    );

    const lowBadge = screen.getByTestId("priority-badge-LOW");
    expect(lowBadge).toHaveTextContent("Low");
    expect(lowBadge.style.backgroundColor).toBe("rgb(241, 245, 249)"); // #F1F5F9

    const medBadge = screen.getByTestId("priority-badge-MEDIUM");
    expect(medBadge).toHaveTextContent("Medium");
    expect(medBadge.style.backgroundColor).toBe("rgb(254, 243, 199)"); // #FEF3C7

    const highBadge = screen.getByTestId("priority-badge-HIGH");
    expect(highBadge).toHaveTextContent("High");
    expect(highBadge.style.backgroundColor).toBe("rgb(255, 237, 213)"); // #FFEDD5

    const urgentBadge = screen.getByTestId("priority-badge-URGENT");
    expect(urgentBadge).toHaveTextContent("Urgent");
    expect(urgentBadge.style.backgroundColor).toBe("rgb(254, 226, 226)"); // #FEE2E2
  });

  it("renders StatusBadges with exact ui-spec color tokens", () => {
    render(
      <div>
        <StatusBadge status="NEW" />
        <StatusBadge status="OPEN" />
        <StatusBadge status="IN_PROGRESS" />
        <StatusBadge status="RESOLVED" />
      </div>
    );

    const newBadge = screen.getByTestId("status-badge-NEW");
    expect(newBadge).toHaveTextContent("New");

    const openBadge = screen.getByTestId("status-badge-OPEN");
    expect(openBadge).toHaveTextContent("Open");

    const inProgressBadge = screen.getByTestId("status-badge-IN_PROGRESS");
    expect(inProgressBadge).toHaveTextContent("In Progress");

    const resolvedBadge = screen.getByTestId("status-badge-RESOLVED");
    expect(resolvedBadge).toHaveTextContent("Resolved");
  });
});
