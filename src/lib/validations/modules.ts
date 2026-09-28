import { z } from "zod";
import { AnalystLevel } from "@/types/auth";
import { ModuleProtocol } from "@/types/modules";

// Light client-side pre-check for an IPv4/IPv6 address or a hostname (internal names like
// "wazuh-01" have no TLD). The backend's isIP/isFQDN check is the source of truth.
const HOST_PATTERN =
  /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$|^[0-9A-Fa-f:.]+$/;

// Mirrors backend/src/module-access/dto/updateModuleEndpoint.dto.ts.
export const moduleEndpointSchema = z.object({
  protocol: z.enum(ModuleProtocol),
  host: z
    .string()
    .trim()
    .min(1, "Host is required")
    .max(253, "Host is too long")
    .regex(HOST_PATTERN, "Enter an IP address or hostname, not a URL"),
  port: z.coerce
    .number({ message: "Port must be a number" })
    .int("Port must be a whole number")
    .min(1, "Port must be between 1 and 65535")
    .max(65535, "Port must be between 1 and 65535"),
  path: z
    .string()
    .trim()
    .max(512, "Path is too long")
    .regex(/^\/\S*$/, 'Path must start with "/" and contain no spaces'),
});

// Mirrors backend/src/module-access/dto/updateModuleLevel.dto.ts.
export const moduleLevelSchema = z.object({
  minAnalystLevel: z.enum(AnalystLevel),
});
