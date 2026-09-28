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
import { personFieldsSchema } from "@/lib/validations/users";
import { fieldErrorsFromZod } from "@/lib/zod-errors";

export function CreateIntegrationAdminForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = personFieldsSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/integration-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create Integration Admin");
        return;
      }

      toast.success(`${data.name} created`, {
        description:
          "They'll be asked to set their own password on first login.",
      });
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
          <FieldLabel htmlFor="ia-name">Full name</FieldLabel>
          <Input id="ia-name" name="name" disabled={pending} />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.email}>
          <FieldLabel htmlFor="ia-email">Work email</FieldLabel>
          <Input id="ia-email" name="email" type="email" disabled={pending} />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.phoneNumber}>
          <FieldLabel htmlFor="ia-phoneNumber">Phone number</FieldLabel>
          <Input
            id="ia-phoneNumber"
            name="phoneNumber"
            placeholder="+216 ..."
            disabled={pending}
          />
          <FieldError>{fieldErrors.phoneNumber}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="ia-password">Temporary password</FieldLabel>
          <Input
            id="ia-password"
            name="password"
            type="password"
            disabled={pending}
          />
          <FieldError>{fieldErrors.password}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating..." : "Create Integration Admin"}
        </Button>
      </FieldGroup>
    </form>
  );
}
