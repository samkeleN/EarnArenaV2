import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import type { Chain } from 'viem';

export default function AutoNetworkManager({ chain }: { chain: Chain }) {
  const { isConnected } = useAccount();
  const activeChainId = useChainId();

  if (!isConnected) return null;

  const isOnTargetChain = activeChainId === chain.id;

  if (!isOnTargetChain) {
    console.warn('Connected wallet is on the wrong network. Expected', chain.id, 'but found', activeChainId);
  }

  return null;
}
