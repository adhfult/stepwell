/**
 * A text field from submitted form data. Anything else (a missing field, or a
 * file where text was expected) becomes "", so validation reports it instead
 * of the action crashing.
 */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
