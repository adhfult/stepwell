"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs out this browser only ("local"), like a sign-out button is expected
 * to; the student stays signed in on their other devices. Supabase removes
 * the login cookies. A form post, never a link, so nothing can sign a
 * student out just by getting them to open a URL.
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign-out failed:", error.code ?? error.status);

  // Drop cached signed-in pages so Back can't show them.
  revalidatePath("/", "layout");
  redirect("/");
}
