"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateTenantModuleSchema } from "@/lib/validations/tenants";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import type { TenantModule } from "@/types/security";

type ActiveDialog = "edit" | "remove" | null;

// Phase 11 (2026-08-07) — mirrors src/components/soar/playbook-row-actions.tsx's
// edit-dialog/delete-confirm-dialog shape closely (isActive toggle + raw JSON textarea,
// same reasoning as ActivateModuleForm for why config has no structured fields).
export function TenantModuleRowActions({
  tenantId,
  module: tenantModule,
}: {
  tenantId: string;
  module: TenantModule;
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [isActive, setIsActive] = useState(tenantModule.isActive);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function closeDialogs() {
    setActiveDialog(null);
    setFormError(null);
    setFieldErrors({});
    setIsActive(tenantModule.isActive);
  }

  async function handleEditSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const configText = String(formData.get("config") ?? "").trim();

    let config: unknown;
    try {
      config = configText ? JSON.parse(configText) : undefined;
    } catch {
      setFieldErrors({ config: "Enter valid JSON" });
      return;
    }

    const parsed = updateTenantModuleSchema.safeParse({ isActive, config });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/modules/${tenantModule.moduleName}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update module");
        return;
      }
      toast.success(`${tenantModule.moduleName} updated`);
      closeDialogs();
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    setPending(true);
    try {
      const res = await fetch(
        `/api/tenants/${tenantId}/modules/${tenantModule.moduleName}`,
        { method: "DELETE" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not remove module");
        return;
      }
      toast.success(`${tenantModule.moduleName} removed`);
      closeDialogs();
      router.refresh();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${tenantModule.moduleName}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("remove")}
          >
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {tenantModule.moduleName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            <FieldGroup>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={pending}
                />
                Active
              </label>
              <Field data-invalid={!!fieldErrors.config}>
                <FieldLabel htmlFor={`config-${tenantModule.id}`}>
                  Config (JSON)
                </FieldLabel>
                <textarea
                  id={`config-${tenantModule.id}`}
                  name="config"
                  rows={4}
                  defaultValue={
                    tenantModule.config
                      ? JSON.stringify(tenantModule.config, null, 2)
                      : ""
                  }
                  placeholder={'{ "apiKey": "..." }'}
                  disabled={pending}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <FieldError>{fieldErrors.config}</FieldError>
              </Field>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={activeDialog === "remove"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {tenantModule.moduleName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the module&apos;s configuration for this tenant
              entirely — re-activating it later starts from a blank config, not
              what&apos;s here now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRemove}
              disabled={pending}
            >
              {pending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
