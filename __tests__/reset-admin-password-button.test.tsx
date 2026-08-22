import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResetAdminPasswordButton } from "@/components/tenants/reset-admin-password-button";
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

describe("ResetAdminPasswordButton", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
  });

  it("does not call the API until the dialog is opened and submitted", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <ResetAdminPasswordButton adminId="admin-1" adminName="Alice Admin" />,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/reset alice admin's password/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a validation error for a weak password and does not submit", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <ResetAdminPasswordButton adminId="admin-1" adminName="Alice Admin" />,
    );

    await user.click(screen.getByRole("button", { name: /reset password/i }));
    const input = await screen.findByLabelText(/new password/i);
    await user.type(input, "weak");
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs /api/users/:id/reset-password on a strong password", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ message: "Password reset" }, 200));
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <ResetAdminPasswordButton adminId="admin-1" adminName="Alice Admin" />,
    );

    await user.click(screen.getByRole("button", { name: /reset password/i }));
    const input = await screen.findByLabelText(/new password/i);
    await user.type(input, "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/users/admin-1/reset-password");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ newPassword: "Str0ng!Pass" });
  });

  it("shows the backend's co-Admin conflict message on failure without refreshing", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(
        {
          message: "This tenant has other Admins who can reset this password",
        },
        409,
      ),
    ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(
      <ResetAdminPasswordButton adminId="admin-1" adminName="Alice Admin" />,
    );

    await user.click(screen.getByRole("button", { name: /reset password/i }));
    const input = await screen.findByLabelText(/new password/i);
    await user.type(input, "Str0ng!Pass");
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    expect(await screen.findByText(/other admins/i)).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
