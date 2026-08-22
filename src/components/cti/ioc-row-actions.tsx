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
import { updateCtiIocSchema } from "@/lib/validations/cti";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import type { CtiIoc } from "@/types/cti";

type ActiveDialog = "edit" | "delete" | null;

// Only confidence/source are editable — type/value are the IOC's identity, not exposed in
// this dialog at all (see updateCtiIocSchema's own comment). No status, no assignee: CTI is
// the one module with neither, so this has no AssignmentControl/StatusTransitionMenu.
export function IocRowActions({ ioc }: { ioc: CtiIoc }) {
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
      confidence: String(formData.get("confidence") ?? ""),
      source: String(formData.get("source") ?? ""),
    };

    const parsed = updateCtiIocSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/cti/iocs/${ioc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update IOC");
        return;
      }
      toast.success(`${ioc.value} updated`);
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
      const res = await fetch(`/api/cti/iocs/${ioc.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message ?? "Could not delete IOC");
        return;
      }
      toast.success(`${ioc.value} deleted`);
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
              aria-label={`Actions for ${ioc.value}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit IOC
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("delete")}
          >
            Delete IOC
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {ioc.value}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.confidence}>
                <FieldLabel htmlFor={`confidence-${ioc.id}`}>
                  Confidence (0-100)
                </FieldLabel>
                <Input
                  id={`confidence-${ioc.id}`}
                  name="confidence"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={ioc.confidence}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.confidence}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.source}>
                <FieldLabel htmlFor={`source-${ioc.id}`}>Source</FieldLabel>
                <Input
                  id={`source-${ioc.id}`}
                  name="source"
                  defaultValue={ioc.source}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.source}</FieldError>
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
            <AlertDialogTitle>Delete {ioc.value}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete IOC"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
