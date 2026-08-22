import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          There&apos;s no self-service reset — your tenant Admin sets a new
          password for you. This just notifies them.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
