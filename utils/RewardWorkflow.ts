import { GameHistoryEntry, recordGameResult, updateGameHistoryEntry } from './GameHistory';

const MANUAL_PAYOUT_MESSAGE = 'Awaiting manual payout';

export type RewardWorkflowParams = {
    gameName: string;
    rewardAmount: string;
    playerWalletAddress: string;
    walletClient?: unknown;
    gameId?: string | number | null;
};

export type RewardWorkflowResult = {
    entry: GameHistoryEntry;
    txHash: string | null;
};

export async function rewardPlayerForGameWin(params: RewardWorkflowParams): Promise<RewardWorkflowResult> {
    const { gameName, rewardAmount, playerWalletAddress, gameId } = params;
    const pendingEntry = await recordGameResult({
        gameName,
        outcome: 'win',
        amount: rewardAmount,
        status: 'pending',
        statusMessage: MANUAL_PAYOUT_MESSAGE,
        playerAddress: playerWalletAddress ?? null,
        gameId: gameId ?? null,
        txHash: null,
    });

    return {
        entry: pendingEntry,
        txHash: null,
    };
}

export async function retryPendingReward(params: {
    entry: GameHistoryEntry;
    playerWalletAddress: string;
    walletClient?: unknown;
}): Promise<RewardWorkflowResult> {
    const { entry } = params;
    if (entry.status !== 'pending') {
        throw new Error('Only pending rewards can be refreshed.');
    }

    const updated = await updateGameHistoryEntry(entry.id, {
        status: 'pending',
        statusMessage: MANUAL_PAYOUT_MESSAGE,
        txHash: null,
    });

    return {
        entry: updated ?? {
            ...entry,
            status: 'pending',
            statusMessage: MANUAL_PAYOUT_MESSAGE,
            txHash: null,
        },
        txHash: null,
    };
}
