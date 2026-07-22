import { z } from "zod";
import { personFieldsSchema } from "@/lib/validations/users";

// Mirrors backend/src/tenants/dto/createTenant.dto.ts (CreateUserDto + tenantName). This is
// the only place a Tenant + its first Admin can ever be created — Super Admin-only, see
// backend/CLAUDE.md's provisioning hierarchy.
export const createTenantSchema = personFieldsSchema.extend({
  tenantName: z.string().min(1, "Tenant name is required"),
});
