import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { UserRole } from "@/types/auth";
import { UsersTable, type TenantUser } from "@/components/users/users-table";
import { CreateUserForm } from "@/components/users/create-user-form";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireSession();

  // Same defense-in-depth reasoning as requireSession() itself: GET/POST /users are already
  // @Roles(UserRole.ADMIN)-gated on the backend, and src/app/api/users/route.ts re-checks
  // this too — this redirect just avoids rendering a page whose data calls will 403 anyway.
  if (session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const requestedPage = Number((await searchParams).page) || 1;
  const page = Math.max(1, requestedPage);

  const res = await backendFetchAuthedNoRefresh(
    `/users?page=${page}&pageSize=${PAGE_SIZE}`,
  );
  const data: { users: TenantUser[]; total: number } = res.ok
    ? await res.json()
    : { users: [], total: 0 };
  const { users, total } = data;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {total} {total === 1 ? "user" : "users"}
            </CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page <= 1 ? (
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/users?page=${page - 1}`}>Previous</Link>}
                  />
                )}
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page >= totalPages ? (
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/users?page=${page + 1}`}>Next</Link>}
                  />
                )}
              </div>
            )}
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
