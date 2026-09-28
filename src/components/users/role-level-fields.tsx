"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabel } from "@/lib/roles";
import { AnalystLevel, UserRole } from "@/types/auth";

export type TenantRole = typeof UserRole.ADMIN | typeof UserRole.ANALYST;

const ROLE_OPTIONS: TenantRole[] = [UserRole.ANALYST, UserRole.ADMIN];
const LEVEL_OPTIONS = Object.values(AnalystLevel);

// Role picker plus a level picker that only exists for Analysts — shared by the create-user
// form and the change-role dialog so both enforce the same role/level pairing.
export function RoleLevelFields({
  idPrefix,
  role,
  analystLevel,
  onRoleChange,
  onLevelChange,
  levelError,
  disabled,
  roleLabelText = "Role",
}: {
  idPrefix: string;
  role: TenantRole;
  analystLevel: AnalystLevel;
  onRoleChange: (role: TenantRole) => void;
  onLevelChange: (level: AnalystLevel) => void;
  levelError?: string;
  disabled?: boolean;
  roleLabelText?: string;
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-role`}>{roleLabelText}</FieldLabel>
        <Select
          value={role}
          onValueChange={(value) => value && onRoleChange(value as TenantRole)}
          disabled={disabled}
        >
          <SelectTrigger id={`${idPrefix}-role`} className="w-full">
            <SelectValue>{(value: TenantRole) => roleLabel(value)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {roleLabel(r)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {role === UserRole.ANALYST && (
        <Field data-invalid={!!levelError}>
          <FieldLabel htmlFor={`${idPrefix}-level`}>Analyst level</FieldLabel>
          <Select
            value={analystLevel}
            onValueChange={(value) =>
              value && onLevelChange(value as AnalystLevel)
            }
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-level`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVEL_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{levelError}</FieldError>
        </Field>
      )}
    </>
  );
}
