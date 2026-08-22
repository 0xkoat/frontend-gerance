import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { LogsTable } from "@/components/siem/logs-table";
import type { SiemLog } from "@/types/siem";

// Read-only, unpaginated (matches the backend: listLogs takes no query filters or
// pagination at all, see the /api/siem/logs route's own comment) — the raw pre-alert
// record, separate from the actionable alerts list at (dashboard)/siem.
export default async function SiemLogsPage() {
  await requireSession();

  const res = await backendFetchAuthedNoRefresh("/siem/logs");
  const logs: SiemLog[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SIEM Logs</h1>
          <p className="text-sm text-muted-foreground">
            Raw events, before triage — not every log becomes an alert.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/siem">Back to alerts</Link>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {logs.length} {logs.length === 1 ? "log" : "logs"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <LogsTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
