import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { mockJsonResponse } from "../test-utils";

const push = jest.fn();
const refresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  it("labels the current-password field 'Temporary password'", () => {
    render(<ChangePasswordForm />);
    expect(screen.getByLabelText(/temporary password/i)).toBeInTheDocument();
  });

  it("shows a validation error instead of submitting when the new password is weak", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(
      screen.getByLabelText(/temporary password/i),
      "whatever-old",
    );
    await user.type(screen.getByLabelText(/new password/i), "short");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/at least 8 characters/i),
    ).toBeInTheDocument();
  });

  it("rejects a new password identical to the current one, client-side, without a network call", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(
      screen.getByLabelText(/temporary password/i),
      "Sameword123!",
    );
    await user.type(screen.getByLabelText(/new password/i), "Sameword123!");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/different from the current password/i),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /api/users/me/password and redirects to /dashboard on success", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Password changed" }, 200),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(
      screen.getByLabelText(/temporary password/i),
      "TempPassword1!",
    );
    await user.type(screen.getByLabelText(/new password/i), "BrandNewPass2!");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/users/me/password",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("shows the backend's error message on failure without redirecting", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        mockJsonResponse({ message: "Current password is incorrect" }, 400),
      ) as unknown as typeof fetch;

    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    await user.type(
      screen.getByLabelText(/temporary password/i),
      "WrongOldPass1!",
    );
    await user.type(screen.getByLabelText(/new password/i), "BrandNewPass2!");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    expect(
      await screen.findByText(/current password is incorrect/i),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
