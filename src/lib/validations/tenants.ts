import { z } from "zod";
import { personFieldsSchema } from "@/lib/validations/users";
import { ModuleName } from "@/types/modules";

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
// /tenants/:id/modules. The backend sets the module's default minimum analyst level.
export const activateTenantModuleSchema = z.object({
  moduleName: z.enum(ModuleName),
});

// Mirrors backend/src/tenants/dto/updateTenantModule.dto.ts — PATCH
// /tenants/:id/modules/:moduleName. The Super Admin only toggles the subscription; the
// minimum level belongs to the tenant's Admin (PATCH /modules/:name/level).
export const updateTenantModuleSchema = z.object({
  isActive: z.boolean(),
});
