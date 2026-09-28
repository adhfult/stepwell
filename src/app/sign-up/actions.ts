"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { AGE_BLOCK_COOKIE, isAtLeast13 } from "@/lib/auth/age";
import { captchaToken } from "@/lib/auth/captcha";
import { describeSignUpError } from "@/lib/auth/errors";
import { makeSignUpSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { SignUpState } from "./state";

const noValues = { email: "", birthMonth: "", birthYear: "" };

/**
 * Sign-up Server Action. Treated like a public endpoint: everything is
 * validated here, whatever the browser checked. The database trigger
 * (handle_new_user) is the final 13+ gate; this action decides whether to
 * set the flag it checks, and turns every outcome into a plain message.
 */
export async function signUp(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const cookieStore = await cookies();

  // Already told "under 13" in this browser session: same answer again.
  if (cookieStore.get(AGE_BLOCK_COOKIE)?.value === "1") {
    return { status: "not-eligible", fieldErrors: {}, values: noValues };
  }

  const values = {
    email: formText(formData, "email"),
    birthMonth: formText(formData, "birthMonth"),
    birthYear: formText(formData, "birthYear"),
  };

  const result = makeSignUpSchema(new Date()).safeParse({ ...values, password: formText(formData, "password") });

  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    return {
      status: "invalid",
      values,
      fieldErrors: {
        email: errors.email?.[0],
        password: errors.password?.[0],
        birthDate: errors.birthMonth?.[0] ?? errors.birthYear?.[0],
      },
    };
  }

  const { email, password, birthMonth, birthYear } = result.data;

  // The birth month and year are used only here and never stored or logged.
  if (!isAtLeast13(birthMonth, birthYear, new Date())) {
    cookieStore.set(AGE_BLOCK_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // No maxAge or expires: a session cookie, gone when the browser closes.
    });
    return { status: "not-eligible", fieldErrors: {}, values: noValues };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { age_confirmed: true }, captchaToken: captchaToken(formData) },
  });

  if (error) {
    const outcome = describeSignUpError(error);
    if (outcome.kind !== "check-email") {
      // The code only: never the email address or other personal data.
      console.error("Sign-up failed:", error.code ?? error.status);
    }
    if (outcome.kind === "field") {
      return { status: "invalid", values, fieldErrors: { [outcome.field]: outcome.message } };
    }
    if (outcome.kind === "form") {
      return { status: "error", values, fieldErrors: {}, formError: outcome.message };
    }
  }

  return { status: "check-email", fieldErrors: {}, values: { ...noValues, email } };
}
