import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { requireSession } from "@/lib/session";
import { MODULES, isModuleSlug } from "@/lib/nav";

// One generic stub instead of six near-identical files (siem/, soar/, cti/, edr/, dfir/,
// vm/) — this route only exists because the sidebar nav (matching Figure 2's mockup) needs
// somewhere to point that isn't a 404. Swap this file for a real src/app/(dashboard)/siem/
// folder once that module has actual backend endpoints to call.
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  await requireSession();
  const { module } = await params;

  if (!isModuleSlug(module)) {
    notFound();
  }

  const label = MODULES.find((m) => m.slug === module)!.label;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">{label}</h1>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          The {label} module isn&apos;t implemented on the backend yet — only
          auth, users, and tenants exist so far. This page is a placeholder so
          the nav is navigable.
        </CardContent>
      </Card>
    </div>
  );
}
