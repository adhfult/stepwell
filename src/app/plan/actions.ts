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

// What each Save button can save: its id check, saved_items column, where to
// find its title, and where to send a signed-out student back to.
const SAVABLE = {
  scholarship: { id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/), column: "scholarship_id", back: "/scholarships" },
  college: { id: z.coerce.number().int().positive(), column: "unitid", back: "/colleges" },
  internship: { id: z.string().regex(/^\d{1,20}$/), column: "opportunity_id", back: "/internships" },
  ap: { id: z.string().regex(/^[a-z0-9-]{2,40}$/), column: "ap_course_code", back: "/careers" },
  program: { id: z.string().regex(/^[a-z]{2}-[a-z0-9-]{2,80}$/), column: "student_program_id", back: "/programs" },
} as const;
export type SavableKind = keyof typeof SAVABLE;

/** The listing's current title, which also proves it exists; null if it doesn't. */
async function titleOf(supabase: Awaited<ReturnType<typeof createClient>>, kind: SavableKind, id: string | number) {
  const found =
    kind === "scholarship"
      ? await supabase.from("scholarships").select("title").eq("id", String(id)).maybeSingle()
      : kind === "college"
        ? await supabase.from("institutions").select("title:name").eq("unitid", Number(id)).maybeSingle()
        : kind === "internship"
          ? await supabase.from("opportunities").select("title").eq("id", String(id)).maybeSingle()
          : kind === "program"
            ? await supabase.from("student_programs").select("title").eq("id", String(id)).maybeSingle()
            : await supabase.from("ap_courses").select("title:name").eq("code", String(id)).maybeSingle();
  return found.error ? null : (found.data?.title ?? null);
}

const intentSchema = z.enum(["save", "remove"]);
const idSchema = z.uuid();

async function signedIn(back: string) {
  if (!(await getCurrentUser())) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  return createClient();
}

/** Saves or removes a listing, copying its title so the plan can name it if it's later removed. */
export async function toggleSaved(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const kind = z.enum(Object.keys(SAVABLE) as [SavableKind, ...SavableKind[]]).safeParse(formData.get("kind"));
  const id = kind.success ? SAVABLE[kind.data].id.safeParse(formData.get("id")) : null;
  const intent = intentSchema.safeParse(formData.get("intent"));
  if (!kind.success || !id?.success || !intent.success) return { error: "We couldn’t save that. Reload the page and try again." };
  const { column, back } = SAVABLE[kind.data];
  const supabase = await signedIn(back);

  let error;
  if (intent.data === "remove") {
    ({ error } = await supabase.from("saved_items").delete().eq(column, id.data));
  } else {
    const title = await titleOf(supabase, kind.data, id.data);
    if (!title) return { error: "We couldn’t find that listing. Reload the page and try again." };
    ({ error } = await supabase.from("saved_items").insert({ [column]: id.data, title } as { title: string }));
  }
  // 23505: already saved (for example, in a second tab). That's what they wanted.
  // 54000: the per-student cap (1,000 saved items).
  if (error?.code === "54000") return { error: "You’ve saved the most we allow (1,000). Remove some to save more." };
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
    // 54000: the per-student cap (500 plan steps).
    if (error.code === "54000") {
      return { error: "Your plan has the most steps we allow (500). Delete some to add more.", values: typed(formData) };
    }
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
