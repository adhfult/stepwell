import { formText } from "@/lib/form-data";

/** The Turnstile token the widget (components/turnstile.tsx) adds to its form. */
export function captchaToken(formData: FormData): string | undefined {
  return formText(formData, "cf-turnstile-response") || undefined;
}
