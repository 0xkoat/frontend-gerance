import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { backendFetchAuthed } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import { UsersTable, type TenantUser } from "@/components/users/users-table";
import { CreateUserForm } from "@/components/users/create-user-form";

export default async function UsersPage() {
  const session = await requireSession();

  // Same defense-in-depth reasoning as requireSession() itself: GET/POST /users are already
  // @Roles(UserRole.ADMIN)-gated on the backend, and src/app/api/users/route.ts re-checks
  // this too — this redirect just avoids rendering a page whose data calls will 403 anyway.
  if (session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const res = await backendFetchAuthed("/users");
  const users: TenantUser[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage accounts in your tenant. There&apos;s no self-signup anywhere
          in this platform — every account is created here by an Admin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {users.length} {users.length === 1 ? "user" : "users"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <UsersTable users={users} currentUserId={session.userId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Create user
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
