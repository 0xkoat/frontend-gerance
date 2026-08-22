import { render, screen } from "@testing-library/react";
import { TenantAdminsTable } from "@/components/tenants/tenant-admins-table";
import type { TenantUser } from "@/components/users/users-table";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const soleAdmin: TenantUser = {
  id: "admin-1",
  name: "Alice Admin",
  email: "alice@meridian.test",
  phoneNumber: "+21620000001",
  role: "ADMIN",
  mustChangePassword: false,
  passwordResetRequestedAt: "2026-07-20T09:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const coAdminA: TenantUser = {
  ...soleAdmin,
  id: "admin-1",
  name: "Alice Admin",
};

const coAdminB: TenantUser = {
  ...soleAdmin,
  id: "admin-2",
  name: "Bilel Admin",
  passwordResetRequestedAt: null,
};

describe("TenantAdminsTable", () => {
  it("shows an empty state when the tenant has no Admin", () => {
    render(<TenantAdminsTable admins={[]} />);

    expect(screen.getByText(/no admin yet/i)).toBeInTheDocument();
  });

  it("shows the reset-password action for a sole Admin", () => {
    render(<TenantAdminsTable admins={[soleAdmin]} />);

    expect(
      screen.getByRole("button", { name: /reset password/i }),
    ).toBeInTheDocument();
  });

  it("shows the pending-reset badge and row tint for a sole Admin with a request", () => {
    render(<TenantAdminsTable admins={[soleAdmin]} />);

    expect(screen.getByText(/password reset requested/i)).toBeInTheDocument();
    const row = screen.getByText("Alice Admin").closest("tr");
    expect(row).toHaveClass("bg-amber-500/5");
  });

  it("hides the reset-password action and explains why when there are co-Admins", () => {
    render(<TenantAdminsTable admins={[coAdminA, coAdminB]} />);

    expect(
      screen.queryByRole("button", { name: /reset password/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/co-admins/i)).toHaveLength(2);
  });
});
