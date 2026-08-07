import { z } from "zod";
import { personFieldsSchema } from "@/lib/validations/users";
import { ModuleName } from "@/types/security";

// Mirrors backend/src/tenants/dto/createTenant.dto.ts (CreateUserDto + tenantName). This is
// the only place a Tenant + its first Admin can ever be created — Super Admin-only, see
// backend/CLAUDE.md's provisioning hierarchy.
export const createTenantSchema = personFieldsSchema.extend({
  tenantName: z.string().min(1, "Tenant name is required"),
});

// Mirrors backend/src/tenants/dto/updateTenant.dto.ts — PATCH /tenants/:id (rename), added
// Phase 11 (2026-08-07).
export const updateTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
});

// Mirrors backend/src/tenants/dto/activateTenantModule.dto.ts — POST
// /tenants/:id/modules, added Phase 11. `config` is validated as an unconstrained object,
// same as SOAR's `actions` field (src/lib/validations/soar.ts) — matches the backend's own
// unconstrained `@IsObject()`.
export const activateTenantModuleSchema = z.object({
  moduleName: z.enum(ModuleName),
  config: z.record(z.string(), z.unknown()).optional(),
});

// Mirrors backend/src/tenants/dto/updateTenantModule.dto.ts — PATCH
// /tenants/:id/modules/:moduleName, added Phase 11. Both fields optional (a toggle-only
// PATCH sends just `isActive`, a config-only edit sends just `config`) — matches the
// backend DTO exactly, but at least one of the two has to be present to mean anything;
// enforced by the form/row-action components, not this schema, same as the backend leaves
// it (an empty `{}` body is technically valid there too and just no-ops).
export const updateTenantModuleSchema = z.object({
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});
