import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTenantForm } from "@/components/tenants/create-tenant-form";
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

describe("CreateTenantForm", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("shows a validation error instead of submitting when the tenant name is empty", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateTenantForm />);

    await user.type(screen.getByLabelText(/full name/i), "Sara Khelifi");
    await user.type(screen.getByLabelText(/work email/i), "sara@meridian.test");
    await user.type(screen.getByLabelText(/phone number/i), "+21620000009");
    await user.type(screen.getByLabelText(/temporary password/i), "Tempo123!");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(
      await screen.findByText(/tenant name is required/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts tenant + first-Admin fields to /api/tenants and shows a success toast", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          tenant: { name: "Meridian Corp" },
          admin: { name: "Sara Khelifi" },
        },
        201,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateTenantForm />);

    await user.type(screen.getByLabelText(/tenant name/i), "Meridian Corp");
    await user.type(screen.getByLabelText(/full name/i), "Sara Khelifi");
    await user.type(screen.getByLabelText(/work email/i), "sara@meridian.test");
    await user.type(screen.getByLabelText(/phone number/i), "+21620000009");
    await user.type(screen.getByLabelText(/temporary password/i), "Tempo123!");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tenants");
    expect(JSON.parse(init.body)).toMatchObject({
      tenantName: "Meridian Corp",
      name: "Sara Khelifi",
      email: "sara@meridian.test",
    });
  });

  it("shows the backend's error message on failure without refreshing", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse(
          { message: "A user with this email already exists" },
          409,
        ),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<CreateTenantForm />);

    await user.type(screen.getByLabelText(/tenant name/i), "Meridian Corp");
    await user.type(screen.getByLabelText(/full name/i), "Sara Khelifi");
    await user.type(screen.getByLabelText(/work email/i), "sara@meridian.test");
    await user.type(screen.getByLabelText(/phone number/i), "+21620000009");
    await user.type(screen.getByLabelText(/temporary password/i), "Tempo123!");
    await user.click(screen.getByRole("button", { name: /create tenant/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
