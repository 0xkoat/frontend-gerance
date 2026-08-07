import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { EndpointsTable } from "@/components/edr/endpoints-table";
import type { EdrEndpoint } from "@/types/edr";

export default async function EdrEndpointsPage() {
  const session = await requireSession();

  const res = await backendFetchAuthedNoRefresh("/edr/endpoints");
  const endpoints: EdrEndpoint[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            EDR Endpoints
          </h1>
          <p className="text-sm text-muted-foreground">
            No manual create here — endpoints appear automatically as EDR events
            arrive.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/edr">Back to detections</Link>}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {endpoints.length}{" "}
            {endpoints.length === 1 ? "endpoint" : "endpoints"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <EndpointsTable
            endpoints={endpoints}
            currentUserRole={session.role}
          />
        </CardContent>
      </Card>
    </div>
  );
}
