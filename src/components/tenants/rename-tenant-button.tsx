"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { updateTenantSchema } from "@/lib/validations/tenants";
import { fieldErrorsFromZod } from "@/lib/zod-errors";

// Phase 11 (2026-08-07) — PATCH /tenants/:id has existed on the backend since before this
// session started; nothing on the frontend called it until now.
export function RenameTenantButton({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = updateTenantSchema.safeParse({
      name: String(formData.get("name") ?? ""),
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message ?? "Could not rename tenant");
        return;
      }

      toast.success(`Renamed to ${parsed.data.name}`);
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
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Rename ${tenantName}`}
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename tenant</DialogTitle>
          <DialogDescription>
            This only changes the tenant&apos;s display name — users and module
            configuration are unaffected.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <Field data-invalid={!!fieldErrors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              name="name"
              defaultValue={tenantName}
              disabled={pending}
            />
            <FieldError>{fieldErrors.name}</FieldError>
          </Field>

          {formError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
