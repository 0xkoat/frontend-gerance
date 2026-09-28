"use client";

import { useState } from "react";
import { toast } from "sonner";
import { navigateTo } from "@/lib/navigate";
import type { ModuleName } from "@/types/modules";

// The backend re-checks subscription, level and endpoint, records the launch, and returns
// the module's URL; the browser then leaves the platform for it (plain redirect for now,
// no credentials are carried to the module).
export function useLaunchModule() {
  const [launching, setLaunching] = useState<ModuleName | null>(null);

  async function launch(moduleName: ModuleName) {
    setLaunching(moduleName);
    try {
      const res = await fetch(`/api/modules/${moduleName}/launch`, {
        method: "POST",
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !data.url) {
        toast.error(data.message ?? `Could not launch ${moduleName}`);
        setLaunching(null);
        return;
      }
      navigateTo(data.url);
    } catch {
      toast.error("Could not reach the server. Try again.");
      setLaunching(null);
    }
  }

  return { launch, launching };
}
