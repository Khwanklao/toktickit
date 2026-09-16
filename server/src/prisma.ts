import { PrismaClient } from "@prisma/client";

// Lazy singleton: the client is created on first use, not at import time.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
    // Backward compatibility alias for legacy tests/routes querying requesterUser
    Object.defineProperty(client, "requesterUser", {
      get() {
        return client!.user;
      },
      configurable: true,
      enumerable: true,
    });
  }
  return client;
}
