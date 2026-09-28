"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MODULE_DESCRIPTIONS } from "@/lib/modules";
import { useLaunchModule } from "@/components/modules/use-launch-module";
import type { AvailableModule } from "@/types/modules";

export function ModuleTiles({
  modules,
  showLevels,
}: {
  modules: AvailableModule[];
  // Admins see each module's minimum analyst level; Analysts only get the ones they can open.
  showLevels: boolean;
}) {
  const { launch, launching } = useLaunchModule();

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No modules are available to you yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((m) => (
        <Card key={m.moduleName}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {m.moduleName}
              {showLevels && (
                <Badge variant="secondary">Min level {m.minAnalystLevel}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {MODULE_DESCRIPTIONS[m.moduleName]}
            </p>
            {m.canLaunch ? (
              <Button
                onClick={() => launch(m.moduleName)}
                disabled={launching !== null}
                className="w-full"
              >
                <ExternalLink className="size-4" />
                {launching === m.moduleName
                  ? "Opening..."
                  : `Open ${m.moduleName}`}
              </Button>
            ) : (
              <Button disabled variant="outline" className="w-full">
                Not configured yet
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
