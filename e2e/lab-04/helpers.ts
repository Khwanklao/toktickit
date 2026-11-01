import { request, APIRequestContext, Page } from "@playwright/test";

export const API_BASE_URL = "http://localhost:3000";

/**
 * Database Guard:
 * Proves the test execution environment is targeting the isolated PostgreSQL test database (`toktickit_test`).
 * Fails fast if DATABASE_URL points to dev (`toktickit`) or any production instance to prevent accidental contamination.
 */
export function assertTestDatabaseGuard(): void {
  const dbUrl = process.env.DATABASE_URL || "";
  const match = dbUrl.match(/\/([^/?]+)(\?|$)/);
  const dbName = match ? match[1] : "";
  if (dbName !== "toktickit_test") {
    throw new Error(
      `[Database Guard] Safety validation failed! Expected database 'toktickit_test', but DATABASE_URL points to '${
        dbName || "undefined"
      }'. Tests aborted to prevent data corruption.`
    );
  }
}

/**
 * Helper to establish an authenticated API request context via HTTP API login.
 * The session cookie ('toktickit_session') is automatically stored in the returned APIRequestContext.
 */
export async function createAuthenticatedContext(
  email: string,
  password = "Password123!"
): Promise<APIRequestContext> {
  assertTestDatabaseGuard();
  const ctx = await request.newContext({ baseURL: API_BASE_URL });
  const res = await ctx.post("/api/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    const errorBody = await res.text();
    throw new Error(`[API Login Failed] ${email} returned status ${res.status()}: ${errorBody}`);
  }
  return ctx;
}

/**
 * Helper for browser UI login.
 */
export async function loginViaUI(page: Page, email: string, password = "Password123!"): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('[data-testid="login-submit-button"]');
}

/**
 * Convert a Date into "YYYY-MM-DDTHH:mm" in the Asia/Bangkok timezone.
 */
export function toDateTimeLocalBangkok(dateInput: string | Date = new Date()): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);

  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

/**
 * Returns a valid Bangkok datetime-local value guaranteed to be strictly after the ticket creation time
 * and within the +60s clock drift tolerance.
 */
export function getValidActionDateTimeLocal(ticketCreatedAt?: string | Date): string {
  const baseTime = ticketCreatedAt ? new Date(ticketCreatedAt).getTime() : Date.now();
  // Next minute boundary (:00 seconds) is strictly > baseTime and <= now + 60s
  const nextMinuteMs = Math.floor(baseTime / 60000) * 60000 + 60000;
  return toDateTimeLocalBangkok(new Date(nextMinuteMs));
}

let cachedCategoryAndSystem: { categoryId: number; relatedSystemId: number } | null = null;

async function getCategoryAndSystem(apiContext: APIRequestContext): Promise<{ categoryId: number; relatedSystemId: number }> {
  if (cachedCategoryAndSystem) return cachedCategoryAndSystem;
  const catRes = await apiContext.get("/api/categories");
  const categories = await catRes.json();
  const sysRes = await apiContext.get("/api/related-systems");
  const systems = await sysRes.json();

  const categoryId = Array.isArray(categories) && categories.length > 0 ? categories[0].id : 1;
  const relatedSystemId = Array.isArray(systems) && systems.length > 0 ? systems[0].id : 1;

  cachedCategoryAndSystem = { categoryId, relatedSystemId };
  return cachedCategoryAndSystem;
}

export interface TestTicketFixture {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  status: string;
  requesterEmail: string;
  createdAt?: string | Date;
}

export interface CreateTicketFixtureOptions {
  summaryPrefix?: string;
  requestedPriority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  targetStatus?: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED";
  ownerEmail?: string;
  requesterEmail?: string;
  actionsCount?: number;
}

/**
 * Pure HTTP API-based fixture generator:
 * Creates an isolated, brand-new ticket per test without writing to the database directly.
 * Dynamically drives the workflow through real endpoints:
 * 1. POST /api/tickets (as Requester) -> status "NEW"
 * 2. PATCH /api/staff/tickets/:id/assign (as IT Staff) -> status "OPEN"
 * 3. PATCH /api/staff/tickets/:id/status (as IT Staff) -> status "IN_PROGRESS"
 * 4. POST /api/tickets/:id/actions (as IT Staff) -> creates Action Taken
 * 5. PATCH /api/staff/tickets/:id/status (as IT Staff) -> status "RESOLVED" / "CLOSED"
 */
