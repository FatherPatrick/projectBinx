import theme from '../styles/theme';

const adjectives = [
  'Amber',
  'Brisk',
  'Calm',
  'Clever',
  'Cosmic',
  'Daring',
  'Echo',
  'Ember',
  'Gentle',
  'Hidden',
  'Icy',
  'Jade',
  'Kind',
  'Lively',
  'Lucky',
  'Mellow',
  'Misty',
  'Noble',
  'Quiet',
  'Rapid',
  'Rustic',
  'Silent',
  'Solar',
  'Swift',
  'Velvet',
  'Witty',
];

const nouns = [
  'Acorn',
  'Beacon',
  'Canyon',
  'Comet',
  'Drift',
  'Falcon',
  'Forest',
  'Galaxy',
  'Harbor',
  'Horizon',
  'Lantern',
  'Maple',
  'Meadow',
  'Nova',
  'Orbit',
  'Pebble',
  'Phoenix',
  'Pine',
  'River',
  'Shadow',
  'Sparrow',
  'Summit',
  'Thunder',
  'Valley',
  'Willow',
  'Zephyr',
];

const avatarPalette = [
  theme.colors.primary,
  theme.colors.link,
  theme.colors.success,
  theme.colors.dangerStrong,
  theme.colors.textSecondary,
];

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const hashToNumber = (value: string): number => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const normalizeInitials = (value: string): string => {
  const cleaned = value
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 2);

  if (cleaned.length === 2) {
    return cleaned;
  }

  if (cleaned.length === 1) {
    return `${cleaned}${cleaned}`;
  }

  return 'AA';
};

const getInitialsFromDisplayName = (displayName: string): string => {
  const words = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return normalizeInitials(`${words[0][0]}${words[1][0]}`);
  }

  if (words.length === 1) {
    return normalizeInitials(words[0].slice(0, 2));
  }

  return 'AA';
};

const randomInt = (maxExclusive: number): number =>
  Math.floor(Math.random() * maxExclusive);

export interface ProfileAvatar {
  initials: string;
  backgroundColor: string;
}

const getAliasFromSeed = (seed: string): string => {
  const hash = hashToNumber(seed);
  const adjective = adjectives[hash % adjectives.length];
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length];
  const suffix = String(hash % 1000).padStart(3, '0');

  return `${adjective} ${noun} ${suffix}`;
};

const AnonymousNameService = {
  getDeterministicAlias: (identifier: string): string => {
    const normalized = String(identifier || '')
      .trim()
      .toLowerCase();

    if (!normalized) {
      return getAliasFromSeed('anonymous');
    }

    return getAliasFromSeed(normalized);
  },

  generateRandomAlias: (): string => {
    const randomSeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return getAliasFromSeed(randomSeed);
  },

  getDeterministicAvatar: (
    identifier: string,
    displayName?: string,
  ): ProfileAvatar => {
    const seed = `${String(identifier || '')
      .trim()
      .toLowerCase()}|${String(displayName || '')
      .trim()
      .toLowerCase()}`;
    const hash = hashToNumber(seed || 'anonymous');

    return {
      initials: getInitialsFromDisplayName(displayName || identifier),
      backgroundColor: avatarPalette[hash % avatarPalette.length],
    };
  },

  generateRandomAvatar: (): ProfileAvatar => {
    const first = alphabet[randomInt(alphabet.length)];
    const second = alphabet[randomInt(alphabet.length)];
    const color = avatarPalette[randomInt(avatarPalette.length)];

    return {
      initials: `${first}${second}`,
      backgroundColor: color,
    };
  },

  sanitizeAvatar: (
    avatar: Partial<ProfileAvatar> | undefined,
    fallbackIdentifier: string,
    fallbackDisplayName?: string,
  ): ProfileAvatar => {
    const fallback = AnonymousNameService.getDeterministicAvatar(
      fallbackIdentifier,
      fallbackDisplayName,
    );

    const initials =
      typeof avatar?.initials === 'string' && avatar.initials.trim().length > 0
        ? normalizeInitials(avatar.initials)
        : fallback.initials;

    const backgroundColor =
      typeof avatar?.backgroundColor === 'string' &&
      avatar.backgroundColor.trim().length > 0
        ? avatar.backgroundColor
        : fallback.backgroundColor;

    return {
      initials,
      backgroundColor,
    };
  },
};

export default AnonymousNameService;
