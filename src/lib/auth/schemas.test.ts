import { describe, expect, it } from "vitest";
import { z } from "zod";
import { makeSignUpSchema, signInSchema } from "./schemas";

describe("sign-in schema", () => {
  it("accepts any non-empty password and normalizes the email", () => {
    const result = signInSchema.safeParse({ email: " Sam@Example.com", password: "x" });
    expect(result.success && result.data).toEqual({ email: "sam@example.com", password: "x" });
  });

  it("asks for both fields when they're empty", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    const errors = result.success ? {} : z.flattenError(result.error).fieldErrors;
    expect(errors.email).toBeDefined();
    expect(errors.password).toEqual(["Enter your password"]);
  });
});

const schema = makeSignUpSchema(new Date(Date.UTC(2026, 8, 15)));
const valid = { email: "sam@example.com", password: "correct-horse-9", birthMonth: "3", birthYear: "2010" };

function errorsFor(input: Record<string, string>) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("sign-up schema", () => {
  it("accepts valid details and turns the menus into numbers", () => {
    const result = schema.safeParse(valid);
    expect(result.success && result.data).toEqual({ ...valid, birthMonth: 3, birthYear: 2010 });
  });

  it("trims and lowercases the email address", () => {
    const result = schema.safeParse({ ...valid, email: "  Sam@Example.COM " });
    expect(result.success && result.data.email).toBe("sam@example.com");
  });

  it("explains a malformed email address", () => {
    expect(errorsFor({ ...valid, email: "sam" }).email).toEqual(["Enter an email address, like name@example.com"]);
  });

  it("requires at least 8 and at most 72 password characters", () => {
    expect(errorsFor({ ...valid, password: "1234567" }).password).toEqual(["Use at least 8 characters"]);
    expect(errorsFor({ ...valid, password: "x".repeat(73) }).password).toEqual(["Use 72 characters or fewer"]);
    expect(errorsFor({ ...valid, password: "12345678" }).password).toBeUndefined();
  });

  it("asks for the birth month and year when a menu is left empty", () => {
    const errors = errorsFor({ ...valid, birthMonth: "", birthYear: "" });
    expect(errors.birthMonth).toEqual(["Choose the month and year you were born"]);
    expect(errors.birthYear).toEqual(["Choose the month and year you were born"]);
  });

  it("rejects values the menus never offer", () => {
    expect(errorsFor({ ...valid, birthMonth: "13" }).birthMonth).toBeDefined();
    expect(errorsFor({ ...valid, birthMonth: "2.5" }).birthMonth).toBeDefined();
    expect(errorsFor({ ...valid, birthYear: "1925" }).birthYear).toBeDefined();
    expect(errorsFor({ ...valid, birthYear: "2027" }).birthYear).toBeDefined();
    expect(errorsFor({ ...valid, birthYear: "abc" }).birthYear).toBeDefined();
  });
});
