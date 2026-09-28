"use server";

import { z } from "zod";
import { makeSignUpSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import type { SignUpState } from "./state";

/**
 * Sign-up Server Action. Treated like a public endpoint: everything is
 * validated here, whatever the browser checked.
 */
export async function signUp(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
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

  // Step 5b: the age check, the Supabase sign-up and "Check your email".
  return { status: "checked", values, fieldErrors: {} };
}
