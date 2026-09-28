import { describe, expect, it } from "vitest";
import { describeLinkError, describeSignUpError } from "./errors";

describe("describeLinkError", () => {
  it("explains expired or used links without technical details", () => {
    expect(describeLinkError({ code: "otp_expired" })).toBe("This link has expired or was already used.");
    expect(describeLinkError({ code: "something_new" })).toBe("This link has expired or was already used.");
  });

  it("asks the student to wait when rate limited", () => {
    expect(describeLinkError({ code: "over_request_rate_limit" })).toContain("Wait a few minutes");
  });
});

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
