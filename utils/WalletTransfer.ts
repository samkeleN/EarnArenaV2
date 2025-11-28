import { MASTER_WALLET_ADDRESS } from '@/constants/wallet';

export type MasterWalletTransferResult = {
  txHash: string | null;
  raw: unknown;
};

type WalletRequester = {
  request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
};

export function toHexWei(amountDecimal: string): string {
  const normalized = amountDecimal.trim();
  if (normalized.length === 0) {
    return '0x0';
  }

  const [wholePart = '0', decimalPart = ''] = normalized.split('.');
  const whole = BigInt(wholePart || '0');

  const scale = 18;
  const cleanedDecimal = decimalPart.replace(/[^0-9]/g, '');
  const paddedDecimal = (cleanedDecimal + '0'.repeat(scale)).slice(0, scale);
  const fraction = BigInt(paddedDecimal || '0');

  const multiplier = BigInt(10) ** BigInt(scale);
  const wei = whole * multiplier + fraction;
  return '0x' + wei.toString(16);
}

export function extractDecimalAmount(amount: string): string {
  if (!amount) return '0';
  const normalized = amount.replace(/,/g, '.');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return '0';
  return match[0];
}

function normalizeTxHash(result: unknown): string | null {
  if (!result) return null;
  if (typeof result === 'string') {
    return result;
  }
  if (typeof result === 'object') {
    const candidates = ['hash', 'transactionHash', 'txHash', 'result'];
    for (const key of candidates) {
      const value = (result as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }
  return null;
}

function isUserRejectedError(err: unknown): boolean {
  if (!err) return false;
  const code = typeof (err as any)?.code === 'number' ? (err as any).code : undefined;
  if (code === 4001 || code === 5000) {
    return true;
  }
  if (typeof code === 'string' && code.toLowerCase() === 'action_rejected') {
    return true;
  }
  const message = typeof (err as any)?.message === 'string' ? (err as any).message.toLowerCase() : '';
  return message.includes('user rejected') || message.includes('user denied') || message.includes('rejected the request');
}

function getWalletRequester(walletClient?: unknown): WalletRequester {
  if (walletClient && typeof (walletClient as WalletRequester).request === 'function') {
    return walletClient as WalletRequester;
  }
  if ((global as any).ethereum && typeof (global as any).ethereum.request === 'function') {
    return (global as any).ethereum as WalletRequester;
  }
  throw Object.assign(new Error('No wallet provider available'), { code: 'NO_WALLET_PROVIDER' });
}

async function sendEthTransaction(tx: Record<string, unknown>, walletClient?: unknown) {
  const requester = getWalletRequester(walletClient);
  return requester.request({
    method: 'eth_sendTransaction',
    params: [tx],
  });
}

function wrapWalletError(err: unknown, rejectionMessage = 'Transaction was rejected by the wallet owner.'): Error {
  if (isUserRejectedError(err)) {
    return Object.assign(new Error(rejectionMessage), { code: 'USER_REJECTED' });
  }
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown wallet error';
  return Object.assign(new Error(message), { code: (err as any)?.code ?? 'UNKNOWN' });
}

export async function sendToMasterWallet(params: {
  amount: string;
  from: string;
  walletClient?: unknown;
}): Promise<MasterWalletTransferResult> {
  const { amount, from, walletClient } = params;
  const decimalAmount = extractDecimalAmount(amount);
  if (!decimalAmount || Number(decimalAmount) === 0) {
    return { txHash: null, raw: null };
  }

  const value = toHexWei(decimalAmount);
  const tx = {
    from,
    to: MASTER_WALLET_ADDRESS,
    value,
  } as Record<string, unknown>;

  try {
    const result = await sendEthTransaction(tx, walletClient);
    return {
      txHash: normalizeTxHash(result),
      raw: result,
    };
  } catch (err) {
    throw wrapWalletError(err, 'Entry fee transaction was rejected by the wallet owner.');
  }
}

export async function rewardPlayer(params: {
  masterWalletAddress: string;
  playerWalletAddress: string;
  rewardAmount: string;
  walletClient?: unknown;
}): Promise<MasterWalletTransferResult> {
  const { masterWalletAddress, playerWalletAddress, rewardAmount, walletClient } = params;
  if (!masterWalletAddress || !playerWalletAddress) {
    throw new Error('Both master and player wallet addresses are required to reward a player.');
  }

  const decimalAmount = extractDecimalAmount(rewardAmount);
  if (!decimalAmount || Number(decimalAmount) <= 0) {
    throw new Error('Reward amount must be greater than zero.');
  }

  const value = toHexWei(decimalAmount);
  const tx = {
    from: masterWalletAddress,
    to: playerWalletAddress,
    value,
  } as Record<string, unknown>;

  try {
    const result = await sendEthTransaction(tx, walletClient);
    return {
      txHash: normalizeTxHash(result),
      raw: result,
    };
  } catch (err) {
    throw wrapWalletError(err, 'Reward transaction was rejected by the wallet owner.');
  }
}
