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

// Mirrors the SafeUser shape (User minus hashedPassword) documented in root CLAUDE.md's
// API contract.
export interface TenantUser {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  mustChangePassword: boolean;
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
        {users.map((user) => (
          <TableRow key={user.id}>
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
              {user.mustChangePassword ? "Pending first login" : "Active"}
            </TableCell>
            <TableCell className="text-sm tabular-nums text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <UserRowActions user={user} currentUserId={currentUserId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
