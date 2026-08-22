import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AssetRowActions } from "@/components/vm/asset-row-actions";
import type { VmAsset } from "@/types/vm";
import type { UserRole } from "@/types/auth";

export function AssetsTable({
  assets,
  currentUserRole,
}: {
  assets: VmAsset[];
  currentUserRole: UserRole;
}) {
  if (assets.length === 0) {
    return <p className="text-sm text-muted-foreground">No assets yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Type</TableHead>
          {currentUserRole !== "VIEWER" && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {assets.map((asset) => (
          <TableRow key={asset.id}>
            <TableCell className="font-medium">{asset.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {asset.ip}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {asset.type}
            </TableCell>
            {currentUserRole !== "VIEWER" && (
              <TableCell>
                <AssetRowActions asset={asset} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
