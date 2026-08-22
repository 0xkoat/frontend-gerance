import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RenameTenantButton } from "@/components/tenants/rename-tenant-button";
import { mockJsonResponse } from "../test-utils";

const refresh = jest.fn();
const toastSuccess = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: jest.fn(),
  },
}));

beforeEach(() => {
  refresh.mockClear();
  toastSuccess.mockClear();
});

describe("RenameTenantButton", () => {
  it("pre-fills the dialog with the current name", async () => {
    const user = userEvent.setup();
    render(<RenameTenantButton tenantId="t1" tenantName="Meridian Corp" />);

    await user.click(
      screen.getByRole("button", { name: /rename meridian corp/i }),
    );

    expect(
      await screen.findByDisplayValue("Meridian Corp"),
    ).toBeInTheDocument();
  });

  it("PATCHes the new name and refreshes on success", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ id: "t1", name: "Atlas Corp" }, 200),
      );
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<RenameTenantButton tenantId="t1" tenantName="Meridian Corp" />);
    await user.click(
      screen.getByRole("button", { name: /rename meridian corp/i }),
    );

    const input = await screen.findByLabelText("Name");
    await user.clear(input);
    await user.type(input, "Atlas Corp");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tenants/t1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({ name: "Atlas Corp" });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows a field error for an empty name without calling the backend", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const user = userEvent.setup();

    render(<RenameTenantButton tenantId="t1" tenantName="Meridian Corp" />);
    await user.click(
      screen.getByRole("button", { name: /rename meridian corp/i }),
    );

    const input = await screen.findByLabelText("Name");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(
      await screen.findByText(/tenant name is required/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
