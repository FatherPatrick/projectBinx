import {AuthUser} from '../types/authTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionUser {
  id?: number | string;
  displayName: string;
  phoneNumber: string;
  username: string;
}

let currentUser: SessionUser | null = null;
const SESSION_STORAGE_KEY = '@projectBinx/sessionUser';

const toUsername = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'current_user';

const SessionService = {
  setCurrentUserFromAuthUser: async (user?: AuthUser): Promise<SessionUser> => {
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

    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(currentUser),
      );
    } catch (error) {}

    return currentUser;
  },

  restoreSession: async (): Promise<SessionUser | null> => {
    if (currentUser) {
      return currentUser;
    }

    try {
      const storedSession = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedSession) {
        return null;
      }

      const parsedSession = JSON.parse(storedSession) as SessionUser;

      if (!parsedSession?.displayName || !parsedSession?.username) {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      currentUser = parsedSession;
      return currentUser;
    } catch (error) {
      return null;
    }
  },

  getCurrentUser: (): SessionUser | null => currentUser,

  clearCurrentUser: async () => {
    currentUser = null;
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {}
  },
};

export default SessionService;
