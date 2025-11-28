import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, Text, Button, DevSettings, Alert } from 'react-native';
import { storage } from '@/utils/StorageUtil';
import { WalletInfoView } from './WalletInfoView';

const STORAGE_KEY = 'APP_NETWORK';

export function NetworkSwitcher() {
  const [enabled, setEnabled] = useState(false); // true = mainnet, false = testnet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const val = await storage.getItem<string>(STORAGE_KEY);
        if (val === 'mainnet') setEnabled(true);
        else setEnabled(false);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async () => {
    const newVal = !enabled;
    setEnabled(newVal);
    try {
      await storage.setItem(STORAGE_KEY, newVal ? 'mainnet' : 'testnet');
      Alert.alert('Network changed', 'Network preference saved. Please reload the app to apply the change.');
      // Try to reload in dev
      if (__DEV__ && DevSettings && DevSettings.reload) {
        DevSettings.reload();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save network preference.');
    }
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Use Mainnet</Text>
        <Switch onValueChange={toggle} value={enabled} />
      <WalletInfoView/>

      </View>
      <Text style={styles.note}>
        {enabled ? 'Mainnet selected. Wallets will default to Celo Mainnet.' : 'Testnet selected. Wallets will default to Celo Alfajores.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
    marginRight: 8,
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
});

export default NetworkSwitcher;
