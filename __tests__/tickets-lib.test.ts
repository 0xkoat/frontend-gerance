import { allowedStatusChanges } from "@/lib/tickets";
import { createTicketSchema } from "@/lib/validations/tickets";
import type { Ticket } from "@/types/tickets";

const admin = { userId: "admin-1", role: "ADMIN", tenantId: "t1" } as const;
const analyst = {
  userId: "analyst-1",
  role: "ANALYST",
  tenantId: "t1",
} as const;
const integrationAdmin = {
  userId: "ia-1",
  role: "INTEGRATION_ADMIN",
  tenantId: null,
} as const;

function ticket(
  overrides: Partial<
    Pick<Ticket, "tenantId" | "category" | "createdById" | "status">
  > = {},
) {
  return {
    tenantId: "t1",
    category: "MODULES",
    createdById: "analyst-1",
    status: "OPEN",
    ...overrides,
  } as Pick<Ticket, "tenantId" | "category" | "createdById" | "status">;
}

describe("allowedStatusChanges (mirrors the backend rules)", () => {
  it("lets a tenant Admin move an open ticket forward", () => {
    expect(allowedStatusChanges(admin, ticket())).toEqual([
      "IN_PROGRESS",
      "RESOLVED",
    ]);
  });

  it("lets a handler only reopen a resolved ticket", () => {
    expect(allowedStatusChanges(admin, ticket({ status: "RESOLVED" }))).toEqual(
      ["OPEN"],
    );
  });

  it("gives an Admin of another tenant nothing", () => {
    expect(allowedStatusChanges(admin, ticket({ tenantId: "t2" }))).toEqual([]);
  });

  it("lets the Integration Admin handle Modules tickets only", () => {
    expect(allowedStatusChanges(integrationAdmin, ticket())).toEqual([
      "IN_PROGRESS",
      "RESOLVED",
    ]);
    expect(
      allowedStatusChanges(integrationAdmin, ticket({ category: "OTHER" })),
    ).toEqual([]);
  });

  it("lets the creator only withdraw, and only while not resolved", () => {
    expect(allowedStatusChanges(analyst, ticket())).toEqual(["RESOLVED"]);
    expect(
      allowedStatusChanges(analyst, ticket({ status: "RESOLVED" })),
    ).toEqual([]);
  });

  it("gives another Analyst nothing", () => {
    expect(
      allowedStatusChanges(analyst, ticket({ createdById: "analyst-2" })),
    ).toEqual([]);
  });
});

describe("createTicketSchema", () => {
  const base = {
    title: "SIEM unreachable",
    description: "The SIEM login page times out since this morning.",
  };

  it("accepts a Modules ticket with its module", () => {
    expect(
      createTicketSchema.safeParse({
        ...base,
        category: "MODULES",
        moduleName: "SIEM",
      }).success,
    ).toBe(true);
  });

  it("requires the module for a Modules ticket", () => {
    const result = createTicketSchema.safeParse({
      ...base,
      category: "MODULES",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["moduleName"]);
  });

  it("rejects a module on another category", () => {
    expect(
      createTicketSchema.safeParse({
        ...base,
        category: "ACCOUNT_ACCESS",
        moduleName: "SIEM",
      }).success,
    ).toBe(false);
  });

  it("rejects the old Log in category name", () => {
    expect(
      createTicketSchema.safeParse({ ...base, category: "LOGIN" }).success,
    ).toBe(false);
  });
});
