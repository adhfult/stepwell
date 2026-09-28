/** What the delete action sends back (success redirects to /account-deleted). */
export type DeleteAccountState = {
  passwordError?: string;
  formError?: string;
};

export const initialDeleteAccountState: DeleteAccountState = {};
