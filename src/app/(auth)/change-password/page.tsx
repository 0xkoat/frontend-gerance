import { requireSession } from "@/lib/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await requireSession();
  const forced = session.mustChangePassword;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {forced ? "Set a new password" : "Change password"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {forced
            ? "Your account was created with a temporary password. Set your own before continuing."
            : "Update the password for your account."}
        </p>
      </div>

      <ChangePasswordForm forced={forced} />
    </div>
  );
}
