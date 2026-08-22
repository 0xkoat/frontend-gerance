import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TenantUser } from "@/components/users/users-table";
import { ResetAdminPasswordButton } from "@/components/tenants/reset-admin-password-button";

// A Super Admin only ever acts on one Admin at a time here, and only when that Admin has no
// co-Admin to reset their password instead (see UsersService.resetSoleAdminPassword on the
// backend) — every other user-management action (edit/role/delete) stays scoped to the
// tenant's own Admins via (dashboard)/users, which is why this isn't just UsersTable reused
// with a different action column.
export function TenantAdminsTable({ admins }: { admins: TenantUser[] }) {
  if (admins.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This tenant has no Admin yet.
      </p>
    );
  }

  const isSoleAdmin = admins.length === 1;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-48" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {admins.map((admin) => {
          const resetRequested = admin.passwordResetRequestedAt !== null;
          return (
            <TableRow
              key={admin.id}
              className={
                resetRequested
                  ? "bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                  : undefined
              }
            >
              <TableCell className="font-medium">{admin.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {admin.email}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {admin.phoneNumber}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span>
                    {admin.mustChangePassword ? "Pending first login" : "Active"}
                  </span>
                  {resetRequested && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      Password reset requested
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {isSoleAdmin ? (
                  <ResetAdminPasswordButton
                    adminId={admin.id}
                    adminName={admin.name}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Has co-Admins — one of them can reset this
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
