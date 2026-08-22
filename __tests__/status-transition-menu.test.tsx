import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusTransitionMenu } from "@/components/security/status-transition-menu";
import { SIEM_ALERT_TRANSITIONABLE_STATUSES } from "@/types/siem";
import { mockJsonResponse } from "../test-utils";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

afterEach(() => {
  refresh.mockClear();
  toastError.mockClear();
});

async function openMenu(
  currentStatus:
    (typeof SIEM_ALERT_TRANSITIONABLE_STATUSES)[number] | "OPEN" = "OPEN",
) {
  const user = userEvent.setup();
  render(
    <StatusTransitionMenu
      statusEndpoint="/api/siem/alerts/a1/status"
      currentStatus={currentStatus}
      transitionableStatuses={SIEM_ALERT_TRANSITIONABLE_STATUSES}
      currentUserRole="ANALYST"
    />,
  );
  await user.click(screen.getByRole("button"));
  await screen.findByRole("menu");
  return user;
}

describe("StatusTransitionMenu", () => {
  it("renders nothing for a Viewer", () => {
    const { container } = render(
      <StatusTransitionMenu
        statusEndpoint="/api/siem/alerts/a1/status"
        currentStatus="OPEN"
        transitionableStatuses={SIEM_ALERT_TRANSITIONABLE_STATUSES}
        currentUserRole="VIEWER"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current status on the trigger, title-cased", () => {
    render(
      <StatusTransitionMenu
        statusEndpoint="/api/siem/alerts/a1/status"
        currentStatus="OPEN"
        transitionableStatuses={SIEM_ALERT_TRANSITIONABLE_STATUSES}
        currentUserRole="ANALYST"
      />,
    );

    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("offers only the transitionable statuses other than the current one", async () => {
    await openMenu("ESCALATED");

    expect(
      screen.getByRole("menuitem", { name: "Resolved" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Escalated" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing once the record is already at the only remaining transitionable status target list is empty", () => {
    // RESOLVED is terminal for SIEM (no further transitions from it) — filtering out the
    // current status from [ESCALATED, RESOLVED] when current is RESOLVED leaves only
    // ESCALATED, which is still offered (a resolved alert can be reopened by escalating).
    // This case instead exercises what happens when the whole transitionable set collapses:
    // simulate that directly.
    const { container } = render(
      <StatusTransitionMenu
        statusEndpoint="/api/siem/alerts/a1/status"
        currentStatus="RESOLVED"
        transitionableStatuses={["RESOLVED"] as const}
        currentUserRole="ANALYST"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("PATCHes the chosen status and refreshes on success", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = await openMenu("OPEN");

    await user.click(screen.getByRole("menuitem", { name: "Escalated" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("/api/siem/alerts/a1/status");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ status: "ESCALATED" });
  });

  it("shows the backend's error message via toast on failure", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Alert not found" }, 404),
      ) as unknown as typeof fetch;
    const user = await openMenu("OPEN");

    await user.click(screen.getByRole("menuitem", { name: "Escalated" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Alert not found"),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
