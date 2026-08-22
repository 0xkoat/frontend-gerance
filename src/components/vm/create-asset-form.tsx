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
import { createVmAssetSchema } from "@/lib/validations/vm";
import { fieldErrorsFromZod } from "@/lib/zod-errors";

export function CreateAssetForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      ip: String(formData.get("ip") ?? ""),
      type: String(formData.get("type") ?? ""),
    };

    const parsed = createVmAssetSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/vm/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create asset");
        return;
      }

      toast.success(`${parsed.data.name} added`);
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

        <Field data-invalid={!!fieldErrors.ip}>
          <FieldLabel htmlFor="ip">IP address</FieldLabel>
          <Input id="ip" name="ip" placeholder="10.0.0.5" disabled={pending} />
          <FieldError>{fieldErrors.ip}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.type}>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Input
            id="type"
            name="type"
            placeholder="server, workstation, ..."
            disabled={pending}
          />
          <FieldError>{fieldErrors.type}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Adding..." : "Add asset"}
        </Button>
      </FieldGroup>
    </form>
  );
}
