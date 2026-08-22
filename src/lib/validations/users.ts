import { z } from "zod";
import { newPasswordSchema } from "@/lib/validations/auth";
import { UserRole } from "@/types/auth";

// Mirrors backend/src/users/dto/createUser.dto.ts — the fields every account (subordinate
// user or a tenant's first Admin) needs, shared by createUserSchema and
// src/lib/validations/tenants.ts's createTenantSchema.
export const personFieldsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email address"),
  password: newPasswordSchema,
  // Backend validates with @IsPhoneNumber('TN') — this is a light client-side pre-check,
  // not a full E.164/TN-format validator. The backend is the actual source of truth; a
  // number that passes here can still be rejected server-side, and that's fine.
  phoneNumber: z
    .string()
    .min(8, "Enter a phone number")
    .regex(/^[\d\s\-()+]+$/, "Digits only (plus optional spaces, -, (), +)"),
});

// Mirrors backend/src/users/dto/createSubordinateUser.dto.ts. Role is restricted to what
// an Admin is allowed to create (its @IsIn) — Admin can also create a co-Admin (see
// backend/CLAUDE.md's self-loop rule), never SUPER_ADMIN, which is seed-only and never
// created through the API.
export const createUserSchema = personFieldsSchema.extend({
  role: z.enum([UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER]),
});

// Mirrors backend/src/users/dto/updateUser.dto.ts — PartialType(OmitType(CreateUserDto,
// ['password'])), so every field is optional and password/role are structurally excluded
// (role has its own dedicated endpoint/DTO below; password changes go through a dedicated
// flow too — see backend/CLAUDE.md's design notes on why that's deliberate, not an
// oversight).
export const updateUserSchema = personFieldsSchema
  .omit({ password: true })
  .partial();

// Mirrors backend/src/users/dto/changeUserRole.dto.ts.
export const changeRoleSchema = z.object({
  role: z.enum([UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER]),
});

// Mirrors backend/src/users/dto/resetPassword.dto.ts. This is an Admin choosing a new
// password for someone else (not a system-generated one — see backend/CLAUDE.md's note on
// why: never puts a plaintext secret in a response body or log).
export const resetPasswordSchema = z.object({
  newPassword: newPasswordSchema,
});
