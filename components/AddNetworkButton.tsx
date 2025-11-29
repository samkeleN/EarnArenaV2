import React, { useEffect, useRef, useState } from 'react';
import { Button, Alert } from 'react-native';
import { useWalletClient } from 'wagmi';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/utils/FirebaseConfig';
import { celo, celoSepolia } from '../src/chains/celoChains';

function toHexChainId(id: number) {
  return '0x' + id.toString(16);
}

export default function AddNetworkButton() {
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const fallbackNetwork = __DEV__ ? 'testnet' : 'mainnet';
  const [preferredNetwork, setPreferredNetwork] = useState<string>(fallbackNetwork);
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const lastNetworkRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!userId) {
      setPreferredNetwork(fallbackNetwork);
      lastNetworkRef.current = null;
      return;
    }
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const preferred = snapshot.exists() ? (snapshot.data()?.preferredNetwork as string | undefined) : undefined;
        const next = preferred === 'mainnet' ? 'mainnet' : preferred === 'testnet' ? 'testnet' : fallbackNetwork;
        setPreferredNetwork(next);
        if (lastNetworkRef.current && lastNetworkRef.current !== next) {
          Alert.alert('Preferred network updated', `Preference changed to ${next === 'mainnet' ? 'Celo Mainnet' : 'Celo Testnet'}.`);
        }
        lastNetworkRef.current = next;
      },
      (err) => {
        console.warn('Failed to subscribe to preferred network', err);
      }
    );
    return unsubscribe;
  }, [userId, fallbackNetwork]);

  const handleAdd = async () => {
    setBusy(true);
    try {
      const network = preferredNetwork ?? fallbackNetwork;
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
