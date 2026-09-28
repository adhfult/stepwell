"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { describeLinkError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/safe-next";
import { formText } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import { linkKinds } from "./link-kinds";
import type { ConfirmState } from "./state";

const linkSchema = z.object({
  tokenHash: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/),
  type: z.enum(["email", "recovery"]),
  next: z.string(),
});

/**
 * Uses a one-time email link. Runs only when the student presses the button
 * on /auth/confirm, never on page load, so email scanners that open links
 * automatically can't use the link up (Supabase docs, "Email prefetching").
 * On success Supabase sets the login cookies and we redirect.
 */
export async function confirmLink(_previous: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const parsed = linkSchema.safeParse({
    tokenHash: formText(formData, "token_hash"),
    type: formText(formData, "type"),
    next: formText(formData, "next"),
  });
  if (!parsed.success) return { error: describeLinkError(null) };

  const { tokenHash, type, next } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    // The code only: never the token or anything personal.
    console.error("Email link failed:", error.code ?? error.status);
    return { error: describeLinkError(error) };
  }

  // The header now shows "Account", so don't reuse the signed-out layout.
  revalidatePath("/", "layout");
  redirect(safeNextPath(next, linkKinds[type].next));
}
