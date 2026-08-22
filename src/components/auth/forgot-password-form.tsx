"use client";

import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: String(formData.get("email") ?? ""),
    });

    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({ message: null }));
      if (!res.ok) {
        setFieldError(data.message ?? "Could not send the request. Try again.");
        return;
      }
      // Same generic message whether or not the account exists — see the route handler.
      setMessage(
        data.message ??
          "If an account exists with this email, your administrator has been notified.",
      );
    } catch {
      setFieldError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!fieldError}>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="analyst@company.com"
            disabled={pending}
          />
          <FieldError>{fieldError}</FieldError>
        </Field>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending..." : "Send reset request"}
        </Button>
      </FieldGroup>
    </form>
  );
}
