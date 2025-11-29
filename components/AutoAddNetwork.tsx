import { useEffect, useRef } from 'react';
import { useWalletClient } from 'wagmi';
import { celo, celoSepolia } from '../src/chains/celoChains';
import { requestWalletAddEthereumChain } from '@/utils/requestWalletNetworkAdd';

type NetworkPreference = 'mainnet' | 'testnet';

export default function AutoAddNetwork({ network }: { network: NetworkPreference }) {
  const { data: walletClient } = useWalletClient();
  const lastNetworkRef = useRef<NetworkPreference | null>(null);

  useEffect(() => {
    if (!walletClient && !(global as any)?.ethereum) {
      return;
    }
    if (lastNetworkRef.current === network) {
      return;
    }
    lastNetworkRef.current = network;
    const chain = network === 'mainnet' ? celo : celoSepolia;
    requestWalletAddEthereumChain({ chain, walletClient: walletClient as any }).catch((err) => {
      console.warn('AutoAddNetwork: failed to add chain', err);
    });
  }, [network, walletClient]);

  return null;
}
