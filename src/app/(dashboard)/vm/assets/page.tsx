import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/session";
import { backendFetchAuthedNoRefresh } from "@/lib/backend";
import { AssetsTable } from "@/components/vm/assets-table";
import { CreateAssetForm } from "@/components/vm/create-asset-form";
import type { VmAsset } from "@/types/vm";
import { UserRole } from "@/types/auth";

export default async function VmAssetsPage() {
  const session = await requireSession();

  const res = await backendFetchAuthedNoRefresh("/vm/assets");
  const assets: VmAsset[] = res.ok ? await res.json() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">VM Assets</h1>
          <p className="text-sm text-muted-foreground">
            The assets vulnerabilities in this tenant are found on.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/vm">Back to vulnerabilities</Link>}
        />
      </div>

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
              {assets.length} {assets.length === 1 ? "asset" : "assets"}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <AssetsTable assets={assets} currentUserRole={session.role} />
          </CardContent>
        </Card>

        {session.role !== UserRole.VIEWER && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Add asset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CreateAssetForm />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
