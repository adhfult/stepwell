/**
 * What the sign-up Server Action sends back to the form. Kept out of
 * actions.ts because a "use server" file may only export async functions.
 */

export type SignUpField = "email" | "password" | "birthDate";

export type SignUpState = {
  // "checked" is temporary (step 5a): the details passed validation but
  // nothing was created yet. Step 5b replaces it with the real outcomes.
  status: "idle" | "invalid" | "checked";
  fieldErrors: Partial<Record<SignUpField, string>>;
  // Echoed back so the form keeps what was typed. Never the password.
  values: { email: string; birthMonth: string; birthYear: string };
};

export const initialSignUpState: SignUpState = {
  status: "idle",
  fieldErrors: {},
  values: { email: "", birthMonth: "", birthYear: "" },
};
