"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
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
import { createTicketSchema } from "@/lib/validations/tickets";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import { ModuleName } from "@/types/modules";
import { TICKET_CATEGORY_LABELS, TicketCategory } from "@/types/tickets";

export function CreateTicketForm() {
  const router = useRouter();
  const [category, setCategory] = useState<TicketCategory>(
    TicketCategory.MODULES,
  );
  const [moduleName, setModuleName] = useState<ModuleName | undefined>();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = createTicketSchema.safeParse({
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      category,
      moduleName: category === TicketCategory.MODULES ? moduleName : undefined,
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not create the ticket");
        return;
      }
      toast.success("Ticket sent", {
        description:
          category === TicketCategory.MODULES
            ? "Your Admins and the Integration Admin were notified."
            : "Your Admins were notified.",
      });
      (event.target as HTMLFormElement).reset();
      setModuleName(undefined);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!fieldErrors.title}>
          <FieldLabel htmlFor="ticket-title">Title</FieldLabel>
          <Input id="ticket-title" name="title" disabled={pending} />
          <FieldError>{fieldErrors.title}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="ticket-category">Category</FieldLabel>
          <Select
            value={category}
            onValueChange={(value) =>
              value && setCategory(value as TicketCategory)
            }
            disabled={pending}
          >
            <SelectTrigger id="ticket-category" className="w-full">
              <SelectValue>
                {(value: TicketCategory) => TICKET_CATEGORY_LABELS[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(TicketCategory).map((c) => (
                <SelectItem key={c} value={c}>
                  {TICKET_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {category === TicketCategory.MODULES && (
          <Field data-invalid={!!fieldErrors.moduleName}>
            <FieldLabel htmlFor="ticket-module">Module</FieldLabel>
            <Select
              value={moduleName ?? null}
              onValueChange={(value) =>
                value && setModuleName(value as ModuleName)
              }
              disabled={pending}
            >
              <SelectTrigger id="ticket-module" className="w-full">
                <SelectValue placeholder="Choose a module" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ModuleName).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{fieldErrors.moduleName}</FieldError>
          </Field>
        )}

        <Field data-invalid={!!fieldErrors.description}>
          <FieldLabel htmlFor="ticket-description">Description</FieldLabel>
          <textarea
            id="ticket-description"
            name="description"
            rows={5}
            disabled={pending}
            placeholder="What happened, when, and what you already tried."
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <FieldError>{fieldErrors.description}</FieldError>
        </Field>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending..." : "Send ticket"}
        </Button>
      </FieldGroup>
    </form>
  );
}
