// Shared by the plan actions and their forms ("use server" files may export
// only async functions).
// On an error, `values` holds what was typed: React clears a form after its
// action runs, so the form refills itself from here.
export type ActionState = { error: string | null; fieldErrors?: Record<string, string>; values?: Record<string, string> };
export const initialActionState: ActionState = { error: null };