export async function createTicketFixture(
  options: CreateTicketFixtureOptions = {}
): Promise<TestTicketFixture> {
  assertTestDatabaseGuard();

  const requesterEmail = options.requesterEmail || "req.active1@toktickit.local";
  const reqContext = await createAuthenticatedContext(requesterEmail);
  const { categoryId, relatedSystemId } = await getCategoryAndSystem(reqContext);

  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const summary = `${options.summaryPrefix || "E2E Test Ticket"} [${runId}]`;
  const description = `Dynamic ticket description for isolated E2E test run ${runId} with sufficient characters.`;

  // 1. Create ticket via POST /api/tickets
  const createRes = await reqContext.post("/api/tickets", {
    data: {
      categoryId,
      relatedSystemId,
      summary,
      description,
      requestedPriority: options.requestedPriority || "MEDIUM",
    },
  });

  if (!createRes.ok()) {
    throw new Error(`Failed to create ticket: ${createRes.status()} - ${await createRes.text()}`);
  }

  const createdTicket = await createRes.json();
  const ticketId = createdTicket.id;
  const ticketNumber = createdTicket.ticketNumber;
  let currentStatus = createdTicket.status;

  const targetStatus = options.targetStatus || "NEW";
  const staffEmail = options.ownerEmail || "staff.alex@toktickit.local";

  if (targetStatus !== "NEW" || (options.actionsCount && options.actionsCount > 0)) {
    const staffContext = await createAuthenticatedContext(staffEmail);

    // Fetch staff user ID
    const meRes = await staffContext.get("/api/auth/me");
    const meData = await meRes.json();
    const staffUserId = meData.user?.id || meData.id;

    // Transition NEW -> OPEN via assign
    const assignRes = await staffContext.patch(`/api/staff/tickets/${ticketId}/assign`, {
      data: { ownerId: staffUserId },
    });
    if (!assignRes.ok()) {
      throw new Error(`Failed to assign ticket: ${assignRes.status()} - ${await assignRes.text()}`);
    }
    currentStatus = "OPEN";

    // Transition OPEN -> IN_PROGRESS
    if (
      targetStatus === "IN_PROGRESS" ||
      targetStatus === "RESOLVED" ||
      targetStatus === "CLOSED" ||
      targetStatus === "WAITING_FOR_REQUESTER"
    ) {
      const statusRes = await staffContext.patch(`/api/staff/tickets/${ticketId}/status`, {
        data: { status: "IN_PROGRESS" },
      });
      if (!statusRes.ok()) {
        throw new Error(`Failed to set IN_PROGRESS: ${statusRes.status()} - ${await statusRes.text()}`);
      }
      currentStatus = "IN_PROGRESS";
    }

    // Transition to WAITING_FOR_REQUESTER if requested
    if (targetStatus === "WAITING_FOR_REQUESTER") {
      const statusRes = await staffContext.patch(`/api/staff/tickets/${ticketId}/status`, {
        data: { status: "WAITING_FOR_REQUESTER" },
      });
      if (!statusRes.ok()) {
        throw new Error(`Failed to set WAITING_FOR_REQUESTER: ${statusRes.status()} - ${await statusRes.text()}`);
      }
      currentStatus = "WAITING_FOR_REQUESTER";
    }

    // Record Action Taken entries if requested
    const actionsCount = options.actionsCount || 0;
    for (let i = 0; i < actionsCount; i++) {
      const actionRes = await staffContext.post(`/api/tickets/${ticketId}/actions`, {
        data: {
          description: `Action step ${i + 1} performed by staff for fixture ${runId}`,
          result: `Diagnostic check ${i + 1} succeeded without errors.`,
          actionDateTime: new Date().toISOString(),
        },
      });
      if (!actionRes.ok()) {
        throw new Error(`Failed to add action: ${actionRes.status()} - ${await actionRes.text()}`);
      }
    }

    // Transition to RESOLVED if requested
    if (targetStatus === "RESOLVED" || targetStatus === "CLOSED") {
      const statusRes = await staffContext.patch(`/api/staff/tickets/${ticketId}/status`, {
        data: { status: "RESOLVED" },
      });
      if (!statusRes.ok()) {
        throw new Error(`Failed to set RESOLVED: ${statusRes.status()} - ${await statusRes.text()}`);
      }
      currentStatus = "RESOLVED";
    }

    // Transition to CLOSED if requested
    if (targetStatus === "CLOSED") {
      const statusRes = await staffContext.patch(`/api/staff/tickets/${ticketId}/status`, {
        data: { status: "CLOSED" },
      });
      if (!statusRes.ok()) {
        throw new Error(`Failed to set CLOSED: ${statusRes.status()} - ${await statusRes.text()}`);
      }
      currentStatus = "CLOSED";
    }

    await staffContext.dispose();
  }

  await reqContext.dispose();

  return {
    id: ticketId,
    ticketNumber,
    summary,
    description,
    status: currentStatus,
    requesterEmail,
    createdAt: createdTicket.createdAt,
  };
}

