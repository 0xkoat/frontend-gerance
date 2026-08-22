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
  FieldSeparator,
} from "@/components/ui/field";
import { createTenantSchema } from "@/lib/validations/tenants";
import { fieldErrorsFromZod } from "@/lib/zod-errors";

export function CreateTenantForm() {
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
      tenantName: String(formData.get("tenantName") ?? ""),
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
    };

    const parsed = createTenantSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create tenant");
        return;
      }

      toast.success(`${data.tenant.name} created`, {
        description: `${data.admin.name} is now this tenant's Admin — they'll set their own password on first login.`,
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
        <Field data-invalid={!!fieldErrors.tenantName}>
          <FieldLabel htmlFor="tenantName">Tenant name</FieldLabel>
          <Input id="tenantName" name="tenantName" disabled={pending} />
          <FieldError>{fieldErrors.tenantName}</FieldError>
        </Field>

        <FieldSeparator>First Admin account</FieldSeparator>

        <Field data-invalid={!!fieldErrors.name}>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input id="name" name="name" disabled={pending} />
          <FieldError>{fieldErrors.name}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.email}>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input id="email" name="email" type="email" disabled={pending} />
          <FieldError>{fieldErrors.email}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.phoneNumber}>
          <FieldLabel htmlFor="phoneNumber">Phone number</FieldLabel>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            placeholder="+216 ..."
            disabled={pending}
          />
          <FieldError>{fieldErrors.phoneNumber}</FieldError>
        </Field>

        <Field data-invalid={!!fieldErrors.password}>
          <FieldLabel htmlFor="password">Temporary password</FieldLabel>
          <Input
            id="password"
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
          {pending ? "Creating..." : "Create tenant"}
        </Button>
      </FieldGroup>
    </form>
  );
}
