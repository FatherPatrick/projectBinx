import {AuthUser} from '../types/authTypes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnonymousNameService from './anonymousNameService';

export interface SessionUser {
  id?: number | string;
  displayName: string;
  phoneNumber: string;
  email: string;
  anonymousAlias: string;
  profileAvatarInitials: string;
  profileAvatarColor: string;
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
    const email = typeof user?.email === 'string' ? user.email : '';
    const previousAvatar =
      currentUser?.profileAvatarInitials && currentUser?.profileAvatarColor
        ? {
            initials: currentUser.profileAvatarInitials,
            backgroundColor: currentUser.profileAvatarColor,
          }
        : AnonymousNameService.generateRandomAvatar();

    currentUser = {
      id: user?.id,
      displayName,
      phoneNumber,
      email,
      anonymousAlias:
        currentUser?.anonymousAlias ??
        AnonymousNameService.generateRandomAlias(),
      profileAvatarInitials: previousAvatar.initials,
      profileAvatarColor: previousAvatar.backgroundColor,
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

      const parsedSession = JSON.parse(storedSession) as Partial<SessionUser>;

      if (!parsedSession?.displayName || !parsedSession?.username) {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      const fallbackAvatar = AnonymousNameService.generateRandomAvatar();

      currentUser = {
        id: parsedSession.id,
        displayName: parsedSession.displayName,
        phoneNumber:
          typeof parsedSession.phoneNumber === 'string'
            ? parsedSession.phoneNumber
            : '',
        email:
          typeof parsedSession.email === 'string' ? parsedSession.email : '',
        anonymousAlias:
          typeof parsedSession.anonymousAlias === 'string' &&
          parsedSession.anonymousAlias.trim().length > 0
            ? parsedSession.anonymousAlias
            : AnonymousNameService.generateRandomAlias(),
        profileAvatarInitials:
          typeof parsedSession.profileAvatarInitials === 'string' &&
          parsedSession.profileAvatarInitials.trim().length > 0
            ? parsedSession.profileAvatarInitials
            : fallbackAvatar.initials,
        profileAvatarColor:
          typeof parsedSession.profileAvatarColor === 'string' &&
          parsedSession.profileAvatarColor.trim().length > 0
            ? parsedSession.profileAvatarColor
            : fallbackAvatar.backgroundColor,
        username: parsedSession.username,
      };
      return currentUser;
    } catch (error) {
      return null;
    }
  },

  getCurrentUser: (): SessionUser | null => currentUser,

  regenerateAnonymousAlias: async (): Promise<SessionUser | null> => {
    if (!currentUser) {
      return null;
    }

    currentUser = {
      ...currentUser,
      anonymousAlias: AnonymousNameService.generateRandomAlias(),
    };

    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(currentUser),
      );
    } catch (error) {}

    return currentUser;
  },

  regenerateProfileAvatar: async (): Promise<SessionUser | null> => {
    if (!currentUser) {
      return null;
    }

    const nextAvatar = AnonymousNameService.generateRandomAvatar();

    currentUser = {
      ...currentUser,
      profileAvatarInitials: nextAvatar.initials,
      profileAvatarColor: nextAvatar.backgroundColor,
    };

    try {
      await AsyncStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(currentUser),
      );
    } catch (error) {}

    return currentUser;
  },

  clearCurrentUser: async () => {
    currentUser = null;
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {}
  },
};

export default SessionService;
