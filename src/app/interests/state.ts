// Shared by the quiz and results actions and their forms ("use server" files
// may export only async functions).
export type QuizState = { missing: number[]; error: string | null };
export const initialQuizState: QuizState = { missing: [], error: null };

export type SaveState = { error: string | null };
export const initialSaveState: SaveState = { error: null };
