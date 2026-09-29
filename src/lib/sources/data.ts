import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Last successful import per source id, for the About the data page; null if the lookup fails. */
export async function getSourceDates(): Promise<Map<string, string | null> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sources").select("id, last_success_at");
  if (error) return null;
  return new Map(data.map((s) => [s.id, s.last_success_at]));
}
