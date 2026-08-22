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
import { createDfirLinkSchema } from "@/lib/validations/dfir";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { DfirLinkSourceType } from "@/types/dfir";

const SOURCE_TYPE_OPTIONS = Object.values(DfirLinkSourceType);

// sourceId is a raw UUID input — there's no id-typeahead/search endpoint to build anything
// friendlier against (see CLAUDE.md's Phase 8 checklist, a real, noted limitation rather
// than something over-built past what the backend supports).
export function LinkRecordForm({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<DfirLinkSourceType>(
    DfirLinkSourceType.SIEM_ALERT,
  );
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = createDfirLinkSchema.safeParse({
      sourceType,
      sourceId: String(formData.get("sourceId") ?? ""),
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/dfir/incidents/${incidentId}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not link record");
        return;
      }

      toast.success("Record linked");
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
        <Field>
          <FieldLabel htmlFor="sourceType">Source type</FieldLabel>
          <Select
            value={sourceType}
            onValueChange={(value) =>
              value && setSourceType(value as DfirLinkSourceType)
            }
            disabled={pending}
          >
            <SelectTrigger id="sourceType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!fieldErrors.sourceId}>
          <FieldLabel htmlFor="sourceId">Record ID (UUID)</FieldLabel>
          <Input
            id="sourceId"
            name="sourceId"
            placeholder="11111111-1111-4111-8111-111111111111"
            disabled={pending}
          />
          <FieldError>{fieldErrors.sourceId}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Linking..." : "Link record"}
        </Button>
      </FieldGroup>
    </form>
  );
}
