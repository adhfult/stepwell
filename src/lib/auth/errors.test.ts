import { describe, expect, it } from "vitest";
import { describeSignUpError } from "./errors";

describe("describeSignUpError", () => {
  it("answers an existing account exactly like a new sign-up", () => {
    expect(describeSignUpError({ code: "user_already_exists" })).toEqual({ kind: "check-email" });
    expect(describeSignUpError({ code: "email_exists" })).toEqual({ kind: "check-email" });
  });

  it("puts password and email problems on their fields", () => {
    expect(describeSignUpError({ code: "weak_password" })).toMatchObject({ kind: "field", field: "password" });
    expect(describeSignUpError({ code: "email_address_invalid" })).toMatchObject({ kind: "field", field: "email" });
  });

  it("asks the student to wait when rate limited", () => {
    expect(describeSignUpError({ code: "over_request_rate_limit" })).toMatchObject({
      kind: "form",
      message: expect.stringContaining("Wait a few minutes"),
    });
  });

  it("falls back to a friendly message without technical details", () => {
    const outcome = describeSignUpError({ code: "unexpected_failure" });
    expect(outcome).toMatchObject({ kind: "form" });
    expect(JSON.stringify(outcome)).not.toContain("unexpected_failure");
    expect(describeSignUpError(null)).toMatchObject({ kind: "form" });
  });
});
