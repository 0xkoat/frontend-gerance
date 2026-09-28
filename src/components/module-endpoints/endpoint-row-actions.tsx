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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { moduleEndpointSchema } from "@/lib/validations/modules";
import { fieldErrorsFromZod } from "@/lib/zod-errors";
import {
  ModuleProtocol,
  type ConnectionTestResult,
  type ModuleEndpoint,
} from "@/types/modules";

// Integration Admin actions for one module endpoint: edit where it lives, and ask the
// backend whether anything answers there.
export function EndpointRowActions({ endpoint }: { endpoint: ModuleEndpoint }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [protocol, setProtocol] = useState<ModuleProtocol>(endpoint.protocol);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const configured = endpoint.host !== null && endpoint.port !== null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setProtocol(endpoint.protocol);
      setFormError(null);
      setFieldErrors({});
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = moduleEndpointSchema.safeParse({
      protocol,
      host: String(formData.get("host") ?? ""),
      port: String(formData.get("port") ?? ""),
      path: String(formData.get("path") ?? ""),
    });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/module-endpoints/${endpoint.moduleName}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Could not save the endpoint");
        return;
      }
      toast.success(`${endpoint.moduleName} endpoint saved`);
      setOpen(false);
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch(
        `/api/module-endpoints/${endpoint.moduleName}/test`,
        { method: "POST" },
      );
      const data = (await res.json()) as ConnectionTestResult & {
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? "Connection test failed");
      } else if (data.reachable) {
        toast.success(`${endpoint.moduleName} is reachable`, {
          description: `Answered in ${data.latencyMs} ms.`,
        });
      } else {
        toast.error(`${endpoint.moduleName} is not reachable`, {
          description: data.error,
        });
      }
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleTest}
        disabled={!configured || testing}
      >
        {testing ? "Testing..." : "Test connection"}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button size="sm">Edit</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{endpoint.moduleName} endpoint</DialogTitle>
            <DialogDescription>
              Where users are sent when they launch {endpoint.moduleName}. Use
              the private address of the single shared instance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`protocol-${endpoint.moduleName}`}>
                  Protocol
                </FieldLabel>
                <Select
                  value={protocol}
                  onValueChange={(value) =>
                    value && setProtocol(value as ModuleProtocol)
                  }
                  disabled={pending}
                >
                  <SelectTrigger
                    id={`protocol-${endpoint.moduleName}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ModuleProtocol).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field data-invalid={!!fieldErrors.host}>
                <FieldLabel htmlFor={`host-${endpoint.moduleName}`}>
                  Host (IP or hostname)
                </FieldLabel>
                <Input
                  id={`host-${endpoint.moduleName}`}
                  name="host"
                  placeholder="10.0.0.5"
                  defaultValue={endpoint.host ?? ""}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.host}</FieldError>
              </Field>

              <Field data-invalid={!!fieldErrors.port}>
                <FieldLabel htmlFor={`port-${endpoint.moduleName}`}>
                  Port
                </FieldLabel>
                <Input
                  id={`port-${endpoint.moduleName}`}
                  name="port"
                  inputMode="numeric"
                  placeholder="443"
                  defaultValue={endpoint.port ?? ""}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.port}</FieldError>
              </Field>

              <Field data-invalid={!!fieldErrors.path}>
                <FieldLabel htmlFor={`path-${endpoint.moduleName}`}>
                  Path
                </FieldLabel>
                <Input
                  id={`path-${endpoint.moduleName}`}
                  name="path"
                  placeholder="/"
                  defaultValue={endpoint.path}
                  disabled={pending}
                />
                <FieldError>{fieldErrors.path}</FieldError>
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
    </div>
  );
}
