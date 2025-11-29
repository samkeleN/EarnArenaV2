import React, { useState } from 'react';
import { Button, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useAccount, useWalletClient } from 'wagmi';
import { sendToMasterWallet } from '@/utils/WalletTransfer';

const DEFAULT_AMOUNT = '0';

export default function SendCeloButton() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!address) {
      Alert.alert('Not connected', 'Please connect your wallet first.');
      return;
    }

    setBusy(true);
    try {
      const { txHash } = await sendToMasterWallet({ amount: DEFAULT_AMOUNT, from: address, walletClient });

      if (txHash) {
        Alert.alert('Transaction sent', `Tx hash: ${txHash}`, [
          {
            text: 'Copy',
            onPress: async () => {
              await Clipboard.setStringAsync(txHash as string);
            },
          },
          { text: 'OK' },
        ]);
      } else {
        // Some providers don't return a hash immediately. Show a submitted message.
        Alert.alert('Transaction submitted', 'The transaction was submitted. It may take a few seconds to appear in your wallet.');
      }
    } catch (e: any) {
      Alert.alert('Error sending', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  return <Button title={busy ? 'Sending…' : `Send ${DEFAULT_AMOUNT} CELO`} onPress={handleSend} disabled={busy} />;
}
