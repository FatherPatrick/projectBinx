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

const hashToNumber = (value: string): number => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

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
};

export default AnonymousNameService;
