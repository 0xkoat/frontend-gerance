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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { updateSoarPlaybookSchema } from "@/lib/validations/soar";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { Severity } from "@/types/security";
import type { SoarPlaybook } from "@/types/soar";

type ActiveDialog = "edit" | "delete" | null;

const SEVERITY_OPTIONS = Object.values(Severity);

// Admin-only, matching the backend's routes — this component is only ever rendered when
// the caller already gated the page to Admin (Analyst/Viewer get the read-only
// PlaybooksTable with no actions column at all).
export function PlaybookRowActions({ playbook }: { playbook: SoarPlaybook }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [severity, setSeverity] = useState<Severity>(
    playbook.triggerCondition.severity,
  );
  const [isActive, setIsActive] = useState(playbook.isActive);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function closeDialogs() {
    setActiveDialog(null);
    setFormError(null);
    setFieldErrors({});
    setSeverity(playbook.triggerCondition.severity);
    setIsActive(playbook.isActive);
  }

  async function handleEditSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const actionsText = String(formData.get("actions") ?? "").trim();

    let actions: unknown;
    try {
      actions = actionsText ? JSON.parse(actionsText) : {};
    } catch {
      setFieldErrors({ actions: "Enter valid JSON" });
      return;
    }

    const parsed = updateSoarPlaybookSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      triggerCondition: { severity },
      actions,
      isActive,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/soar/playbooks/${playbook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update playbook");
        return;
      }
      toast.success(`${parsed.data.name ?? playbook.name} updated`);
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
      const res = await fetch(`/api/soar/playbooks/${playbook.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Most likely a 409: the backend's own message already points at isActive: false
        // as the alternative — shown as-is rather than a generic error.
        toast.error(data.message ?? "Could not delete playbook");
        return;
      }
      toast.success(`${playbook.name} deleted`);
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
              aria-label={`Actions for ${playbook.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit playbook
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("delete")}
          >
            Delete playbook
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {playbook.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.name}>
                <FieldLabel htmlFor={`name-${playbook.id}`}>Name</FieldLabel>
                <Input
                  id={`name-${playbook.id}`}
                  name="name"
                  defaultValue={playbook.name}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.name}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`severity-${playbook.id}`}>
                  Triggers on severity
                </FieldLabel>
                <Select
                  value={severity}
                  onValueChange={(value) =>
                    value && setSeverity(value as Severity)
                  }
                  disabled={pending}
                >
                  <SelectTrigger
                    id={`severity-${playbook.id}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={!!fieldErrors.actions}>
                <FieldLabel htmlFor={`actions-${playbook.id}`}>
                  Actions (JSON)
                </FieldLabel>
                <textarea
                  id={`actions-${playbook.id}`}
                  name="actions"
                  rows={4}
                  defaultValue={JSON.stringify(playbook.actions, null, 2)}
                  disabled={pending}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <FieldError>{fieldErrors.actions}</FieldError>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={pending}
                />
                Active
              </label>
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
            <AlertDialogTitle>Delete {playbook.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Blocked if this playbook still has
              executions — deactivate it instead in that case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete playbook"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
