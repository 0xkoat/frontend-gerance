import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserRowActions } from "@/components/users/user-row-actions";

// Mirrors the SafeUser shape (User minus hashedPassword)
// API contract.
export interface TenantUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  mustChangePassword: boolean;
  passwordResetRequestedAt: string | null;
  createdAt: string;
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: TenantUser[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">No users yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const resetRequested = user.passwordResetRequestedAt !== null;
          return (
            <TableRow
              key={user.id}
              className={
                resetRequested
                  ? "bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                  : undefined
              }
            >
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.email}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.phoneNumber}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{user.role}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span>
                    {user.mustChangePassword ? "Pending first login" : "Active"}
                  </span>
                  {resetRequested && (
                    <Badge className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      Password reset requested
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm tabular-nums text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <UserRowActions user={user} currentUserId={currentUserId} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
