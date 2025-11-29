import React, { useState } from 'react';
import { Button, Alert } from 'react-native';
import { useWalletClient } from 'wagmi';
import { storage } from '@/utils/StorageUtil';
import { celo, celoAlfajores, celoSepolia } from '../src/chains/celoChains';

function toHexChainId(id: number) {
  return '0x' + id.toString(16);
}

export default function AddNetworkButton() {
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    setBusy(true);
    try {
      const stored = await storage.getItem<string>('APP_NETWORK');
      const network = stored ?? (__DEV__ ? 'testnet' : 'mainnet');
      const chain = network === 'mainnet' ? celo : celoSepolia;

      const chainIdHex = toHexChainId(chain.id as number);
      const rpcUrl = (chain.rpcUrls as any)?.default?.http?.[0] ?? (chain.rpcUrls as any)?.public?.http?.[0];

      const params = [{
        chainId: chainIdHex,
        chainName: chain.name,
        nativeCurrency: chain.nativeCurrency,
        rpcUrls: [rpcUrl],
        blockExplorerUrls: [chain.blockExplorers?.default?.url ?? ''],
      }];

      // Try wagmi wallet client request first, fall back to global.ethereum
      if (walletClient && typeof (walletClient as any).request === 'function') {
        await (walletClient as any).request({ method: 'wallet_addEthereumChain', params });
        Alert.alert('Success', `${chain.name} requested to be added to wallet.`);
      } else if ((global as any).ethereum && (global as any).ethereum.request) {
        await (global as any).ethereum.request({ method: 'wallet_addEthereumChain', params });
        Alert.alert('Success', `${chain.name} requested to be added to wallet.`);
      } else {
        Alert.alert('No wallet', 'No wallet provider available to add the network.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return <Button title={busy ? 'Adding…' : 'Add Celo Network to Wallet'} onPress={handleAdd} disabled={busy} />;
}
