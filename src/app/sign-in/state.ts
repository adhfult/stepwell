/** What the sign-in Server Action sends back (success redirects instead). */
export type SignInState = {
  fieldErrors: { email?: string; password?: string };
  formError?: string;
  // Echoed back so the form keeps the email. Never the password.
  values: { email: string };
};

export const initialSignInState: SignInState = { fieldErrors: {}, values: { email: "" } };
