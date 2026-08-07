import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import { StatusTransitionMenu } from "@/components/security/status-transition-menu";
import {
  AssignmentControl,
  type AssignableUser,
} from "@/components/security/assignment-control";
import { LinksTable } from "@/components/dfir/links-table";
import { LinkRecordForm } from "@/components/dfir/link-record-form";
import type { TenantUser } from "@/components/users/users-table";
import {
  DFIR_INCIDENT_TRANSITIONABLE_STATUSES,
  type DfirIncidentDetail,
} from "@/types/dfir";
import { UserRole } from "@/types/auth";

export default async function DfirIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const res = await backendFetchAuthedNoRefresh(`/dfir/incidents/${id}`);
  if (res.status === 404) {
    notFound();
  }
  if (!res.ok) {
    throw new Error(`Failed to load incident ${id}: ${res.status}`);
  }
  const incident: DfirIncidentDetail = await res.json();

  let assignableUsers: AssignableUser[] = [];
  if (session.role === UserRole.ADMIN) {
    const usersRes = await backendFetchAuthedNoRefresh("/users?pageSize=100");
    if (usersRes.ok) {
      const data = (await usersRes.json()) as { users: TenantUser[] };
      assignableUsers = data.users
        .filter((u) => u.role === "ADMIN" || u.role === "ANALYST")
        .map((u) => ({ id: u.id, name: u.name, role: u.role as UserRole }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dfir"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All incidents
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {incident.title}
          </h1>
          <Badge
            variant="outline"
            className="gap-1.5 font-medium"
            style={{
              borderColor: SEVERITY_COLOR[incident.severity],
              color: SEVERITY_COLOR[incident.severity],
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: SEVERITY_COLOR[incident.severity] }}
              aria-hidden
            />
            {SEVERITY_LABEL[incident.severity]}
          </Badge>
        </div>
        {incident.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {incident.description}
          </p>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            MITRE:{" "}
            {incident.mitreTechniques.length > 0
              ? incident.mitreTechniques.join(", ")
              : "—"}
          </CardTitle>
          <div className="flex items-center gap-3">
            <StatusTransitionMenu
              statusEndpoint={`/api/dfir/incidents/${incident.id}/status`}
              currentStatus={incident.status}
              transitionableStatuses={DFIR_INCIDENT_TRANSITIONABLE_STATUSES}
              currentUserRole={session.role}
            />
            <AssignmentControl
              assignEndpoint={`/api/dfir/incidents/${incident.id}/assign`}
              assignedToUserId={incident.assignedToUserId}
              currentUserId={session.userId}
              currentUserRole={session.role}
              assignableUsers={assignableUsers}
            />
          </div>
        </CardHeader>
      </Card>

      <div
        className={
          session.role === UserRole.VIEWER
            ? "grid grid-cols-1 gap-4"
            : "grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]"
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {incident.links.length}{" "}
              {incident.links.length === 1 ? "linked record" : "linked records"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <LinksTable
              incidentId={incident.id}
              links={incident.links}
              currentUserRole={session.role}
            />
          </CardContent>
        </Card>

        {session.role !== UserRole.VIEWER && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Link an existing record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LinkRecordForm incidentId={incident.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
