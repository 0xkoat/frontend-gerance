import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { roleLabel } from "@/lib/roles";
import { MODULE_DESCRIPTIONS } from "@/lib/modules";
import { UserRole } from "@/types/auth";
import type { AvailableModule, ModuleLaunch } from "@/types/modules";
import { ModuleLevelSelect } from "@/components/modules/module-level-select";

export default async function ModuleAccessPage() {
  const session = await requireSession();

  // Both routes are @Roles(ADMIN)-gated on the backend; this avoids a page that would 403.
  if (session.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const [modulesRes, launchesRes] = await Promise.all([
    backendFetchAuthedNoRefresh("/modules"),
    backendFetchAuthedNoRefresh("/modules/launches"),
  ]);
  const modules: AvailableModule[] = modulesRes.ok
    ? await modulesRes.json()
    : [];
  const launches: ModuleLaunch[] = launchesRes.ok
    ? await launchesRes.json()
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Module access</h1>
        <p className="text-sm text-muted-foreground">
          Choose the lowest analyst level that can open each module in your
          tenant. Admins can always open every active module. Which modules your
          tenant has is set by the platform owner.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Minimum analyst level
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {modules.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">
              No modules are active for your tenant.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="w-40">Minimum level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((m) => (
                  <TableRow key={m.moduleName}>
                    <TableCell>
                      <div className="font-medium">{m.moduleName}</div>
                      <div className="text-xs text-muted-foreground">
                        {MODULE_DESCRIPTIONS[m.moduleName]}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.configured ? "default" : "secondary"}>
                        {m.configured ? "Configured" : "Not configured"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ModuleLevelSelect
                        moduleName={m.moduleName}
                        level={m.minAnalystLevel}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent launches
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {launches.length === 0 ? (
            <p className="px-6 text-sm text-muted-foreground">
              No module has been opened yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {launches.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(l.launchedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{l.userEmail}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {roleLabel(l.role)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {l.moduleName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {l.targetUrl}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
