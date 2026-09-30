export const PROGRAM_KINDS: Record<string, string> = {
  summer_program: "Summer program",
  internship: "Internship",
  research: "Research",
};

/** "Paid: $3,000 stipend", "Paid", "Free, unpaid" or "Free. (a note from the page)" (never a blank). */
export function payLine(p: { paid: boolean; pay_text: string | null }) {
  if (!p.paid) return p.pay_text ? `Free. ${p.pay_text}` : "Free, unpaid";
  return p.pay_text ? `Paid: ${p.pay_text}` : "Paid";
}
