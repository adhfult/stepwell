"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { planItemSchema } from "@/lib/plan/labels";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "./state";

// Every action takes the student from the session, never the form: the
// database fills user_id from auth.uid(), and Row Level Security limits
// changes to their own rows.

const saveSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("scholarship"), id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/) }),
  z.object({ kind: z.literal("college"), id: z.coerce.number().int().positive() }),
]);
const intentSchema = z.enum(["save", "remove"]);
const idSchema = z.uuid();

async function signedIn(back: string) {
  if (!(await getCurrentUser())) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  return createClient();
}

/** Saves or removes a scholarship or college, copying its title so the plan can name it if it's later removed. */
export async function toggleSaved(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = saveSchema.safeParse({ kind: formData.get("kind"), id: formData.get("id") });
  const intent = intentSchema.safeParse(formData.get("intent"));
  if (!parsed.success || !intent.success) return { error: "We couldn’t save that. Reload the page and try again." };
  const supabase = await signedIn(parsed.data.kind === "scholarship" ? "/scholarships" : "/careers");
  const column = parsed.data.kind === "scholarship" ? "scholarship_id" : "unitid";

  let error;
  if (intent.data === "remove") {
    ({ error } = await supabase.from("saved_items").delete().eq(column, parsed.data.id));
  } else {
    const found =
      parsed.data.kind === "scholarship"
        ? await supabase.from("scholarships").select("title").eq("id", parsed.data.id).maybeSingle()
        : await supabase.from("institutions").select("title:name").eq("unitid", parsed.data.id).maybeSingle();
    if (found.error || !found.data) return { error: "We couldn’t find that listing. Reload the page and try again." };
    const row =
      parsed.data.kind === "scholarship" ? { scholarship_id: parsed.data.id } : { unitid: parsed.data.id };
    ({ error } = await supabase.from("saved_items").insert({ ...row, title: found.data.title }));
  }
  // 23505: already saved (for example, in a second tab). That's what they wanted.
  if (error && error.code !== "23505") {
    console.error("Saving a listing failed:", error.code);
    return { error: "We couldn’t save that. Try again." };
  }
  revalidatePath("/", "layout");
  return { error: null };
}

function itemFields(formData: FormData) {
  return planItemSchema.safeParse({
    title: formData.get("title") ?? "",
    kind: formData.get("kind"),
    academic_year: formData.get("academic_year") ?? "",
    term: formData.get("term"),
    due_on: formData.get("due_on") ?? "",
  });
}

function fieldErrors(error: z.ZodError, formData: FormData): ActionState {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
  return { error: "Check the highlighted fields.", fieldErrors: fields, values: typed(formData) };
}

function typed(formData: FormData) {
  const values: Record<string, string> = {};
  for (const name of ["title", "kind", "academic_year", "term", "due_on"]) values[name] = String(formData.get(name) ?? "");
  return values;
}

export async function addPlanItem(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = itemFields(formData);
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const supabase = await signedIn("/plan");
  const { error } = await supabase.from("plan_items").insert(parsed.data);
  if (error) {
    console.error("Adding a plan item failed:", error.code);
    return { error: "We couldn’t add that. Try again.", values: typed(formData) };
  }
  revalidatePath("/plan");
  return { error: null };
}

export async function updatePlanItem(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = itemFields(formData);
  if (!id.success) return { error: "We couldn’t save that. Reload the page and try again." };
  if (!parsed.success) return fieldErrors(parsed.error, formData);
  const supabase = await signedIn("/plan");
  const { error } = await supabase.from("plan_items").update(parsed.data).eq("id", id.data);
  if (error) {
    console.error("Changing a plan item failed:", error.code);
    return { error: "We couldn’t save your changes. Try again.", values: typed(formData) };
  }
  revalidatePath("/plan");
  return { error: null };
}

/** Mark done or not done, or delete. Plain form actions: they work without JavaScript. */
export async function changePlanItem(formData: FormData) {
  const id = idSchema.safeParse(formData.get("id"));
  const action = z.enum(["done", "undo", "delete"]).safeParse(formData.get("action"));
  if (!id.success || !action.success) return;
  const supabase = await signedIn("/plan");
  const { error } =
    action.data === "delete"
      ? await supabase.from("plan_items").delete().eq("id", id.data)
      : await supabase.from("plan_items").update({ done: action.data === "done" }).eq("id", id.data);
  if (error) {
    console.error("Changing a plan item failed:", error.code);
    throw new Error("Plan change failed");
  }
  revalidatePath("/plan");
}
