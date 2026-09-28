"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { describeSignInError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/safe-next";
import { signInSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { SignInState } from "./state";

/**
 * Sign-in Server Action. On success Supabase sets the login cookies and the
 * student goes back to where they were headed (`next`, checked again here
 * because hidden fields can be edited like anything else sent from a browser).
 */
export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const values = { email: formText(formData, "email") };
  const result = signInSchema.safeParse({ ...values, password: formText(formData, "password") });

  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    return { values, fieldErrors: { email: errors.email?.[0], password: errors.password?.[0] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);

  if (error) {
    if (error.code !== "invalid_credentials") {
      // The code only: never the email address.
      console.error("Sign-in failed:", error.code ?? error.status);
    }
    return { values, fieldErrors: {}, formError: describeSignInError(error) };
  }

  // The header changes to "Account", so don't reuse the signed-out layout.
  revalidatePath("/", "layout");
  redirect(safeNextPath(formText(formData, "next"), "/"));
}
