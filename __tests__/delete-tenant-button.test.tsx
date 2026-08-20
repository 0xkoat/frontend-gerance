import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteTenantButton } from "@/components/tenants/delete-tenant-button";
import { mockJsonResponse } from "../test-utils";

const refresh = jest.fn();
const toastSuccess = jest.fn();
const toastError = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

describe("DeleteTenantButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("does not call the API until the confirmation dialog is accepted", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<DeleteTenantButton tenantId="t1" tenantName="Meridian Corp" />);

    await user.click(
      screen.getByRole("button", { name: /delete meridian corp/i }),
    );

    expect(
      await screen.findByText(/delete meridian corp\?/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not delete anything when cancelled", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<DeleteTenantButton tenantId="t1" tenantName="Meridian Corp" />);

    await user.click(
      screen.getByRole("button", { name: /delete meridian corp/i }),
    );
    await screen.findByText(/delete meridian corp\?/i);
    await user.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls DELETE /api/tenants/:id and refreshes on confirm", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message: "Tenant and all its accounts deleted successfully",
          id: "t1",
        },
        200,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<DeleteTenantButton tenantId="t1" tenantName="Meridian Corp" />);

    await user.click(
      screen.getByRole("button", { name: /delete meridian corp/i }),
    );
    await screen.findByText(/delete meridian corp\?/i);
    await user.click(screen.getByRole("button", { name: /^delete tenant$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/tenants/t1", {
      method: "DELETE",
    });
    expect(refresh).toHaveBeenCalled();
  });

  it("shows an error toast and does not refresh when deletion fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Tenant not found" }, 404),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<DeleteTenantButton tenantId="t1" tenantName="Meridian Corp" />);

    await user.click(
      screen.getByRole("button", { name: /delete meridian corp/i }),
    );
    await screen.findByText(/delete meridian corp\?/i);
    await user.click(screen.getByRole("button", { name: /^delete tenant$/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Tenant not found"),
    );
    expect(refresh).not.toHaveBeenCalled();
  });
});
