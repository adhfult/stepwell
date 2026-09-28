// Shared by the save action and its form ("use server" files may export only
// async functions).
export type SaveState = { error: string | null };
export const initialSaveState: SaveState = { error: null };
