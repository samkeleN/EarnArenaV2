import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppKitButton } from '@reown/appkit-react-native';
import { useAccount } from 'wagmi';
import { useRouter } from 'expo-router';
import globalStyles from '../styles/global.styles';

export default function Landing() {
  const { isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (isConnected) {
      // Redirect connected users to the auth entry flow
      router.replace('/auth/login')
    }
  }, [isConnected, router]);

  return (
    <>
      {!isConnected && (
        <View style={[globalStyles.appContainer, styles.container]}>
          <View style={styles.inner}>
            <Text style={styles.title}>Welcome to EarnArena</Text>
            <Text style={styles.subtitle}>Connect your wallet to continue to EarnArena</Text>
            <View style={styles.connectRow}>
              <AppKitButton connectStyle={styles.connectButton} label="Connect Wallet" />
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center' },
  inner: { width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  connectRow: { width: '100%', alignItems: 'center' },
  connectButton: { width: 220, borderRadius: 999 },
});
