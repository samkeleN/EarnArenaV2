import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, Text, DevSettings, Alert, ActivityIndicator } from 'react-native';
import { WalletInfoView } from './WalletInfoView';
import { auth, db } from '@/utils/FirebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export function NetworkSwitcher() {
  const [enabled, setEnabled] = useState(false); // true = mainnet, false = testnet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setEnabled(false);
          return;
        }
        const ref = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(ref);
        const preferredNetwork = snap.exists() ? (snap.data()?.preferredNetwork as string | undefined) : undefined;
        setEnabled(preferredNetwork === 'mainnet');
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Network', 'Please sign in before changing network preferences.');
      return;
    }
    const newVal = !enabled;
    setEnabled(newVal);
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), { preferredNetwork: newVal ? 'mainnet' : 'testnet', updatedAt: new Date().toISOString() }, { merge: true });
      Alert.alert('Network changed', 'Network preference saved. Please reload the app to apply the change.');
      // Try to reload in dev
      if (__DEV__ && DevSettings && DevSettings.reload) {
        DevSettings.reload();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save network preference.');
      setEnabled(!newVal);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center' }]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Use Mainnet</Text>
        <Switch onValueChange={toggle} value={enabled} disabled={saving} />
        {saving && <ActivityIndicator size="small" style={{ marginLeft: 8 }} />}
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
