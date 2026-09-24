export const SESSION_COOKIE = 'ts_session';
export const OAUTH_STATE_COOKIE = 'ts_oauth_state';

export type AuthedUser = {
  id: string;
  email: string;
  name: string | null;
  hasDrive: boolean;
};
