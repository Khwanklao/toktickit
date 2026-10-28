import { describe, it, expect } from "vitest";
import { TicketStatus } from "@prisma/client";
import { parseQueueFilters } from "../../../src/domain/query-parser.js";
import { ValidationError } from "../../../src/domain/errors.js";

describe("UNIT-08: parseQueueFilters (Sec 5.3 Drill-Down Query Parser)", () => {
  const currentUserId = "u-user-current-uuid";

  it("returns empty filter object when query is empty", () => {
    const filters = parseQueueFilters({}, currentUserId);
    expect(filters).toEqual({});
  });

  it("parses valid status enum", () => {
    const filters = parseQueueFilters({ status: "IN_PROGRESS" }, currentUserId);
    expect(filters.status).toBe(TicketStatus.IN_PROGRESS);
  });

  it("throws ValidationError when status is not a valid enum value", () => {
    expect(() => parseQueueFilters({ status: "UNKNOWN_STATUS" }, currentUserId)).toThrow(
      ValidationError
    );

    try {
      parseQueueFilters({ status: "INVALID" }, currentUserId);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "status", code: "VALIDATION_ERROR" }),
        ])
      );
    }
  });

  it("parses group=open correctly", () => {
    const filters = parseQueueFilters({ group: "open" }, currentUserId);
    expect(filters.group).toBe("open");
  });

  it("throws ValidationError when group is any value other than 'open'", () => {
    expect(() => parseQueueFilters({ group: "closed" }, currentUserId)).toThrow(
      ValidationError
    );
    expect(() => parseQueueFilters({ group: "active" }, currentUserId)).toThrow(
      ValidationError
    );
  });

  it("throws ValidationError when both group and status are present", () => {
    expect(() =>
      parseQueueFilters({ group: "open", status: "OPEN" }, currentUserId)
    ).toThrow(ValidationError);
  });

  it("resolves ownerId='me' to currentUserId", () => {
    const filters = parseQueueFilters({ ownerId: "me" }, currentUserId);
    expect(filters.ownerId).toBe(currentUserId);
  });

  it("passes through ownerId='unassigned' and explicit UUIDs", () => {
    const unassignedFilters = parseQueueFilters({ ownerId: "unassigned" }, currentUserId);
    expect(unassignedFilters.ownerId).toBe("unassigned");

    const customUuid = "u-custom-staff-uuid";
    const customFilters = parseQueueFilters({ ownerId: customUuid }, currentUserId);
    expect(customFilters.ownerId).toBe(customUuid);
  });

  it("parses activeOnly='true' as true", () => {
    const filters = parseQueueFilters({ activeOnly: "true" }, currentUserId);
    expect(filters.activeOnly).toBe(true);
  });

  it("throws ValidationError when activeOnly is any value other than 'true'", () => {
    expect(() => parseQueueFilters({ activeOnly: "false" }, currentUserId)).toThrow(
      ValidationError
    );
    expect(() => parseQueueFilters({ activeOnly: "yes" }, currentUserId)).toThrow(
      ValidationError
    );
    expect(() => parseQueueFilters({ activeOnly: "1" }, currentUserId)).toThrow(
      ValidationError
    );
  });

  it("parses combined drill-down query ownerId=me&activeOnly=true correctly", () => {
    const filters = parseQueueFilters(
      { ownerId: "me", activeOnly: "true" },
      currentUserId
    );
    expect(filters).toEqual({
      ownerId: currentUserId,
      activeOnly: true,
    });
  });
});
