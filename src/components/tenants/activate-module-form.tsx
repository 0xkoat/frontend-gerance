"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activateTenantModuleSchema } from "@/lib/validations/tenants";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { ModuleName } from "@/types/security";

// `config` is a raw JSON textarea, not a structured form — ActivateTenantModuleDto accepts
// an open, unconstrained object (each module's own config shape isn't defined anywhere in
// this codebase yet, same "nothing to build a structured form against" reasoning as SOAR's
// `actions` field). Phase 11 (2026-08-07).
export function ActivateModuleForm({
  tenantId,
  alreadyActive,
}: {
  tenantId: string;
  // Modules this tenant already has a TenantModule row for — filtered out of the picker so
  // the form doesn't offer a choice guaranteed to 409 (activateModule enforces one row per
  // tenant/module pair). Re-activating an existing module is PATCH via
  // TenantModuleRowActions, not this form.
  alreadyActive: ModuleName[];
}) {
  const router = useRouter();
  const available = Object.values(ModuleName).filter(
    (m) => !alreadyActive.includes(m),
  );
  const [moduleName, setModuleName] = useState<ModuleName | undefined>(
    available[0],
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Every module is already configured for this tenant.
      </p>
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const configText = String(formData.get("config") ?? "").trim();

    let config: unknown;
    try {
      config = configText ? JSON.parse(configText) : undefined;
    } catch {
      setFieldErrors({ config: "Enter valid JSON" });
      return;
    }

    const parsed = activateTenantModuleSchema.safeParse({
      moduleName,
      config,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not activate module");
        return;
      }

      toast.success(`${parsed.data.moduleName} activated`);
      (event.target as HTMLFormElement).reset();
      setModuleName(available.find((m) => m !== parsed.data.moduleName));
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="moduleName">Module</FieldLabel>
          <Select
            value={moduleName}
            onValueChange={(value) =>
              value && setModuleName(value as ModuleName)
            }
            disabled={pending}
          >
            <SelectTrigger id="moduleName" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {available.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!fieldErrors.config}>
          <FieldLabel htmlFor="config">Config (JSON, optional)</FieldLabel>
          <textarea
            id="config"
            name="config"
            rows={3}
            placeholder={'{ "apiKey": "..." }'}
            disabled={pending}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <FieldError>{fieldErrors.config}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Activating..." : "Activate module"}
        </Button>
      </FieldGroup>
    </form>
  );
}
