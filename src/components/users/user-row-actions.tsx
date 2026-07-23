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
  DialogDescription,
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
import {
  updateUserSchema,
  changeRoleSchema,
  resetPasswordSchema,
} from "@/lib/validations/users";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import type { TenantUser } from "@/components/users/users-table";
import { UserRole } from "@/types/auth";

type ActiveDialog = "edit" | "role" | "reset" | "delete" | null;

const ROLE_OPTIONS = [
  UserRole.ADMIN,
  UserRole.ANALYST,
  UserRole.VIEWER,
] as const;

// Every action here has a real backend endpoint that already rejects self-targeting 
//  self-delete, self-role-change, and Admin-reset-on-self are all
// explicit ForbiddenExceptions, to stop a stolen bearer token from becoming permanent
// account takeover). Hiding these actions on the caller's own row is UX on top of that
// enforcement, not a substitute for it — the Route Handlers still relay whatever the
// backend decides.
export function UserRowActions({
  user,
  currentUserId,
}: {
  user: TenantUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  if (user.id === currentUserId) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  function close() {
    setActiveDialog(null);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${user.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setActiveDialog("edit")}>
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("role")}>
            Change role
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveDialog("reset")}>
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setActiveDialog("delete")}
          >
            Delete user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditUserDialog
        user={user}
        open={activeDialog === "edit"}
        onOpenChange={(open) => setActiveDialog(open ? "edit" : null)}
        onSuccess={close}
      />
      <ChangeRoleDialog
        user={user}
        open={activeDialog === "role"}
        onOpenChange={(open) => setActiveDialog(open ? "role" : null)}
        onSuccess={close}
      />
      <ResetPasswordDialog
        user={user}
        open={activeDialog === "reset"}
        onOpenChange={(open) => setActiveDialog(open ? "reset" : null)}
        onSuccess={close}
      />
      <DeleteUserDialog
        user={user}
        open={activeDialog === "delete"}
        onOpenChange={(open) => setActiveDialog(open ? "delete" : null)}
        onSuccess={close}
      />
    </>
  );
}

interface DialogProps {
  user: TenantUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function EditUserDialog({ user, open, onOpenChange, onSuccess }: DialogProps) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
    };

    const parsed = updateUserSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not update user");
        return;
      }
      toast.success(`${data.name} updated`);
      onSuccess();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.name}</DialogTitle>
          <DialogDescription>
            Update this user&apos;s profile fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!fieldErrors.name}>
              <FieldLabel htmlFor={`name-${user.id}`}>Full name</FieldLabel>
              <Input
                id={`name-${user.id}`}
                name="name"
                defaultValue={user.name}
                disabled={pending}
              />
              <FieldError>{fieldErrors.name}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.email}>
              <FieldLabel htmlFor={`email-${user.id}`}>Work email</FieldLabel>
              <Input
                id={`email-${user.id}`}
                name="email"
                type="email"
                defaultValue={user.email}
                disabled={pending}
              />
              <FieldError>{fieldErrors.email}</FieldError>
            </Field>
            <Field data-invalid={!!fieldErrors.phoneNumber}>
              <FieldLabel htmlFor={`phone-${user.id}`}>Phone number</FieldLabel>
              <Input
                id={`phone-${user.id}`}
                name="phoneNumber"
                defaultValue={user.phoneNumber}
                disabled={pending}
              />
              <FieldError>{fieldErrors.phoneNumber}</FieldError>
            </Field>
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeRoleDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DialogProps) {
  const [role, setRole] = useState<string>(user.role);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = changeRoleSchema.safeParse({ role });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid role");
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not change role");
        return;
      }
      toast.success(`${data.name} is now ${data.role}`);
      onSuccess();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change {user.name}&apos;s role</DialogTitle>
          <DialogDescription>
            Currently{" "}
            <span className="font-medium text-foreground">{user.role}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`role-${user.id}`}>New role</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) => value && setRole(value)}
                disabled={pending}
              >
                <SelectTrigger id={`role-${user.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
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
              {pending ? "Saving..." : "Change role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DialogProps) {
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
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not reset password");
        return;
      }
      toast.success(`${user.name}'s password was reset`, {
        description:
          "They'll be asked to set their own password on next login.",
      });
      onSuccess();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset {user.name}&apos;s password</DialogTitle>
          <DialogDescription>
            Sets a new password directly — they&apos;ll need to change it on
            their next login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={!!fieldError}>
              <FieldLabel htmlFor={`newPassword-${user.id}`}>
                New password
              </FieldLabel>
              <Input
                id={`newPassword-${user.id}`}
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

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DialogProps) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message ?? "Could not delete user");
        return;
      }
      toast.success(`${user.name} deleted`);
      onSuccess();
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes their account. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting..." : "Delete user"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
