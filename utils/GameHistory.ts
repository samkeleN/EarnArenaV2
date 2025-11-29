import { auth, db } from '@/utils/FirebaseConfig';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as limitQuery,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

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
const HISTORY_COLLECTION = 'gameHistory';

const removeUndefined = <T extends Record<string, any>>(value: T): T => {
  Object.keys(value).forEach((key) => {
    if (value[key] === undefined) {
      delete value[key];
    }
  });
  return value;
};

const getCurrentUserId = () => auth.currentUser?.uid ?? null;

const requireUserId = () => {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error('User must be authenticated to access game history');
  }
  return uid;
};

const getUserDocRef = (uid: string) => doc(db, 'users', uid);
const getHistoryCollectionRef = (uid: string) => collection(getUserDocRef(uid), HISTORY_COLLECTION);

const readStatsSnapshot = async (uid: string): Promise<UserStats> => {
  try {
    const snapshot = await getDoc(getUserDocRef(uid));
    const stats = snapshot.exists() ? (snapshot.data()?.stats as Partial<UserStats> | undefined) : undefined;
    return {
      totalGames: stats?.totalGames ?? DEFAULT_STATS.totalGames,
      wins: stats?.wins ?? DEFAULT_STATS.wins,
      losses: stats?.losses ?? DEFAULT_STATS.losses,
    };
  } catch (err) {
    console.warn('Failed to fetch stats snapshot', err);
    return DEFAULT_STATS;
  }
};

const enforceHistoryLimit = async (uid: string) => {
  try {
    const historyRef = getHistoryCollectionRef(uid);
    const snapshot = await getDocs(query(historyRef, orderBy('playedAt', 'desc')));
    if (snapshot.size <= HISTORY_LIMIT) {
      return;
    }
    const overflow = snapshot.docs.slice(HISTORY_LIMIT);
    await Promise.all(overflow.map(entry => deleteDoc(entry.ref)));
  } catch (err) {
    console.warn('Failed to prune history entries', err);
  }
};

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
  const uid = requireUserId();
  const stats = await readStatsSnapshot(uid);

  const entry = removeUndefined({
    id: generateId(),
    gameName: gameName || 'Unknown Game',
    outcome,
    amountDisplay: formatAmountDisplay(amount, outcome),
    playedAt: typeof recordedAt === 'string' ? recordedAt : (recordedAt ?? new Date()).toISOString(),
    status: status ?? 'completed',
    statusMessage: typeof statusMessage === 'string' ? statusMessage : undefined,
    txHash: typeof txHash === 'string' ? txHash : null,
  }) as GameHistoryEntry;

  const nextStats: UserStats = {
    totalGames: stats.totalGames + 1,
    wins: stats.wins + (outcome === 'win' ? 1 : 0),
    losses: stats.losses + (outcome === 'loss' ? 1 : 0),
  };

  const userRef = getUserDocRef(uid);
  const historyRef = doc(getHistoryCollectionRef(uid), entry.id);

  await Promise.all([
    setDoc(historyRef, entry),
    setDoc(userRef, { stats: nextStats }, { merge: true }),
  ]);

  enforceHistoryLimit(uid).catch(err => console.warn('History limit enforcement failed', err));

  return entry;
}

export async function getUserStats(): Promise<UserStats> {
  const uid = getCurrentUserId();
  if (!uid) {
    return DEFAULT_STATS;
  }
  return await readStatsSnapshot(uid);
}

export async function getGameHistory(limit?: number): Promise<GameHistoryEntry[]> {
  const uid = getCurrentUserId();
  if (!uid) {
    return [];
  }
  try {
    const baseQuery = query(
      getHistoryCollectionRef(uid),
      orderBy('playedAt', 'desc'),
      ...(limit && limit > 0 ? [limitQuery(limit)] : [])
    );

    const snapshot = await getDocs(baseQuery);
    return snapshot.docs.map((docSnap) => withDefaults(docSnap.data() as PersistedGameHistoryEntry));
  } catch (err) {
    console.warn('Failed to load game history from Firestore', err);
    return [];
  }
}

type UpdatableHistoryFields = Pick<GameHistoryEntry, 'status' | 'statusMessage' | 'txHash' | 'amountDisplay' | 'playedAt'>;

export async function updateGameHistoryEntry(id: string, updates: Partial<UpdatableHistoryFields>): Promise<GameHistoryEntry | null> {
  const uid = getCurrentUserId();
  if (!uid) {
    return null;
  }
  try {
    const entryRef = doc(getHistoryCollectionRef(uid), id);
    const snapshot = await getDoc(entryRef);
    if (!snapshot.exists()) {
      return null;
    }
    const target = withDefaults(snapshot.data() as PersistedGameHistoryEntry);
    const next = removeUndefined({
      ...target,
      ...updates,
      txHash: updates.txHash === undefined ? target.txHash ?? null : updates.txHash,
      statusMessage: updates.statusMessage === undefined ? target.statusMessage : updates.statusMessage,
    }) as GameHistoryEntry;
    await setDoc(entryRef, next, { merge: true });
    return next;
  } catch (err) {
    console.warn('Failed to update game history entry', err);
    return null;
  }
}
