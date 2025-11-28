import { MASTER_WALLET_ADDRESS } from '@/constants/wallet';
import { GameHistoryEntry, recordGameResult, updateGameHistoryEntry } from './GameHistory';
import { rewardPlayer } from './WalletTransfer';

const PENDING_MESSAGE = 'Awaiting master approval';
const SUCCESS_MESSAGE = 'Reward paid successfully';

export type RewardWorkflowParams = {
    gameName: string;
    rewardAmount: string;
    playerWalletAddress: string;
    walletClient?: unknown;
};

export type RewardWorkflowResult = {
    entry: GameHistoryEntry;
    txHash: string | null;
};

const fallbackErrorMessage = (err: unknown) => {
    if (err instanceof Error && err.message.trim().length > 0) {
        return err.message;
    }
    if (typeof err === 'string' && err.trim().length > 0) {
        return err.trim();
    }
    return 'Reward could not be completed. Please try again.';
};

const deriveRewardAmount = (amountDisplay: string) => {
    if (!amountDisplay) {
        return '0';
    }
    return amountDisplay.replace(/^[+]/, '').trim();
};

export async function rewardPlayerForGameWin(params: RewardWorkflowParams): Promise<RewardWorkflowResult> {
    const { gameName, rewardAmount, playerWalletAddress, walletClient } = params;
    if (!playerWalletAddress) {
        throw new Error('Connect your wallet before requesting a reward.');
    }

    const pendingEntry = await recordGameResult({
        gameName,
        outcome: 'win',
        amount: rewardAmount,
        status: 'pending',
        statusMessage: PENDING_MESSAGE,
    });

    try {
        const transfer = await rewardPlayer({
            masterWalletAddress: MASTER_WALLET_ADDRESS,
            playerWalletAddress,
            rewardAmount,
            walletClient,
        });

        const updated = await updateGameHistoryEntry(pendingEntry.id, {
            status: 'completed',
            statusMessage: SUCCESS_MESSAGE,
            txHash: transfer.txHash ?? null,
        });

        return {
            entry: updated ?? {
                ...pendingEntry,
                status: 'completed',
                statusMessage: SUCCESS_MESSAGE,
                txHash: transfer.txHash ?? null,
            },
            txHash: transfer.txHash ?? null,
        };
    } catch (err) {
        const message = fallbackErrorMessage(err);
        await updateGameHistoryEntry(pendingEntry.id, {
            status: 'pending',
            statusMessage: message,
        });
        throw err instanceof Error ? err : new Error(message);
    }
}

export async function retryPendingReward(params: {
    entry: GameHistoryEntry;
    playerWalletAddress: string;
    walletClient?: unknown;
}): Promise<RewardWorkflowResult> {
    const { entry, playerWalletAddress, walletClient } = params;
    if (!playerWalletAddress) {
        throw new Error('Connect your wallet before requesting a reward.');
    }
    if (entry.status !== 'pending') {
        throw new Error('Only pending rewards can be resent.');
    }

    const rewardAmount = deriveRewardAmount(entry.amountDisplay);

    try {
        const transfer = await rewardPlayer({
            masterWalletAddress: MASTER_WALLET_ADDRESS,
            playerWalletAddress,
            rewardAmount,
            walletClient,
        });

        const updated = await updateGameHistoryEntry(entry.id, {
            status: 'completed',
            statusMessage: SUCCESS_MESSAGE,
            txHash: transfer.txHash ?? null,
        });

        return {
            entry: updated ?? {
                ...entry,
                status: 'completed',
                statusMessage: SUCCESS_MESSAGE,
                txHash: transfer.txHash ?? null,
            },
            txHash: transfer.txHash ?? null,
        };
    } catch (err) {
        const message = fallbackErrorMessage(err);
        await updateGameHistoryEntry(entry.id, {
            status: 'pending',
            statusMessage: message,
        });
        throw err instanceof Error ? err : new Error(message);
    }
}
