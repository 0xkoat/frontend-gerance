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
import { updateEdrEndpointSchema } from "@/lib/validations/edr";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { EdrEndpointStatus, type EdrEndpoint } from "@/types/edr";

type ActiveDialog = "edit" | "delete" | null;

const STATUS_OPTIONS = Object.values(EdrEndpointStatus);

// Same shape as AssetRowActions (src/components/vm/asset-row-actions.tsx) — no create form
// on this module (see the endpoints route's own comment: no manual create route exists),
// just edit and delete.
export function EndpointRowActions({ endpoint }: { endpoint: EdrEndpoint }) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [status, setStatus] = useState<EdrEndpointStatus>(endpoint.status);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function closeDialogs() {
    setActiveDialog(null);
    setFormError(null);
    setFieldErrors({});
    setStatus(endpoint.status);
  }

  async function handleEditSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      hostname: String(formData.get("hostname") ?? ""),
      ip: String(formData.get("ip") ?? ""),
      os: String(formData.get("os") ?? ""),
      status,
    };

    const parsed = updateEdrEndpointSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/edr/endpoints/${endpoint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update endpoint");
        return;
      }
      toast.success(`${parsed.data.hostname ?? endpoint.hostname} updated`);
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
      const res = await fetch(`/api/edr/endpoints/${endpoint.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Most likely a 409: the backend's own message already points at DECOMMISSIONED
        // as the alternative — shown as-is rather than a generic error.
        toast.error(data.message ?? "Could not delete endpoint");
        return;
      }
      toast.success(`${endpoint.hostname} deleted`);
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
              aria-label={`Actions for ${endpoint.hostname}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit endpoint
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("delete")}
          >
            Delete endpoint
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={activeDialog === "edit"}
        onOpenChange={(open) => !open && closeDialogs()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {endpoint.hostname}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} noValidate>
            <FieldGroup>
              <Field data-invalid={!!fieldErrors.hostname}>
                <FieldLabel htmlFor={`hostname-${endpoint.id}`}>
                  Hostname
                </FieldLabel>
                <Input
                  id={`hostname-${endpoint.id}`}
                  name="hostname"
                  defaultValue={endpoint.hostname}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.hostname}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.ip}>
                <FieldLabel htmlFor={`ip-${endpoint.id}`}>
                  IP address
                </FieldLabel>
                <Input
                  id={`ip-${endpoint.id}`}
                  name="ip"
                  defaultValue={endpoint.ip}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.ip}</FieldError>
              </Field>
              <Field data-invalid={!!fieldErrors.os}>
                <FieldLabel htmlFor={`os-${endpoint.id}`}>OS</FieldLabel>
                <Input
                  id={`os-${endpoint.id}`}
                  name="os"
                  defaultValue={endpoint.os}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.os}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor={`status-${endpoint.id}`}>
                  Status
                </FieldLabel>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    value && setStatus(value as EdrEndpointStatus)
                  }
                  disabled={pending}
                >
                  <SelectTrigger
                    id={`status-${endpoint.id}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            <AlertDialogTitle>Delete {endpoint.hostname}?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. Blocked if this endpoint still has
              detections — mark it Decommissioned instead in that case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? "Deleting..." : "Delete endpoint"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
