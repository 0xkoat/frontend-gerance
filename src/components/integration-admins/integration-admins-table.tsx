import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResetAdminPasswordButton } from "@/components/tenants/reset-admin-password-button";
import { DeleteIntegrationAdminButton } from "@/components/integration-admins/delete-integration-admin-button";

// Mirrors the backend's GET /integration-admins rows (User minus hashedPassword).
export interface IntegrationAdmin {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  mustChangePassword: boolean;
  passwordResetRequestedAt: string | null;
  createdAt: string;
}

export function IntegrationAdminsTable({
  admins,
}: {
  admins: IntegrationAdmin[];
}) {
  if (admins.length === 0) {
    return (
      <p className="px-6 text-sm text-muted-foreground">
        No Integration Admins yet.
      </p>
    );
  }

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
                    {admin.mustChangePassword
                      ? "Pending first login"
                      : "Active"}
                  </span>
                  {resetRequested && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      Password reset requested
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <ResetAdminPasswordButton
                    adminId={admin.id}
                    adminName={admin.name}
                    endpoint={`/api/integration-admins/${admin.id}/reset-password`}
                    description="Sets a new password directly — they'll need to change it on their next login."
                  />
                  <DeleteIntegrationAdminButton
                    adminId={admin.id}
                    adminName={admin.name}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
