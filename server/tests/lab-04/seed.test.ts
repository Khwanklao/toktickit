import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, Role, Priority, TicketStatus } from "@prisma/client";
import { seed } from "../../prisma/seed.js";
import { execSync } from "child_process";

const TEST_DB_URL = "postgresql://toktickit:toktickit@localhost:5432/toktickit_test?schema=public";

describe("REG-04: Idempotent Seed Verification Test (toktickit_test)", () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    // Ensure toktickit_test has latest schema
    execSync("npx prisma db push --schema prisma/schema.prisma --skip-generate", {
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: "pipe",
    });

    testPrisma = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    });
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("runs the seed twice and confirms identical row counts for User, Ticket, and ActionTaken", async () => {
    // First run
    await seed(testPrisma);
    const usersCount1 = await testPrisma.user.count();
    const ticketsCount1 = await testPrisma.ticket.count();
    const actionsCount1 = await testPrisma.actionTaken.count();

    expect(usersCount1).toBeGreaterThanOrEqual(11);
    expect(ticketsCount1).toBeGreaterThanOrEqual(9);
    expect(actionsCount1).toBeGreaterThanOrEqual(7);

    // Second run (idempotency check)
    await seed(testPrisma);
    const usersCount2 = await testPrisma.user.count();
    const ticketsCount2 = await testPrisma.ticket.count();
    const actionsCount2 = await testPrisma.actionTaken.count();

    expect(usersCount2).toBe(usersCount1);
    expect(ticketsCount2).toBe(ticketsCount1);
    expect(actionsCount2).toBe(actionsCount1);
  });

  it("verifies tickets in all 8 statuses exist, with assigned and unassigned tickets, and mixed priorities", async () => {
    const tickets = await testPrisma.ticket.findMany();

    const statusesPresent = new Set(tickets.map((t) => t.status));
    const allStatuses = Object.values(TicketStatus);
    for (const st of allStatuses) {
      expect(statusesPresent.has(st)).toBe(true);
    }

    const hasAssigned = tickets.some((t) => t.ownerId !== null);
    const hasUnassigned = tickets.some((t) => t.ownerId === null);
    expect(hasAssigned).toBe(true);
    expect(hasUnassigned).toBe(true);

    const prioritiesPresent = new Set(tickets.map((t) => t.requestedPriority));
    const allPriorities = Object.values(Priority);
    for (const pr of allPriorities) {
      expect(prioritiesPresent.has(pr)).toBe(true);
    }
  });

  it("verifies RESOLVED and CLOSED tickets each have at least 1 ActionTaken", async () => {
    const resolvedTickets = await testPrisma.ticket.findMany({
      where: { status: TicketStatus.RESOLVED },
      include: { actionsTaken: true },
    });
    expect(resolvedTickets.length).toBeGreaterThanOrEqual(1);
    for (const t of resolvedTickets) {
      expect(t.actionsTaken.length).toBeGreaterThanOrEqual(1);
    }

    const closedTickets = await testPrisma.ticket.findMany({
      where: { status: TicketStatus.CLOSED },
      include: { actionsTaken: true },
    });
    expect(closedTickets.length).toBeGreaterThanOrEqual(1);
    for (const t of closedTickets) {
      expect(t.actionsTaken.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("verifies at least 1 REOPENED ticket with reopenedAt set, isRequesterResolved: false, old actions before reopenedAt, and NO action after it", async () => {
    const reopenedTickets = await testPrisma.ticket.findMany({
      where: { status: TicketStatus.REOPENED },
      include: { actionsTaken: true },
    });

    expect(reopenedTickets.length).toBeGreaterThanOrEqual(1);

    const qualified = reopenedTickets.find((t) => {
      if (!t.reopenedAt || t.isRequesterResolved !== false) return false;
      if (t.actionsTaken.length === 0) return false;

      const reopenTime = t.reopenedAt.getTime();
      const allBefore = t.actionsTaken.every((a) => a.createdAt.getTime() < reopenTime);
      const noneAfter = !t.actionsTaken.some((a) => a.createdAt.getTime() >= reopenTime);

      return allBefore && noneAfter;
    });

    expect(qualified).toBeDefined();
  });

  it("verifies at least 1 WAITING_FOR_REQUESTER ticket owned by a test Requester", async () => {
    const waitingTickets = await testPrisma.ticket.findMany({
      where: { status: TicketStatus.WAITING_FOR_REQUESTER },
      include: { requester: true },
    });

    expect(waitingTickets.length).toBeGreaterThanOrEqual(1);
    const ownedByRequester = waitingTickets.some(
      (t) => t.requester.role === Role.REQUESTER
    );
    expect(ownedByRequester).toBe(true);
  });

  it("verifies at least 1 action recorded by an ADMINISTRATOR", async () => {
    const adminAction = await testPrisma.actionTaken.findFirst({
      where: { performedBy: { role: Role.ADMINISTRATOR } },
      include: { performedBy: true },
    });

    expect(adminAction).not.toBeNull();
    expect(adminAction?.performedBy.role).toBe(Role.ADMINISTRATOR);
  });

  it("verifies tickets with 0, 1, and multiple actions by different staff exist", async () => {
    const allTickets = await testPrisma.ticket.findMany({
      include: { actionsTaken: true },
    });

    const hasZeroActions = allTickets.some((t) => t.actionsTaken.length === 0);
    const hasOneAction = allTickets.some((t) => t.actionsTaken.length === 1);
    const hasMultipleStaffActions = allTickets.some((t) => {
      if (t.actionsTaken.length < 2) return false;
      const staffSet = new Set(t.actionsTaken.map((a) => a.performedById));
      return staffSet.size >= 2;
    });

    expect(hasZeroActions).toBe(true);
    expect(hasOneAction).toBe(true);
    expect(hasMultipleStaffActions).toBe(true);
  });

  it("verifies at least 1 Requester account with zero tickets exists", async () => {
    const zeroTicketRequester = await testPrisma.user.findFirst({
      where: {
        role: Role.REQUESTER,
        requestedTickets: { none: {} },
      },
    });

    expect(zeroTicketRequester).not.toBeNull();
    expect(zeroTicketRequester?.role).toBe(Role.REQUESTER);
  });

  it("verifies timestamp rules: ticket.updatedAt >= action.createdAt (BR-15), actionDateTime >= ticket.createdAt (BR-05), and none in the future (BR-05)", async () => {
    const ticketsWithActions = await testPrisma.ticket.findMany({
      where: { actionsTaken: { some: {} } },
      include: { actionsTaken: true },
    });

    const now = Date.now();

    for (const t of ticketsWithActions) {
      for (const a of t.actionsTaken) {
        expect(t.updatedAt.getTime()).toBeGreaterThanOrEqual(a.createdAt.getTime());
        expect(a.actionDateTime.getTime()).toBeGreaterThanOrEqual(t.createdAt.getTime());
        expect(a.actionDateTime.getTime()).toBeLessThanOrEqual(now);
      }
    }
  });
});
