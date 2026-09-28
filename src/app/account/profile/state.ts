/**
 * What the profile Server Action sends back to the form. Kept out of
 * actions.ts because a "use server" file may only export async functions.
 */

export type ProfileField = "nickname" | "stage" | "state" | "gradYear";

/** The form's answers as typed (the menus and radios send text). */
export type ProfileValues = { nickname: string; stage: string; state: string; gradYear: string };

export type ProfileState = {
  status: "idle" | "invalid" | "error" | "saved";
  fieldErrors: Partial<Record<ProfileField, string>>;
  formError?: string;
  values: ProfileValues;
};
