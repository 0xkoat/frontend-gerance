import type { ZodError } from "zod";

// Zod's default behavior is to collect every failing check per field, not stop at the
// first — e.g. a 5-character all-lowercase password fails min-length, uppercase, number,
// AND symbol checks at once. Keeping only the *first* issue per field (declaration order,
// so "too short" before "needs a symbol") shows the most fundamental problem first, instead
// of whichever check happens to run last.
export function fieldErrorsFromZod(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    errors[key] ??= issue.message;
  }
  return errors;
}
