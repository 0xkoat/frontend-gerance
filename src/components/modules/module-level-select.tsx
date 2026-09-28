"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnalystLevel } from "@/types/auth";
import type { ModuleName } from "@/types/modules";

// Tenant Admin control for the lowest analyst level allowed to open a module in their
// tenant. Admins themselves can always open every active module.
export function ModuleLevelSelect({
  moduleName,
  level,
}: {
  moduleName: ModuleName;
  level: AnalystLevel;
}) {
  const router = useRouter();
  const [value, setValue] = useState<AnalystLevel>(level);
  const [pending, setPending] = useState(false);

  async function change(next: AnalystLevel) {
    const previous = value;
    setValue(next);
    setPending(true);
    try {
      const res = await fetch(`/api/modules/${moduleName}/level`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minAnalystLevel: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValue(previous);
        toast.error(data.message ?? "Could not change the level");
        return;
      }
      toast.success(`${moduleName} now requires ${next} or higher`);
      router.refresh();
    } catch {
      setValue(previous);
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => next && change(next as AnalystLevel)}
      disabled={pending}
    >
      <SelectTrigger
        className="w-28"
        aria-label={`Minimum analyst level for ${moduleName}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(AnalystLevel).map((l) => (
          <SelectItem key={l} value={l}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
