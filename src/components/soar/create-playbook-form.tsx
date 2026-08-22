"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createSoarPlaybookSchema } from "@/lib/validations/soar";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { Severity } from "@/types/security";

const SEVERITY_OPTIONS = Object.values(Severity);

// `actions` is a raw JSON textarea, not a structured form — the backend accepts an open
// object with no shape constraint (SOAR execution is simulated, see this module's own
// CLAUDE.md decision), so there's nothing to build a real form against.
export function CreatePlaybookForm() {
  const router = useRouter();
  const [severity, setSeverity] = useState<Severity>(Severity.HIGH);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const actionsText = String(formData.get("actions") ?? "").trim();

    let actions: unknown;
    try {
      actions = actionsText ? JSON.parse(actionsText) : {};
    } catch {
      setFieldErrors({ actions: "Enter valid JSON" });
      return;
    }

    const parsed = createSoarPlaybookSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      triggerCondition: { severity },
      actions,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/soar/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create playbook");
        return;
      }

      toast.success(`${parsed.data.name} created`);
      (event.target as HTMLFormElement).reset();
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
        <Field data-invalid={!!fieldErrors.name}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" disabled={pending} />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="severity">Triggers on severity</FieldLabel>
          <Select
            value={severity}
            onValueChange={(value) => value && setSeverity(value as Severity)}
            disabled={pending}
          >
            <SelectTrigger id="severity" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!fieldErrors.actions}>
          <FieldLabel htmlFor="actions">Actions (JSON)</FieldLabel>
          <textarea
            id="actions"
            name="actions"
            rows={4}
            placeholder={'{ "notify": "soc-team" }'}
            disabled={pending}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <FieldError>{fieldErrors.actions}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating..." : "Create playbook"}
        </Button>
      </FieldGroup>
    </form>
  );
}
