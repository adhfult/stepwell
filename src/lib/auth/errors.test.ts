import { describe, expect, it } from "vitest";
import {
  CAPTCHA_MESSAGE,
  describeLinkError,
  describePasswordUpdateError,
  describeSignInError,
  describeSignUpError,
} from "./errors";

describe("failed bot check", () => {
  it("gets its own plain message on sign-up and sign-in", () => {
    expect(describeSignUpError({ code: "captcha_failed" })).toEqual({ kind: "form", message: CAPTCHA_MESSAGE });
    expect(describeSignInError({ code: "captcha_failed" })).toBe(CAPTCHA_MESSAGE);
  });
});

describe("describePasswordUpdateError", () => {
  it("puts reused and weak passwords on the password field", () => {
    expect(describePasswordUpdateError({ code: "same_password" })).toMatchObject({ field: "password" });
    expect(describePasswordUpdateError({ code: "weak_password" })).toMatchObject({ field: "password" });
  });

  it("falls back to a form message without technical details", () => {
    const outcome = describePasswordUpdateError({ code: "unexpected_failure" });
    expect(outcome.field).toBeUndefined();
    expect(outcome.message).not.toContain("unexpected_failure");
  });
});

describe("describeSignInError", () => {
  it("gives one message for a wrong email or password", () => {
    expect(describeSignInError({ code: "invalid_credentials" })).toBe("Email or password is wrong.");
  });

  it("explains an unconfirmed account and how to get a new link", () => {
    expect(describeSignInError({ code: "email_not_confirmed" })).toContain("Confirm your email first");
  });

  it("falls back without technical details", () => {
    expect(describeSignInError({ code: "unexpected_failure" })).not.toContain("unexpected_failure");
  });
});

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
