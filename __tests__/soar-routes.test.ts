/**
 * @jest-environment node
 */
// Covers every SOAR Route Handler (Phase 7): playbooks, playbooks/[id], executions.
import { fakeToken, mockJsonResponse, setSessionCookie } from "../test-utils";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));
import { cookies } from "next/headers";

function setSession(token: string | null) {
  return setSessionCookie(cookies as jest.Mock, token);
}

const adminToken = fakeToken({
  sub: "admin-1",
  role: "ADMIN",
  tenantId: "t1",
  mustChangePassword: false,
});
const analystToken = fakeToken({
  sub: "analyst-1",
  role: "ANALYST",
  tenantId: "t1",
  mustChangePassword: false,
});
const viewerToken = fakeToken({
  sub: "viewer-1",
  role: "VIEWER",
  tenantId: "t1",
  mustChangePassword: false,
});

function req(method: string, body?: unknown) {
  return new Request("http://localhost:3001/irrelevant", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function paramsOf(id: string) {
  return { params: Promise.resolve({ id }) };
}

const validPlaybookBody = {
  name: "Auto-contain critical",
  triggerCondition: { severity: "CRITICAL" },
  actions: { notify: "soc-team" },
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("GET /api/soar/playbooks", () => {
  it("is reachable by a Viewer", async () => {
    setSession(viewerToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/soar/playbooks/route");

    const res = await GET(req("GET"));

    expect(res.status).toBe(200);
  });
});

describe("POST /api/soar/playbooks", () => {
  it("403s for an Analyst (Admin-only, unlike other modules)", async () => {
    setSession(analystToken);
    const { POST } = await import("@/app/api/soar/playbooks/route");

    const res = await POST(req("POST", validPlaybookBody));

    expect(res.status).toBe(403);
  });

  it("400s when triggerCondition.severity is missing", async () => {
    setSession(adminToken);
    const fetchSpy = jest.spyOn(global, "fetch");
    const { POST } = await import("@/app/api/soar/playbooks/route");

    const res = await POST(
      req("POST", { name: "x", triggerCondition: {}, actions: {} }),
    );

    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("201s for a valid playbook by an Admin", async () => {
    setSession(adminToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse({ id: "p1" }, 201) as Response);
    const { POST } = await import("@/app/api/soar/playbooks/route");

    const res = await POST(req("POST", validPlaybookBody));

    expect(res.status).toBe(201);
    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual(validPlaybookBody);
  });
});

describe("PATCH /api/soar/playbooks/[id]", () => {
  it("403s for an Admin-gated route hit by a Viewer", async () => {
    setSession(viewerToken);
    const { PATCH } = await import("@/app/api/soar/playbooks/[id]/route");

    const res = await PATCH(req("PATCH", { isActive: false }), paramsOf("p1"));

    expect(res.status).toBe(403);
  });

  it("200s for a partial update by an Admin", async () => {
    setSession(adminToken);
    jest
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockJsonResponse({ id: "p1", isActive: false }, 200) as Response,
      );
    const { PATCH } = await import("@/app/api/soar/playbooks/[id]/route");

    const res = await PATCH(req("PATCH", { isActive: false }), paramsOf("p1"));

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/soar/playbooks/[id]", () => {
  it("surfaces the backend's isActive-pointing 409 message as-is", async () => {
    setSession(adminToken);
    jest.spyOn(global, "fetch").mockResolvedValue(
      mockJsonResponse(
        {
          statusCode: 409,
          message:
            "Cannot delete a playbook that has existing executions — deactivate it instead (PATCH with isActive: false)",
        },
        409,
      ) as Response,
    );
    const { DELETE } = await import("@/app/api/soar/playbooks/[id]/route");

    const res = await DELETE(req("DELETE"), paramsOf("p1"));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.message).toMatch(/isActive: false/);
  });
});

describe("GET /api/soar/executions", () => {
  it("forwards status/page filters and is reachable by any role", async () => {
    setSession(viewerToken);
    const fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(mockJsonResponse([], 200) as Response);
    const { GET } = await import("@/app/api/soar/executions/route");

    const res = await GET(
      new Request(
        "http://localhost:3001/api/soar/executions?status=SUCCESS&page=2",
      ),
    );

    expect(res.status).toBe(200);
    const [url] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain("status=SUCCESS");
    expect(String(url)).toContain("page=2");
  });
});
