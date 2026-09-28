"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFreshUser } from "@/lib/auth/dal";
import { checkPassword } from "@/lib/auth/password-check";
import { signInSchema } from "@/lib/auth/schemas";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { DeleteAccountState } from "./state";

const tryAgain = "We couldn’t delete your account just now. Please try again in a few minutes.";

/**
 * Deletes the signed-in student's account (decision 0004). Sensitive, so:
 * a fresh check with the Auth server (not just the token), then the
 * password, then delete_my_account(), which removes the login and, by
 * cascade, all their data. Finally the session cookies are cleared.
 */
export async function deleteAccount(_previous: DeleteAccountState, formData: FormData): Promise<DeleteAccountState> {
  const user = await getFreshUser();
  if (!user?.email) redirect("/sign-in?next=%2Faccount%2Fdelete");

  // Same rule as signing in: typed, and not absurdly long.
  const parsed = signInSchema.shape.password.safeParse(formText(formData, "password"));
  if (!parsed.success) return { passwordError: parsed.error.issues[0]?.message };
  const password = parsed.data;

  const check = await checkPassword(user.email, password, user.id);
  if (check === "wrong") return { passwordError: "That password isn’t right" };
  if (check === "error") return { formError: tryAgain };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account deletion failed:", error.code);
    return { formError: tryAgain };
  }

  // The account is gone; clear this browser's login cookies. The Auth server
  // may answer with an error now that the user no longer exists; the cookies
  // are removed either way.
  await supabase.auth.signOut({ scope: "local" });

  revalidatePath("/", "layout");
  redirect("/account-deleted");
}
