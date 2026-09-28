"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { onetCodeSchema } from "@/lib/careers/labels";
import { createClient } from "@/lib/supabase/server";
import type { SaveState } from "./state";

const saveSchema = z.object({
  onet_code: onetCodeSchema,
  intent: z.enum(["save", "remove"]),
});

/**
 * Saves or removes a career for the signed-in student. The student comes from
 * the session, never the form: the database fills user_id from auth.uid(),
 * and Row Level Security limits removal to their own rows.
 */
export async function toggleSavedCareer(_previous: SaveState, formData: FormData): Promise<SaveState> {
  const parsed = saveSchema.safeParse({ onet_code: formData.get("onet_code"), intent: formData.get("intent") });
  if (!parsed.success) return { error: "We couldn’t save that. Reload the page and try again." };
  const { onet_code, intent } = parsed.data;

  if (!(await getCurrentUser())) redirect(`/sign-in?next=${encodeURIComponent(`/careers/${onet_code}`)}`);

  const supabase = await createClient();
  const { error } =
    intent === "save"
      ? await supabase.from("saved_items").insert({ onet_code })
      : await supabase.from("saved_items").delete().eq("onet_code", onet_code);

  // 23505: already saved (for example, a second tab). That's what they wanted.
  if (error && error.code !== "23505") {
    console.error("Saving a career failed:", error.code);
    return { error: intent === "save" ? "We couldn’t save this career. Try again." : "We couldn’t remove this career. Try again." };
  }

  revalidatePath(`/careers/${onet_code}`);
  revalidatePath("/account");
  return { error: null };
}
