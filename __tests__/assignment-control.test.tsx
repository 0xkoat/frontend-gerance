import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssignmentControl } from "@/components/security/assignment-control";
import { mockJsonResponse } from "../test-utils";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const members = [
  { id: "admin-1", name: "Alice Admin", role: "ADMIN" as const },
  { id: "analyst-1", name: "Ahmed Analyst", role: "ANALYST" as const },
];

afterEach(() => {
  jest.restoreAllMocks();
  refresh.mockClear();
  toastError.mockClear();
});

describe("AssignmentControl", () => {
  it("renders nothing for a Viewer", () => {
    const { container } = render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId={null}
        currentUserId="viewer-1"
        currentUserRole="VIEWER"
        assignableUsers={members}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the assignee's name and an Unassign button when assigned", () => {
    render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId="admin-1"
        currentUserId="analyst-1"
        currentUserRole="ANALYST"
        assignableUsers={members}
      />,
    );

    expect(screen.getByText("Alice Admin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unassign" }),
    ).toBeInTheDocument();
  });

  it("falls back to 'Assigned' when the assignee isn't in the passed-down member list", () => {
    render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId="someone-else"
        currentUserId="analyst-1"
        currentUserRole="ANALYST"
        assignableUsers={members}
      />,
    );

    expect(screen.getByText("Assigned")).toBeInTheDocument();
  });

  it("Unassign sends a DELETE with no body and refreshes on success", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId="admin-1"
        currentUserId="analyst-1"
        currentUserRole="ANALYST"
        assignableUsers={members}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Unassign" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/vm/vulnerabilities/v1/assign");
    expect(init?.method).toBe("DELETE");
    expect(init?.body).toBeUndefined();
  });

  it("shows an 'Assign to me' button for an unassigned Analyst, posting their own id", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId={null}
        currentUserId="analyst-1"
        currentUserRole="ANALYST"
        assignableUsers={members}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Assign to me" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      assignedToUserId: "analyst-1",
    });
  });

  it("shows the backend's 409 message via toast instead of a generic failure", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "Alert is already resolved and cannot be reassigned" },
          409,
        ),
      ) as unknown as typeof fetch;
    const user = userEvent.setup();

    render(
      <AssignmentControl
        assignEndpoint="/api/siem/alerts/a1/assign"
        assignedToUserId={null}
        currentUserId="analyst-1"
        currentUserRole="ANALYST"
        assignableUsers={members}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Assign to me" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "Alert is already resolved and cannot be reassigned",
      ),
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders a picker (not a button) for an unassigned Admin", () => {
    render(
      <AssignmentControl
        assignEndpoint="/api/vm/vulnerabilities/v1/assign"
        assignedToUserId={null}
        currentUserId="admin-1"
        currentUserRole="ADMIN"
        assignableUsers={members}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Assign to me" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Assign to...")).toBeInTheDocument();
  });
});
