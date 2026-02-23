import {AuthUser} from '../types/authTypes';

export interface SessionUser {
  id?: number | string;
  displayName: string;
  phoneNumber: string;
  username: string;
}

let currentUser: SessionUser | null = null;

const toUsername = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'current_user';

const SessionService = {
  setCurrentUserFromAuthUser: (user?: AuthUser): SessionUser => {
    const rawDisplayName = user?.displayName;
    const displayName =
      typeof rawDisplayName === 'string' && rawDisplayName.trim().length > 0
        ? rawDisplayName.trim()
        : 'User';

    const phoneNumber =
      typeof user?.phoneNumber === 'string' ? user.phoneNumber : '';

    currentUser = {
      id: user?.id,
      displayName,
      phoneNumber,
      username: toUsername(displayName),
    };

    return currentUser;
  },

  getCurrentUser: (): SessionUser | null => currentUser,

  clearCurrentUser: () => {
    currentUser = null;
  },
};

export default SessionService;