/**
 * What the sign-up Server Action sends back to the form. Kept out of
 * actions.ts because a "use server" file may only export async functions.
 */

export type SignUpField = "email" | "password" | "birthDate";

export type SignUpState = {
  status:
    | "idle"
    | "invalid" // a field needs fixing
    | "error" // something outside the student's control; see formError
    | "check-email" // done: shown for new and existing addresses alike
    | "not-eligible"; // the age check said under 13
  fieldErrors: Partial<Record<SignUpField, string>>;
  formError?: string;
  // Echoed back so the form keeps what was typed. Never the password.
  values: { email: string; birthMonth: string; birthYear: string };
};

export const initialSignUpState: SignUpState = {
  status: "idle",
  fieldErrors: {},
  values: { email: "", birthMonth: "", birthYear: "" },
};
