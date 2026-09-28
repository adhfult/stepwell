/** What the set-password action sends back. */
export type SetPasswordState = {
  status: "idle" | "invalid" | "error" | "saved";
  passwordError?: string;
  formError?: string;
};

export const initialSetPasswordState: SetPasswordState = { status: "idle" };
