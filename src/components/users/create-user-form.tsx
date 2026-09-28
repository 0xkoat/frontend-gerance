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
  RoleLevelFields,
  type TenantRole,
} from "@/components/users/role-level-fields";
import { createUserSchema } from "@/lib/validations/users";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { AnalystLevel, UserRole } from "@/types/auth";

export function CreateUserForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<TenantRole>(UserRole.ANALYST);
  const [analystLevel, setAnalystLevel] = useState<AnalystLevel>(
    AnalystLevel.L1,
  );

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      role,
      analystLevel: role === UserRole.ANALYST ? analystLevel : undefined,
    };

    const parsed = createUserSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not create user");
        return;
      }

      toast.success(`${data.name} created`, {
        description:
          "They'll be asked to set their own password on first login.",
      });
      (event.target as HTMLFormElement).reset();
      setRole(UserRole.ANALYST);
      setAnalystLevel(AnalystLevel.L1);
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

        <RoleLevelFields
          idPrefix="new-user"
          role={role}
          analystLevel={analystLevel}
          onRoleChange={setRole}
          onLevelChange={setAnalystLevel}
          levelError={fieldErrors.analystLevel}
          disabled={pending}
        />

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating..." : "Create user"}
        </Button>
      </FieldGroup>
    </form>
  );
}
