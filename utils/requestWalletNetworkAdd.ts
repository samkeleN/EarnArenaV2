import type { Chain } from 'wagmi/chains';

const toHexChainId = (id: number) => `0x${id.toString(16)}`;

type WalletRequester = any;

const resolveRequester = (walletClient?: WalletRequester) => {
    if (walletClient && typeof (walletClient as any).request === 'function') {
        return (walletClient as any).request.bind(walletClient);
    }
    const ethereum = (global as any)?.ethereum;
    if (ethereum && typeof ethereum.request === 'function') {
        return ethereum.request.bind(ethereum);
    }
    return null;
};

const parseChainId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        try {
            if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
                return Number.parseInt(trimmed, 16);
            }
            const parsed = Number(trimmed);
            return Number.isNaN(parsed) ? null : parsed;
        } catch (_err) {
            return null;
        }
    }
    return null;
};

const readChainIdFromWalletClient = (walletClient?: WalletRequester): number | null => {
    if (!walletClient) return null;
    const client = walletClient as any;
    const direct = parseChainId(client?.chain?.id ?? client?.chainId);
    if (direct !== null) return direct;
    const transportChain = parseChainId(client?.transport?.chain?.id);
    if (transportChain !== null) return transportChain;
    return null;
};

export async function getActiveWalletChainId(params: { walletClient?: WalletRequester }): Promise<number | null> {
    const { walletClient } = params;
    const requester = resolveRequester(walletClient);
    if (requester) {
        try {
            const response = await requester({ method: 'eth_chainId', params: [] });
            const parsed = parseChainId(response);
            if (parsed !== null) {
                return parsed;
            }
        } catch (err) {
            console.warn('Failed to read wallet chain id via eth_chainId', err);
        }
    }

    return readChainIdFromWalletClient(walletClient);
}

export async function requestWalletAddEthereumChain(params: {
    chain: Chain;
    walletClient?: WalletRequester;
}): Promise<void> {
    const { chain, walletClient } = params;
    const requester = resolveRequester(walletClient);

    if (!requester) {
        throw new Error('No wallet provider available to add the network.');
    }

    const rpcUrl =
        (chain.rpcUrls as any)?.default?.http?.[0] ??
        (chain.rpcUrls as any)?.public?.http?.[0] ??
        '';

    const payload = [
        {
            chainId: toHexChainId(chain.id as number),
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [chain.blockExplorers?.default?.url ?? ''],
        },
    ];

    await requester({ method: 'wallet_addEthereumChain', params: payload });
}

export async function requestWalletSwitchEthereumChain(params: {
    chain: Chain;
    walletClient?: WalletRequester;
}): Promise<void> {
    const { chain, walletClient } = params;
    const requester = resolveRequester(walletClient);

    if (!requester) {
        throw new Error('No wallet provider available to switch the network.');
    }

    await requester({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: toHexChainId(chain.id as number) }],
    });
}
