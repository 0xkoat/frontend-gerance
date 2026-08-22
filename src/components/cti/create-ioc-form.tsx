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
import { createCtiIocSchema } from "@/lib/validations/cti";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { CtiIocType } from "@/types/cti";

const TYPE_OPTIONS = Object.values(CtiIocType);

export function CreateIocForm() {
  const router = useRouter();
  const [type, setType] = useState<CtiIocType>(CtiIocType.IP);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      type,
      value: String(formData.get("value") ?? ""),
      confidence: String(formData.get("confidence") ?? ""),
      source: String(formData.get("source") ?? ""),
    };

    const parsed = createCtiIocSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/cti/iocs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create IOC");
        return;
      }

      toast.success(`${parsed.data.value} added`);
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
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Select
            value={type}
            onValueChange={(value) => value && setType(value as CtiIocType)}
            disabled={pending}
          >
            <SelectTrigger id="type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={!!fieldErrors.value}>
          <FieldLabel htmlFor="value">Value</FieldLabel>
          <Input
            id="value"
            name="value"
            placeholder="185.220.101.47"
            disabled={pending}
          />
          <FieldError>{fieldErrors.value}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.confidence}>
          <FieldLabel htmlFor="confidence">Confidence (0-100)</FieldLabel>
          <Input
            id="confidence"
            name="confidence"
            type="number"
            min={0}
            max={100}
            defaultValue={50}
            disabled={pending}
          />
          <FieldError>{fieldErrors.confidence}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.source}>
          <FieldLabel htmlFor="source">Source</FieldLabel>
          <Input
            id="source"
            name="source"
            placeholder="internal analyst, feed name, ..."
            disabled={pending}
          />
          <FieldError>{fieldErrors.source}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Adding..." : "Add IOC"}
        </Button>
      </FieldGroup>
    </form>
  );
}
