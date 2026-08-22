import { requireSession } from "@/lib/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { RequestPasswordChangeForm } from "@/components/auth/request-password-change-form";

export default async function ChangePasswordPage() {
  // Must stay reachable even while mustChangePassword is true — that's exactly what this
  // page exists to clear.
  const session = await requireSession({ allowMustChangePassword: true });
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
            : "There's no self-service change anymore — your administrator sets a new password for you. This just notifies them."}
        </p>
      </div>

      {forced ? <ChangePasswordForm /> : <RequestPasswordChangeForm />}
    </div>
  );
}
