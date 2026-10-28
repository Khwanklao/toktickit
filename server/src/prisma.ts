import { PrismaClient } from "@prisma/client";

// Module augmentation retained strictly for Lab 2 test suite compatibility.
// In Lab 2, `RequesterUser` was a standalone model. In Lab 3, it was migrated to `User`
// and a runtime property getter was added to `PrismaClient` (below).
// `tests/lab-02/requesters.api.test.ts` spies on `prisma.requesterUser.findMany`.
// Without this declaration, TS2339 compilation errors occur under `tsconfig.json` test inclusion.
declare module "@prisma/client" {
  interface PrismaClient {
    requesterUser: any;
  }
}

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
