import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserRowActions } from "@/components/users/user-row-actions";
import type { TenantUser } from "@/components/users/users-table";
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

const user: TenantUser = {
  id: "u2",
  name: "Sara Ben Ali",
  email: "sara@meridian.test",
  phoneNumber: "+21620000020",
  role: "ANALYST",
  mustChangePassword: false,
  passwordResetRequestedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

async function openMenu() {
  const ue = userEvent.setup();
  render(<UserRowActions user={user} currentUserId="u1" />);
  await ue.click(
    screen.getByRole("button", { name: /actions for sara ben ali/i }),
  );
  // The popup renders into a portal after the click resolves; wait for it before
  // querying menu items synchronously.
  await screen.findByRole("menu");
  return ue;
}

describe("UserRowActions", () => {
  beforeEach(() => {
    refresh.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("shows 'You' instead of a menu on the caller's own row", () => {
    render(<UserRowActions user={user} currentUserId={user.id} />);

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /actions for/i }),
    ).not.toBeInTheDocument();
  });

  it("opens the actions menu with all four actions", async () => {
    await openMenu();

    expect(
      await screen.findByRole("menuitem", { name: /edit profile/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /change role/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /reset password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /delete user/i }),
    ).toBeInTheDocument();
  });

  describe("edit profile", () => {
    it("shows a validation error and does not submit when name is cleared", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /edit profile/i }));
      const nameInput = await screen.findByLabelText(/full name/i);
      await ue.clear(nameInput);
      await ue.click(screen.getByRole("button", { name: /save changes/i }));

      expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("PATCHes /api/users/:id and closes on success", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ ...user, name: "Sara Trabelsi" }, 200),
        );
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /edit profile/i }));
      const nameInput = await screen.findByLabelText(/full name/i);
      await ue.clear(nameInput);
      await ue.type(nameInput, "Sara Trabelsi");
      await ue.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(refresh).toHaveBeenCalled();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/users/u2");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toMatchObject({ name: "Sara Trabelsi" });
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
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /edit profile/i }));
      await ue.click(
        await screen.findByRole("button", { name: /save changes/i }),
      );

      expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe("change role", () => {
    it("PATCHes /api/users/:id/role with the current role by default", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(mockJsonResponse({ ...user, role: "ANALYST" }, 200));
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /change role/i }));
      await ue.click(
        await screen.findByRole("button", { name: /change role/i }),
      );

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/users/u2/role");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ role: "ANALYST" });
    });

    it("shows the backend's error message on failure", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ message: "You cannot change your own role" }, 403),
        ) as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /change role/i }));
      await ue.click(
        await screen.findByRole("button", { name: /change role/i }),
      );

      expect(
        await screen.findByText(/cannot change your own role/i),
      ).toBeInTheDocument();
      expect(refresh).not.toHaveBeenCalled();
    });
  });

  describe("reset password", () => {
    it("shows a validation error for a weak password and does not submit", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /reset password/i }));
      const input = await screen.findByLabelText(/new password/i);
      await ue.type(input, "weak");
      await ue.click(screen.getByRole("button", { name: /^reset password$/i }));

      expect(
        await screen.findByText(/at least 8 characters/i),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("POSTs /api/users/:id/reset-password on a strong password", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ message: "Password reset" }, 200),
        );
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /reset password/i }));
      const input = await screen.findByLabelText(/new password/i);
      await ue.type(input, "Str0ng!Pass");
      await ue.click(screen.getByRole("button", { name: /^reset password$/i }));

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(refresh).toHaveBeenCalled();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("/api/users/u2/reset-password");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ newPassword: "Str0ng!Pass" });
    });
  });

  describe("delete user", () => {
    it("does not call the API when cancelled", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /delete user/i }));
      await screen.findByText(/delete sara ben ali\?/i);
      await ue.click(screen.getByRole("button", { name: /^cancel$/i }));

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("DELETEs /api/users/:id on confirm", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse({ message: "User deleted", id: "u2" }, 200),
        );
      global.fetch = fetchMock as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /delete user/i }));
      const dialog = await screen.findByRole("alertdialog");
      await ue.click(
        within(dialog).getByRole("button", { name: /^delete user$/i }),
      );

      await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledWith("/api/users/u2", {
        method: "DELETE",
      });
      expect(refresh).toHaveBeenCalled();
    });

    it("shows an error toast and does not refresh when deletion fails", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          mockJsonResponse(
            { message: "You cannot delete your own account" },
            403,
          ),
        ) as unknown as typeof fetch;
      const ue = await openMenu();

      await ue.click(screen.getByRole("menuitem", { name: /delete user/i }));
      const dialog = await screen.findByRole("alertdialog");
      await ue.click(
        within(dialog).getByRole("button", { name: /^delete user$/i }),
      );

      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith(
          "You cannot delete your own account",
        ),
      );
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});
