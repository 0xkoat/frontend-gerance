"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { resetPasswordSchema } from "@/lib/validations/users";

// Reuses POST /api/users/:id/reset-password — the backend now accepts a Super Admin caller
// there too, but only when the target Admin has no co-Admin in their tenant (see
// UsersService.resetSoleAdminPassword); TenantAdminsTable only renders this button in that
// exact case, so the request is expected to succeed, not just attempted speculatively.
export function ResetAdminPasswordButton({
  adminId,
  adminName,
}: {
  adminId: string;
  adminName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      newPassword: String(formData.get("newPassword") ?? ""),
    });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid password");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/users/${adminId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not reset password");
        return;
      }
      toast.success(`${adminName}'s password was reset`, {
        description: "They'll be asked to set their own password on next login.",
      });
      setOpen(false);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Reset password
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {adminName}&apos;s password</DialogTitle>
          <DialogDescription>
            This tenant has no other Admin to do this instead. Sets a new
            password directly — they&apos;ll need to change it on their next
            login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor={`newPassword-${adminId}`}>
                New password
              </FieldLabel>
              <Input
                id={`newPassword-${adminId}`}
                name="newPassword"
                type="password"
                disabled={pending}
              />
              <FieldError>{fieldError}</FieldError>
            </Field>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
