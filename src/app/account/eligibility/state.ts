// Shared by the eligibility actions and form ("use server" files may export
// only async functions).
export type EligibilityState = {
  errors: Record<string, string>;
  saved: boolean;
  removed: boolean;
};
export const initialEligibilityState: EligibilityState = { errors: {}, saved: false, removed: false };
