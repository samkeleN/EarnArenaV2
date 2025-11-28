import { storage } from './StorageUtil';
import { GAME_HISTORY_KEY, USER_STATS_KEY } from '@/constants/storageKeys';

export type GameOutcome = 'win' | 'loss';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export type GameHistoryEntry = {
  id: string;
  gameName: string;
  outcome: GameOutcome;
  amountDisplay: string;
  playedAt: string;
  status: PaymentStatus;
  statusMessage?: string;
  txHash?: string | null;
};

type PersistedGameHistoryEntry = Omit<GameHistoryEntry, 'status'> & Partial<Pick<GameHistoryEntry, 'status' | 'statusMessage' | 'txHash'>>;

export type UserStats = {
  totalGames: number;
  wins: number;
  losses: number;
};

const DEFAULT_STATS: UserStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
};

const HISTORY_LIMIT = 50;

const generateId = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

const withDefaults = (entry: PersistedGameHistoryEntry): GameHistoryEntry => ({
  ...entry,
  status: entry.status ?? 'completed',
  statusMessage: entry.statusMessage,
  txHash: typeof entry.txHash === 'string' ? entry.txHash : null,
});

const normaliseAmount = (amount: string) => {
  const trimmed = (amount ?? '').toString().trim();
  if (!trimmed) return '0';
  if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
    return trimmed.slice(1).trim();
  }
  return trimmed;
};

export const formatAmountDisplay = (amount: string, outcome: GameOutcome) => {
  const core = normaliseAmount(amount);
  const prefix = outcome === 'win' ? '+' : '-';
  return `${prefix}${core}`;
};

export const formatHistoryDate = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export async function recordGameResult(params: {
  gameName: string;
  outcome: GameOutcome;
  amount: string;
  recordedAt?: string | Date;
  status?: PaymentStatus;
  statusMessage?: string;
  txHash?: string | null;
}) {
  const { gameName, outcome, amount, recordedAt, status, statusMessage, txHash } = params;
  const stats = {
    ...DEFAULT_STATS,
    ...(await storage.getItem<UserStats>(USER_STATS_KEY) ?? {}),
  };

  const history = [...(await storage.getItem<PersistedGameHistoryEntry[]>(GAME_HISTORY_KEY) ?? [])];

  const entry: GameHistoryEntry = {
    id: generateId(),
    gameName: gameName || 'Unknown Game',
    outcome,
    amountDisplay: formatAmountDisplay(amount, outcome),
    playedAt: typeof recordedAt === 'string' ? recordedAt : (recordedAt ?? new Date()).toISOString(),
    status: status ?? 'completed',
    statusMessage,
    txHash: txHash ?? null,
  };

  const nextHistory = [entry, ...history];
  if (nextHistory.length > HISTORY_LIMIT) {
    nextHistory.length = HISTORY_LIMIT;
  }

  const nextStats: UserStats = {
    totalGames: stats.totalGames + 1,
    wins: stats.wins + (outcome === 'win' ? 1 : 0),
    losses: stats.losses + (outcome === 'loss' ? 1 : 0),
  };

  await Promise.all([
    storage.setItem(GAME_HISTORY_KEY, nextHistory),
    storage.setItem(USER_STATS_KEY, nextStats),
  ]);

  return entry;
}

export async function getUserStats(): Promise<UserStats> {
  const stored = await storage.getItem<UserStats>(USER_STATS_KEY);
  return {
    totalGames: stored?.totalGames ?? DEFAULT_STATS.totalGames,
    wins: stored?.wins ?? DEFAULT_STATS.wins,
    losses: stored?.losses ?? DEFAULT_STATS.losses,
  };
}

export async function getGameHistory(limit?: number): Promise<GameHistoryEntry[]> {
  const history = await storage.getItem<PersistedGameHistoryEntry[]>(GAME_HISTORY_KEY);
  if (!history || history.length === 0) {
    return [];
  }
  const normalized = history.map((entry) => withDefaults(entry));
  if (!limit || limit >= normalized.length) {
    return normalized;
  }
  return normalized.slice(0, limit);
}

type UpdatableHistoryFields = Pick<GameHistoryEntry, 'status' | 'statusMessage' | 'txHash' | 'amountDisplay' | 'playedAt'>;

export async function updateGameHistoryEntry(id: string, updates: Partial<UpdatableHistoryFields>): Promise<GameHistoryEntry | null> {
  const history = await storage.getItem<PersistedGameHistoryEntry[]>(GAME_HISTORY_KEY);
  if (!history || history.length === 0) {
    return null;
  }

  const idx = history.findIndex((entry) => entry.id === id);
  if (idx === -1) {
    return null;
  }

  const target = withDefaults(history[idx]);
  const next = { ...target, ...updates } as GameHistoryEntry;
  const nextHistory: PersistedGameHistoryEntry[] = [...history];
  nextHistory[idx] = next;
  await storage.setItem(GAME_HISTORY_KEY, nextHistory);
  return next;
}
