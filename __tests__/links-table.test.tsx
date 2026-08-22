import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinksTable } from "@/components/dfir/links-table";
import { mockJsonResponse } from "../test-utils";
import type { DfirLink } from "@/types/dfir";

const refresh = jest.fn();
const toastError = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args) },
}));

const links: DfirLink[] = [
  {
    id: "l1",
    tenantId: "t1",
    incidentId: "i1",
    sourceType: "SIEM_ALERT",
    sourceId: "11111111-1111-4111-8111-111111111111",
  },
];

afterEach(() => {
  jest.restoreAllMocks();
  refresh.mockClear();
  toastError.mockClear();
});

describe("LinksTable", () => {
  it("shows 'no linked records yet' when empty", () => {
    render(<LinksTable incidentId="i1" links={[]} currentUserRole="ADMIN" />);

    expect(screen.getByText(/no linked records yet/i)).toBeInTheDocument();
  });

  it("hides the Unlink action for a Viewer", () => {
    render(
      <LinksTable incidentId="i1" links={links} currentUserRole="VIEWER" />,
    );

    expect(
      screen.queryByRole("button", { name: /unlink/i }),
    ).not.toBeInTheDocument();
  });

  it("Unlink calls DELETE on the correct nested route and refreshes on success", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mockJsonResponse({}, 200));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(
      <LinksTable incidentId="i1" links={links} currentUserRole="ANALYST" />,
    );

    await user.click(screen.getByRole("button", { name: /unlink/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/dfir/incidents/i1/links/l1");
    expect(init.method).toBe("DELETE");
  });

  it("shows the backend's error message via toast on failure", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ message: "Link not found" }, 404));
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(
      <LinksTable incidentId="i1" links={links} currentUserRole="ANALYST" />,
    );

    await user.click(screen.getByRole("button", { name: /unlink/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Link not found"),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
