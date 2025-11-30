import { useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { celo, celoSepolia } from '../src/chains/celoChains';
import { requestWalletAddEthereumChain } from '@/utils/requestWalletNetworkAdd';

type NetworkPreference = 'mainnet' | 'testnet';

export default function AutoAddNetwork({ network }: { network: NetworkPreference }) {
  const { data: walletClient } = useWalletClient();
  const { isConnected } = useAccount();
  const lastNetworkRef = useRef<NetworkPreference | null>(null);
  const hasProvider = () => Boolean(walletClient || (global as any)?.ethereum);

  useEffect(() => {
    if (!isConnected) {
      lastNetworkRef.current = null;
    }
  }, [isConnected]);
  useEffect(() => {
    if (!isConnected) {
      return;
    }
    if (!hasProvider()) {
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
  }, [network, walletClient, isConnected]);

  return null;
}
