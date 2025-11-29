import type { Chain } from 'wagmi/chains';

const toHexChainId = (id: number) => `0x${id.toString(16)}`;

export async function requestWalletAddEthereumChain(params: {
    chain: Chain;
    walletClient?: { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null;
}): Promise<void> {
    const { chain, walletClient } = params;
    const requester =
        walletClient && typeof walletClient.request === 'function'
            ? walletClient.request.bind(walletClient)
            : (global as any)?.ethereum?.request?.bind((global as any).ethereum);

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
