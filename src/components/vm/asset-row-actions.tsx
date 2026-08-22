"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
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
import { updateVmAssetSchema } from "@/lib/validations/vm";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import type { VmAsset } from "@/types/vm";

type ActiveDialog = "edit" | "delete" | null;

// Same shape as UserRowActions (src/components/users/user-row-actions.tsx): one dropdown,
// dialogs mounted underneath it, toggled by which one is "active" rather than each managing
// its own open state.
export function AssetRowActions({ asset }: { asset: VmAsset }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function closeDialogs() {
    setActiveDialog(null);
    setFormError(null);
    setFieldErrors({});
  }

  async function handleEditSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      ip: String(formData.get("ip") ?? ""),
      type: String(formData.get("type") ?? ""),
    };

    const parsed = updateVmAssetSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/vm/assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update asset");
        return;
      }
      toast.success(`${parsed.data.name ?? asset.name} updated`);
      closeDialogs();
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      const res = await fetch(`/api/vm/assets/${asset.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Most likely a 409: vulnerabilities still reference this asset — show the
        // backend's own message rather than a generic one.
        toast.error(data.message ?? "Could not delete asset");
        return;
      }
      toast.success(`${asset.name} deleted`);
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
              aria-label={`Actions for ${asset.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit asset
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("delete")}
          >
            Delete asset
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {asset.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.name}>
                <FieldLabel htmlFor={`name-${asset.id}`}>Name</FieldLabel>
                <Input
                  id={`name-${asset.id}`}
                  name="name"
                  defaultValue={asset.name}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.name}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.ip}>
                <FieldLabel htmlFor={`ip-${asset.id}`}>IP address</FieldLabel>
                <Input
                  id={`ip-${asset.id}`}
                  name="ip"
                  defaultValue={asset.ip}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.ip}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.type}>
                <FieldLabel htmlFor={`type-${asset.id}`}>Type</FieldLabel>
                <Input
                  id={`type-${asset.id}`}
                  name="type"
                  defaultValue={asset.type}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.type}</FieldError>
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
        open={activeDialog === "delete"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {asset.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Blocked if any vulnerability still
              references this asset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete asset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
