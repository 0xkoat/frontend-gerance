"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RequestPasswordChangeForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me/request-password-change", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({ message: null }));
      if (!res.ok) {
        setError(data.message ?? "Could not send the request. Try again.");
        return;
      }
      setMessage(
        data.message ??
          "Your administrator has been notified of your password change request.",
      );
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={handleClick} disabled={pending} className="w-full">
        {pending ? "Sending..." : "Request a password change"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
