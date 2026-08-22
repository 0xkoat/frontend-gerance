import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/severity";
import { hrefForFeedEntry } from "@/lib/asset-feed";
import type { AssetFeedEntry } from "@/types/assets";

// Read-only by design — the feed is a cross-module triage/navigation view, not a place to
// mutate records (each source module's own page already has AssignmentControl/
// StatusTransitionMenu for that; duplicating them here would mean two places a status
// change could be made from, with no single row shape to key a shared component off of —
// `status` is a raw per-module string, see asset-feed.ts's own comment). `userNameById` is
// only populated for an Admin session (GET /users is Admin-only on the backend, same
// constraint as every module list page since Phase 3) — Analyst/Viewer still see "You" on
// their own assignments and "Assigned"/"Unassigned" otherwise, never a blank cell.
export function FeedTable({
  entries,
  currentUserId,
  userNameById,
}: {
  entries: AssetFeedEntry[];
  currentUserId: string;
  userNameById: Record<string, string>;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No events found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Severity</TableHead>
          <TableHead>Event</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Badge
                variant="outline"
                className="gap-1.5 font-medium"
                style={{
                  borderColor: SEVERITY_COLOR[entry.severity],
                  color: SEVERITY_COLOR[entry.severity],
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[entry.severity] }}
                  aria-hidden
                />
                {SEVERITY_LABEL[entry.severity]}
              </Badge>
            </TableCell>
            <TableCell>
              <Link
                href={hrefForFeedEntry(entry)}
                className="font-medium underline-offset-4 hover:underline"
              >
                {entry.summary}
              </Link>
              <p className="text-xs text-muted-foreground">{entry.type}</p>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{entry.source}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {entry.status ?? "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {entry.assignedToUserId === null
                ? "Unassigned"
                : entry.assignedToUserId === currentUserId
                  ? "You"
                  : (userNameById[entry.assignedToUserId] ?? "Assigned")}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
              {new Date(entry.timestamp).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
