import { render, screen } from "@testing-library/react";
import { UsersTable, type TenantUser } from "@/components/users/users-table";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const analyst: TenantUser = {
  id: "u2",
  name: "Sara Ben Ali",
  email: "sara@meridian.test",
  phoneNumber: "+21620000020",
  role: "ANALYST",
  mustChangePassword: false,
  passwordResetRequestedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const coAdminWithPendingReset: TenantUser = {
  id: "u3",
  name: "Karim Jendoubi",
  email: "karim@meridian.test",
  phoneNumber: "+21620000030",
  role: "ADMIN",
  mustChangePassword: false,
  passwordResetRequestedAt: "2026-07-20T09:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("UsersTable", () => {
  it("shows an empty state when there are no users", () => {
    render(<UsersTable users={[]} currentUserId="u1" />);

    expect(screen.getByText(/no users yet/i)).toBeInTheDocument();
  });

  it("does not show a pending-reset badge for a user with no request", () => {
    render(<UsersTable users={[analyst]} currentUserId="u1" />);

    expect(
      screen.queryByText(/password reset requested/i),
    ).not.toBeInTheDocument();
  });

  it("shows a pending-reset badge and tints the row for a user (including a co-Admin) with a request", () => {
    render(<UsersTable users={[coAdminWithPendingReset]} currentUserId="u1" />);

    expect(screen.getByText(/password reset requested/i)).toBeInTheDocument();

    const row = screen.getByText("Karim Jendoubi").closest("tr");
    expect(row).toHaveClass("bg-amber-500/5");
  });

  it("renders a mix of users with and without a pending request correctly", () => {
    render(
      <UsersTable
        users={[analyst, coAdminWithPendingReset]}
        currentUserId="u1"
      />,
    );

    const analystRow = screen.getByText("Sara Ben Ali").closest("tr");
    const adminRow = screen.getByText("Karim Jendoubi").closest("tr");

    expect(analystRow).not.toHaveClass("bg-amber-500/5");
    expect(adminRow).toHaveClass("bg-amber-500/5");
    expect(screen.getAllByText(/password reset requested/i)).toHaveLength(1);
  });
});
