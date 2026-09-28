/** What the reset-request action sends back. */
export type ForgotPasswordState = {
  status: "idle" | "invalid" | "error" | "sent";
  email: string;
  emailError?: string;
  formError?: string;
};

export const initialForgotPasswordState: ForgotPasswordState = { status: "idle", email: "" };
