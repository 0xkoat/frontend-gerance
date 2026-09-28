import { changeRoleSchema, createUserSchema } from "@/lib/validations/users";

const person = {
  name: "Sara Ben Ali",
  email: "sara@meridian.test",
  password: "Str0ng!Pass",
  phoneNumber: "+21620000020",
};

describe("analyst level pairing", () => {
  it("accepts an Analyst with a level", () => {
    expect(
      createUserSchema.safeParse({
        ...person,
        role: "ANALYST",
        analystLevel: "L3",
      }).success,
    ).toBe(true);
  });

  it("rejects an Analyst without a level", () => {
    const result = createUserSchema.safeParse({ ...person, role: "ANALYST" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["analystLevel"]);
  });

  it("rejects a level on an Admin", () => {
    expect(
      changeRoleSchema.safeParse({ role: "ADMIN", analystLevel: "L1" }).success,
    ).toBe(false);
  });

  it("accepts an Admin without a level", () => {
    expect(changeRoleSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
  });

  it("rejects roles an Admin cannot assign", () => {
    for (const role of ["SUPER_ADMIN", "INTEGRATION_ADMIN", "VIEWER"]) {
      expect(changeRoleSchema.safeParse({ role }).success).toBe(false);
    }
  });
});
