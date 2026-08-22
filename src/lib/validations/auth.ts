import { z } from "zod";

// Mirrors backend/src/auth/dto/login.dto.ts
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Mirrors backend/src/auth/dto/forgotPassword.dto.ts
export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

// Mirrors backend/src/users/dto/changePassword.dto.ts's @IsStrongPassword defaults
// (minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1) — kept in
// sync by hand, same tradeoff as the rest of the API contract (see root CLAUDE.md).
export const newPasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^a-zA-Z0-9]/, "At least one symbol");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: newPasswordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });
